/**
 * Parse Rezepte_list.txt to extract PZN → medication name mappings.
 *
 * Each entry follows the pattern: medication-name'price;PZN
 * Lines may contain multiple entries separated by commas (after ,S:... dosage or directly).
 *
 * Usage: node tools/parse-rezepte.mjs
 * Output: tools/rezepte-pzn.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, '..', 'Rezepte_list.txt');
const OUTPUT = path.join(__dirname, 'rezepte-pzn.json');

const raw = fs.readFileSync(INPUT, 'utf-8');
const lines = raw.split('\n');

// Match: medication name ' price ; PZN (8 digits)
// The regex anchors on 'digits.digits;digits pattern
const entryPattern = /([^,;']+?)\s*'(\d+\.\d{2});(\d{7,8})/g;

const pznMap = new Map();
let totalMatches = 0;

for (const line of lines) {
  // Strip surrounding quotes and <A> markers
  const cleaned = line.replace(/^"/, '').replace(/"$/, '').replace(/<A>/g, '');

  let match;
  entryPattern.lastIndex = 0;
  while ((match = entryPattern.exec(cleaned)) !== null) {
    let name = match[1].trim();
    const pzn = match[3].padStart(8, '0');
    totalMatches++;

    // Clean up: remove dosage regime prefix if the name starts with S:...
    // This happens when a comma-separated entry has S:...,NextMed
    name = name.replace(/^S:[^,]*,\s*/, '');

    // Skip non-medication items (bandages etc. without proper names)
    if (!name || name.length < 3) continue;

    // Keep first occurrence (or longer name)
    if (!pznMap.has(pzn) || name.length > pznMap.get(pzn).length) {
      pznMap.set(pzn, name);
    }
  }
}

// Build output sorted by PZN
const result = {};
for (const [pzn, name] of [...pznMap.entries()].sort()) {
  result[pzn] = name;
}

fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));

console.log(`Parsed ${totalMatches} entries from ${lines.length} lines`);
console.log(`Unique PZNs: ${pznMap.size}`);
console.log(`Written to ${OUTPUT}`);

// Show a few samples
const samples = [...pznMap.entries()].slice(0, 10);
console.log('\nSamples:');
for (const [pzn, name] of samples) {
  console.log(`  ${pzn} → ${name}`);
}
