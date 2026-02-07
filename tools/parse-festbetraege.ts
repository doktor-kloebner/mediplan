/**
 * Parse the BfArM Festbeträge PDF to generate a PZN lookup table.
 *
 * Usage: npx tsx tools/parse-festbetraege.ts [path-to-pdf]
 *
 * Requires `pdftotext` (from poppler) on PATH.
 * Output: apps/uc1-mediorder/src/generated/pzn-data.ts
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_PDF = resolve(__dirname, 'data/festbetraege-20260201.pdf');
const OUTPUT_DIR = resolve(__dirname, '../apps/uc1-mediorder/src/generated');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'pzn-data.ts');

interface PznEntry {
  /** Brand/trade name, e.g. "RAMIPRIL HEXAL 5MG" */
  brandName: string;
  /** Active ingredient name, e.g. "Ramipril" */
  ingredient: string;
  /** Wirkstoffmenge as string, e.g. "5" */
  strength: string;
  /** Darreichungsform code, e.g. "TABL", "FTBL", "RET" */
  formCode: string;
}

// --- Regex patterns ---

// Data line: ends with 7-8 digit PZN (possibly with trailing whitespace)
const PZN_LINE_RE = /(\d{7,8})\s*$/;

// Group header: "  1    Abirateron, Gruppe 1" or "  2    ACE-Hemmer, Gruppe 1"
const GROUP_HEADER_RE = /^\s+(\d)\s{2,}(.+),\s*Gruppe\s+(\d+)\s*$/;

// Page footer line
const FOOTER_RE = /^GKV-Spitzenverband/;

// Page header lines (column names)
const HEADER_RE = /^\s*Stufe\s+Festbetragsgruppe/;
const HEADER2_RE = /^\s*größe\s+form\s*$/;

// Title line
const TITLE_RE = /^Festbetragsarzneimittel nach/;


function parsePdf(pdfPath: string): Map<string, PznEntry> {
  console.error(`Extracting text from ${pdfPath}...`);
  const raw = execSync(`pdftotext -layout -nopgbrk "${pdfPath}" -`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });

  const lines = raw.split('\n');
  console.error(`Total lines: ${lines.length}`);

  const entries = new Map<string, PznEntry>();
  let currentGroup = '';
  let skippedLines = 0;

  for (const line of lines) {
    // Skip empty, header, footer, title lines
    if (!line.trim()) continue;
    if (FOOTER_RE.test(line)) continue;
    if (HEADER_RE.test(line)) continue;
    if (HEADER2_RE.test(line)) continue;
    if (TITLE_RE.test(line)) continue;
    // Skip sub-header continuation lines (just "Wirkstoff-" or "menge")
    if (/^\s+Wirkstoff-/.test(line)) continue;
    if (/^\s+Fest-\s+Diffe-/.test(line)) continue;
    if (/^\s+betrag\s+renz/.test(line)) continue;
    if (/^\s+Stand:/.test(line)) continue;

    // Check for group header
    const groupMatch = GROUP_HEADER_RE.exec(line);
    if (groupMatch) {
      currentGroup = groupMatch[2].trim();
      continue;
    }

    // Check if this is a data line (has PZN at end)
    if (!PZN_LINE_RE.test(line)) continue;

    // Parse the data line using right-anchored approach
    const parsed = parseDataLine(line, currentGroup);
    if (parsed) {
      const { pzn, entry } = parsed;
      // Keep first occurrence (dedup by PZN)
      if (!entries.has(pzn)) {
        entries.set(pzn, entry);
      }
    } else {
      skippedLines++;
    }
  }

  console.error(`Parsed ${entries.size} unique PZN entries (${skippedLines} unparseable data lines skipped)`);
  return entries;
}

function parseDataLine(
  line: string,
  currentGroup: string,
): { pzn: string; entry: PznEntry } | null {
  // Right-to-left extraction: PZN → brand name → prices → form → numerics → ingredient

  // 1. Extract PZN from end
  const pznMatch = PZN_LINE_RE.exec(line);
  if (!pznMatch) return null;
  const pzn = pznMatch[1];
  const beforePzn = line.slice(0, pznMatch.index).trimEnd();

  // 2. Find brand name: after the last price field (number with ,XX decimal followed by 2+ spaces)
  const lastPriceRe = /([-]?[\d.]+,\d{2})\s{2,}/g;
  let lastPriceEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = lastPriceRe.exec(beforePzn)) !== null) {
    lastPriceEnd = m.index + m[0].length;
  }
  if (lastPriceEnd < 0) return null;
  const brandName = beforePzn.slice(lastPriceEnd).trim();
  if (!brandName) return null;
  const beforeBrand = beforePzn.slice(0, lastPriceEnd);

  // 3. Extract 3 price fields from end of beforeBrand
  const pricesRe = /\s+([-]?[\d.]+,\d{2})\s+([-]?[\d.]+,\d{2})\s+([-]?[\d.]+,\d{2})\s*$/;
  const pricesMatch = pricesRe.exec(beforeBrand);
  if (!pricesMatch) return null;
  const beforePrices = beforeBrand.slice(0, pricesMatch.index);

  // 4. Extract form code (2-5 uppercase letters at end, e.g. TABL, FTBL, PULVE, AUGS)
  const formRe = /\s+([A-ZÄÖÜ]{2,5})\s*$/;
  const formMatch = formRe.exec(beforePrices);
  if (!formMatch) return null;
  const formCode = formMatch[1];
  const beforeForm = beforePrices.slice(0, formMatch.index);

  // 5. Extract Wirkstoffmenge, w, Packungsgröße (3 numeric fields from right)
  // Packungsgröße can have decimals (e.g. "4,5")
  const numFieldsRe = /\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/;
  const numMatch = numFieldsRe.exec(beforeForm);
  if (!numMatch) return null;
  const strength = numMatch[1]; // Wirkstoffmenge

  // 6. Everything before numerics is the Wirkstoff (ingredient) name
  const ingredientArea = beforeForm.slice(0, numMatch.index).trim();
  const ingredient = ingredientArea || extractIngredientFromGroup(currentGroup);

  return {
    pzn,
    entry: { brandName, ingredient, strength, formCode },
  };
}

/** Extract active ingredient name from group header name.
 *  For Stufe 1: "5-Fluorouracil" → "5-Fluorouracil"
 *  For Stufe 2/3: "ACE-Hemmer" → "ACE-Hemmer" (less useful but better than nothing)
 */
function extractIngredientFromGroup(groupName: string): string {
  return groupName || 'Unbekannt';
}

function generateOutput(entries: Map<string, PznEntry>): string {
  // Generate a TS file exporting the PZN lookup table
  // Format: Record<string, { b: brandName, i: ingredient, s: strength, f: formCode }>
  // Use short keys to minimize bundle size

  const lines: string[] = [
    '// Auto-generated from Festbeträge PDF — do not edit manually',
    '// Run: pnpm generate:pzn',
    '',
    'export interface PznData {',
    '  /** Brand/trade name */',
    '  b: string;',
    '  /** Active ingredient */',
    '  i: string;',
    '  /** Wirkstoffmenge (strength) */',
    '  s: string;',
    '  /** Darreichungsform (dosage form code) */',
    '  f: string;',
    '}',
    '',
    'export const PZN_TABLE: Record<string, PznData> = {',
  ];

  for (const [pzn, entry] of entries) {
    const b = escapeString(entry.brandName);
    const i = escapeString(entry.ingredient);
    const s = escapeString(entry.strength);
    const f = escapeString(entry.formCode);
    lines.push(`"${pzn}":{b:${b},i:${i},s:${s},f:${f}},`);
  }

  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

function escapeString(s: string): string {
  return JSON.stringify(s);
}

// --- Main ---

const pdfPath = process.argv[2] || DEFAULT_PDF;
const entries = parsePdf(pdfPath);

mkdirSync(OUTPUT_DIR, { recursive: true });
const output = generateOutput(entries);
writeFileSync(OUTPUT_FILE, output, 'utf-8');

const sizeMB = (Buffer.byteLength(output, 'utf-8') / (1024 * 1024)).toFixed(1);
console.error(`Wrote ${OUTPUT_FILE} (${sizeMB} MB, ${entries.size} entries)`);

// Spot-check some known PZNs
const spotChecks = [
  ['00761259', 'Ramipril'],
  ['08533871', 'Metoprolol'],
  ['00758719', 'Ramipril'],
];
for (const [pzn, expected] of spotChecks) {
  const entry = entries.get(pzn);
  if (entry) {
    console.error(`  ✓ PZN ${pzn}: ${entry.brandName} (${entry.ingredient} ${entry.strength})`);
  } else {
    console.error(`  ✗ PZN ${pzn}: NOT FOUND (expected ${expected})`);
  }
}
