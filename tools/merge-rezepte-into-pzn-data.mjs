/**
 * Merge rezepte-pzn.json into the static PZN_TABLE in pzn-data.ts.
 * Only adds PZNs that aren't already in the table.
 *
 * Parses "Indapamid AL 1.5mg 100 Retardtbl. N3" into:
 *   { b: "Indapamid AL", i: "Indapamid AL", s: "1.5mg", f: "" }
 *
 * Usage: node tools/merge-rezepte-into-pzn-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REZEPTE_FILE = path.join(__dirname, 'rezepte-pzn.json');
const PZN_DATA_FILE = path.join(__dirname, '..', 'apps', 'uc1-mediorder', 'src', 'generated', 'pzn-data.ts');

// Read existing PZN_TABLE to find which PZNs already exist
const tsContent = fs.readFileSync(PZN_DATA_FILE, 'utf-8');

// Extract all existing PZNs
const existingPzns = new Set();
const pznPattern = /"(\d{8})":\{/g;
let m;
while ((m = pznPattern.exec(tsContent)) !== null) {
  existingPzns.add(m[1]);
}
console.log(`Existing PZN_TABLE has ${existingPzns.size} entries`);

// Read rezepte data
const rezepte = JSON.parse(fs.readFileSync(REZEPTE_FILE, 'utf-8'));
const rezepteCount = Object.keys(rezepte).length;
console.log(`Rezepte file has ${rezepteCount} entries`);

// Parse a prescription name like "Indapamid AL 1.5mg 100 Retardtbl. N3"
// into { brandName, strength, form }
const strengthRe = /(\d+[.,]?\d*\s*(?:mg|g|ml|µg|mcg|ug|ie|mmol|Mikrogramm|E\/ml|Einheiten\/ml)(?:\s*\/\s*\d+[.,]?\d*\s*(?:mg|g|ml))?)/i;
const packSizeRe = /\s+\d+(?:x\d+)?\s*(?:St|Stk|Stück|Tbl|Filmtbl|Retardtbl|Kaps|Hartkaps|Weichkaps|Brausetbl|Schmelztbl|Dragees|Amp|Hub|Pens|ml|g|Lsg|Tropf|Pflaster|Kps|R\.tbl|msr\.\s*(?:Tbl|Hartkaps)|überzogene\s*Tbl|mag\.res\.\s*Hartkaps)\b\.?\s*/i;
const normSizeRe = /\s+N[123]\s*$/;

function parsePrescriptionName(name) {
  // Remove trailing N1/N2/N3
  let cleaned = name.replace(normSizeRe, '').trim();

  // Remove pack size (e.g. "100 Filmtbl.", "10x3 ml", "1x200 Hub")
  cleaned = cleaned.replace(packSizeRe, ' ').trim();

  const strengthMatch = cleaned.match(strengthRe);
  if (!strengthMatch) {
    return { b: cleaned, i: cleaned, s: '', f: '' };
  }

  const strengthIdx = cleaned.indexOf(strengthMatch[0]);
  const brandName = cleaned.slice(0, strengthIdx).trim();
  const strength = strengthMatch[1].trim();
  const afterStrength = cleaned.slice(strengthIdx + strengthMatch[0].length).trim();

  // What remains after strength could be form or more junk
  // Clean up remaining pack-size-like text
  const form = afterStrength
    .replace(/\s*\d+(?:x\d+)?\s*(?:St|Stk|ml|g|Amp|Hub|Pens)\b\.?/gi, '')
    .replace(/\s+N[123]\s*$/, '')
    .trim();

  return {
    b: brandName || cleaned,
    i: brandName || cleaned,
    s: strength,
    f: '',
  };
}

// Build new entries (only PZNs not already in table)
const newEntries = [];
let skipped = 0;
for (const [pzn, name] of Object.entries(rezepte)) {
  if (existingPzns.has(pzn)) {
    skipped++;
    continue;
  }
  const parsed = parsePrescriptionName(name);
  newEntries.push({ pzn, ...parsed });
}

console.log(`Skipped ${skipped} (already in table)`);
console.log(`Adding ${newEntries.length} new entries`);

if (newEntries.length === 0) {
  console.log('Nothing to add!');
  process.exit(0);
}

// Generate the new entries as TypeScript
const newLines = newEntries
  .sort((a, b) => a.pzn.localeCompare(b.pzn))
  .map(e => {
    const b = e.b.replace(/"/g, '\\"');
    const i = e.i.replace(/"/g, '\\"');
    const s = e.s.replace(/"/g, '\\"');
    const f = e.f.replace(/"/g, '\\"');
    return `"${e.pzn}":{b:"${b}",i:"${i}",s:"${s}",f:"${f}"},`;
  })
  .join('\n');

// Insert before the closing };
const insertPoint = tsContent.lastIndexOf('};');
const newContent =
  tsContent.slice(0, insertPoint) +
  `// --- Merged from Rezepte_list.txt (${new Date().toISOString().split('T')[0]}) ---\n` +
  newLines + '\n' +
  tsContent.slice(insertPoint);

fs.writeFileSync(PZN_DATA_FILE, newContent);
console.log(`\nUpdated ${PZN_DATA_FILE}`);
console.log(`New total: ${existingPzns.size + newEntries.length} entries`);

// Show some samples
console.log('\nSample new entries:');
for (const e of newEntries.slice(0, 8)) {
  console.log(`  ${e.pzn} → b:"${e.b}" i:"${e.i}" s:"${e.s}"`);
}
