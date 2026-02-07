import { db } from './db';
import type { Medication, ActiveIngredient } from '@mediplan/bmp-model';
import { PZN_TABLE } from './generated/pzn-data';

export interface PznInfo {
  brandName: string;
  activeIngredients: ActiveIngredient[];
  formCode?: string;
}

/**
 * Look up a PZN to get medication name, active ingredients, and form.
 * Checks: 1) IndexedDB cache, 2) generated Festbeträge table.
 * Does NOT call the web API — use manualLookupPzn() for that.
 */
export async function lookupPzn(pzn: string): Promise<PznInfo | null> {
  // 1. Check IndexedDB cache
  const cached = await db.pznCache.get(pzn);
  if (cached) return cached.info;

  // 2. Check generated Festbeträge table (~35k entries)
  // PZNs in the table are zero-padded to 8 digits; BMP data may omit leading zeros
  const pzn8 = pzn.padStart(8, '0');
  const gen = PZN_TABLE[pzn8];
  if (gen) {
    const info: PznInfo = {
      brandName: gen.b,
      activeIngredients: [{ name: gen.i, strength: gen.s }],
      formCode: gen.f,
    };
    await cachePzn(pzn, info);
    return info;
  }

  return null;
}

/**
 * Manually look up a PZN via the local pzn-server (DuckDuckGo-based).
 * Caches the result on success. Returns null on failure.
 */
export async function manualLookupPzn(pzn: string): Promise<PznInfo | null> {
  // Check cache first (may have been resolved before)
  const cached = await db.pznCache.get(pzn);
  if (cached) return cached.info;

  const result = await fetchPznFromWeb(pzn);
  if (result) {
    await cachePzn(pzn, result);
    return result;
  }

  return null;
}

async function cachePzn(pzn: string, info: PznInfo): Promise<void> {
  try {
    await db.pznCache.put({ pzn, info, fetchedAt: new Date() });
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Enrich a medication that has a PZN but is missing name/ingredients.
 * Returns true if enrichment was applied.
 */
export async function enrichMedication(med: Medication): Promise<boolean> {
  if (!med.pzn) return false;
  // Already has a meaningful brand name — skip
  if (med.brandName && med.activeIngredients.length > 0) return false;

  const info = await lookupPzn(med.pzn);
  if (!info) return false;

  if (!med.brandName) med.brandName = info.brandName;
  if (med.activeIngredients.length === 0) med.activeIngredients = info.activeIngredients;
  if (!med.formCode && info.formCode) med.formCode = info.formCode;

  return true;
}

/**
 * Enrich all medications in a BMP that are missing names.
 * Mutates the medications in place. Returns count of enriched meds.
 */
export async function enrichBmpMedications(
  sections: { entries: { kind: string; pzn?: string; brandName?: string; activeIngredients?: ActiveIngredient[] }[] }[],
): Promise<number> {
  let count = 0;
  for (const section of sections) {
    for (const entry of section.entries) {
      if (entry.kind === 'medication') {
        const enriched = await enrichMedication(entry as Medication);
        if (enriched) count++;
      }
    }
  }
  return count;
}

// --- Web lookup (local PZN server) ---

const PZN_API_URL = '/api/pzn';

async function fetchPznFromWeb(pzn: string): Promise<PznInfo | null> {
  try {
    const res = await fetch(`${PZN_API_URL}/${encodeURIComponent(pzn)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.brandName) {
      return {
        brandName: data.brandName,
        activeIngredients: data.activeIngredients ?? [],
        formCode: data.formCode ?? data.form,
      };
    }
    return null;
  } catch {
    return null;
  }
}
