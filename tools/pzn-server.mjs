/**
 * PZN Lookup Server
 *
 * A small local server that resolves PZN numbers to medication names
 * by fetching from medizinfuchs.de. Results are cached in a local JSON file.
 *
 * Usage: node tools/pzn-server.mjs
 * API:   GET http://localhost:3456/api/pzn/05046998
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, 'pzn-cache.json');
const PORT = 3456;

// Load existing cache
let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  console.log(`Loaded ${Object.keys(cache).length} cached PZNs from ${CACHE_FILE}`);
} catch {
  console.log('No cache file found, starting fresh.');
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

/**
 * Look up a PZN via medizinfuchs.de.
 *
 * URL pattern: https://www.medizinfuchs.de/preisvergleich/pzn-{PZN8}.html
 * Page title format: "NAME STRENGTH FORM (PACKSIZE) ..."
 *
 * Examples:
 *   "FORXIGA 10MG FILMTABLETTEN (98 St) Apotheken Preise"
 *   "Indapamid AL 1.5mg Retardtabletten (100 St) kaufen"
 *   "Pantoprazol-1A Pharma 40mg magensaftres.Tabletten (60 St)"
 */
async function lookupPzn(pzn) {
  const pzn8 = pzn.padStart(8, '0');
  const url = `https://www.medizinfuchs.de/preisvergleich/pzn-${pzn8}.html`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    console.error(`  medizinfuchs returned ${res.status}`);
    return null;
  }

  const html = await res.text();

  // Extract page title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) {
    console.error(`  No <title> found in response`);
    return null;
  }

  const rawTitle = titleMatch[1].trim();
  // Remove trailing fluff: "kaufen", "Apotheken Preise", etc.
  const title = rawTitle
    .replace(/\s+(kaufen|Apotheken Preise|Preisvergleich|online bestellen).*$/i, '')
    .trim();

  if (!title || title.toLowerCase().includes('medizinfuchs') || title.toLowerCase().includes('nicht gefunden')) {
    return null;
  }

  return parseMedTitle(title);
}

/**
 * Parse a medizinfuchs page title into medication info.
 *
 * Consistent format: "NAME STRENGTH FORM (PACKSIZE)"
 * Examples:
 *   "FORXIGA 10MG FILMTABLETTEN (98 St)"
 *   "Indapamid AL 1.5mg Retardtabletten (100 St)"
 *   "Pantoprazol-1A Pharma 40mg magensaftres.Tabletten (60 St)"
 */
function parseMedTitle(title) {
  // Remove pack size: "(98 St)", "(100 St)"
  let cleaned = title.replace(/\s*\(\d+\s*(St|Stk|Stück|ml|g|Amp)\)/gi, '').trim();

  // Strength pattern: "10mg", "1.5mg", "40mg", "1,5 mg", "500 mg/5 ml"
  const strengthPattern = /(\d+[.,]?\d*\s*(?:mg|g|ml|µg|mcg|ug|ie|mmol)(?:\s*\/\s*\d+[.,]?\d*\s*(?:mg|g|ml))?)/i;

  const strengthMatch = cleaned.match(strengthPattern);
  if (!strengthMatch) {
    // No strength — use whole cleaned title as brand name
    if (cleaned.length > 2) {
      return { brandName: cleaned, activeIngredients: [] };
    }
    return null;
  }

  const strengthIdx = cleaned.indexOf(strengthMatch[0]);
  const brandName = cleaned.slice(0, strengthIdx).trim();
  const strength = strengthMatch[1].trim();
  const form = cleaned.slice(strengthIdx + strengthMatch[0].length).trim()
    .replace(/^\./, '') // remove leading dot (e.g. "magensaftres.Tabletten" → after split: ".Tabletten")
    .trim();

  if (!brandName || brandName.length < 2) return null;

  return {
    brandName,
    activeIngredients: [{ name: brandName, strength }],
    form: form || undefined,
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS headers for the webapp
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const match = req.url?.match(/^\/api\/pzn\/(\d{7,8})$/);
  if (!match) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Use /api/pzn/<PZN>' }));
    return;
  }

  const pzn = match[1];
  console.log(`Looking up PZN: ${pzn}`);

  // Check cache first
  if (cache[pzn]) {
    console.log(`  Cache hit: ${cache[pzn].brandName}`);
    res.writeHead(200);
    res.end(JSON.stringify(cache[pzn]));
    return;
  }

  // medizinfuchs lookup
  console.log(`  Cache miss, fetching from medizinfuchs.de...`);
  try {
    const result = await lookupPzn(pzn);

    if (result) {
      cache[pzn] = result;
      saveCache();
      console.log(`  Found: ${result.brandName}`);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } else {
      console.log(`  Not found`);
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'PZN not found' }));
    }
  } catch (e) {
    console.error(`  Error looking up PZN ${pzn}:`, e.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Lookup failed' }));
  }
});

server.listen(PORT, () => {
  console.log(`\nPZN Lookup Server running at http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/api/pzn/05046998\n`);
});
