import type { Medication, DosageStructured, DosageFreeText } from './types.js';

/** Format a structured dosage as "m - d - v - h" string. */
export function formatDosage(dosage: DosageStructured | DosageFreeText | undefined): string {
  if (!dosage) return '';
  if (dosage.type === 'freeText') return dosage.text;
  return `${dosage.morning} - ${dosage.noon} - ${dosage.evening} - ${dosage.night}`;
}

/** Build a one-line display string for a medication. */
export function formatMedicationLine(med: Medication): string {
  const parts: string[] = [];
  if (med.brandName) parts.push(med.brandName);
  if (med.activeIngredients.length > 0) {
    const ai = med.activeIngredients
      .map((a) => (a.strength ? `${a.name} ${a.strength}` : a.name))
      .join(', ');
    parts.push(`(${ai})`);
  }
  const dosageStr = formatDosage(med.dosage);
  if (dosageStr) parts.push(dosageStr);
  return parts.join(' ');
}

/**
 * Parse a dosage field value from UKF XML.
 * Returns a structured dosage if all four time slots are present,
 * or a free-text dosage otherwise.
 */
export function parseDosageFields(
  morning?: string,
  noon?: string,
  evening?: string,
  night?: string,
  freeText?: string,
): DosageStructured | DosageFreeText | undefined {
  if (freeText) {
    return { type: 'freeText', text: freeText };
  }
  if (morning !== undefined || noon !== undefined || evening !== undefined || night !== undefined) {
    return {
      type: 'structured',
      morning: morning ?? '0',
      noon: noon ?? '0',
      evening: evening ?? '0',
      night: night ?? '0',
    };
  }
  return undefined;
}
