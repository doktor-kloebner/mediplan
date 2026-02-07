import { describe, it, expect } from 'vitest';
import { formatDosage, formatMedicationLine, parseDosageFields } from './dosage.js';
import type { Medication } from './types.js';

describe('formatDosage', () => {
  it('formats structured dosage as "m - d - v - h"', () => {
    expect(formatDosage({ type: 'structured', morning: '1', noon: '0', evening: '0', night: '0' }))
      .toBe('1 - 0 - 0 - 0');
  });

  it('formats free-text dosage', () => {
    expect(formatDosage({ type: 'freeText', text: 'bei Bedarf' })).toBe('bei Bedarf');
  });

  it('returns empty string for undefined', () => {
    expect(formatDosage(undefined)).toBe('');
  });

  it('handles fractions', () => {
    expect(formatDosage({ type: 'structured', morning: '1/2', noon: '0', evening: '1/2', night: '0' }))
      .toBe('1/2 - 0 - 1/2 - 0');
  });
});

describe('parseDosageFields', () => {
  it('returns structured dosage when time slots given', () => {
    const result = parseDosageFields('1', '0', '0', '0');
    expect(result).toEqual({ type: 'structured', morning: '1', noon: '0', evening: '0', night: '0' });
  });

  it('returns free-text dosage when freeText given', () => {
    const result = parseDosageFields(undefined, undefined, undefined, undefined, 'bei Bedarf');
    expect(result).toEqual({ type: 'freeText', text: 'bei Bedarf' });
  });

  it('prefers structured over free-text when both present', () => {
    // Some PVS systems redundantly set both m/d/v/h and du — structured wins
    const result = parseDosageFields('1', '0', '0', '0', '1');
    expect(result?.type).toBe('structured');
    expect((result as any).morning).toBe('1');
  });

  it('defaults missing slots to "0"', () => {
    const result = parseDosageFields('1', undefined, undefined, undefined);
    expect(result).toEqual({ type: 'structured', morning: '1', noon: '0', evening: '0', night: '0' });
  });

  it('returns undefined when nothing provided', () => {
    expect(parseDosageFields()).toBeUndefined();
  });
});

describe('formatMedicationLine', () => {
  it('formats a full medication', () => {
    const med: Medication = {
      kind: 'medication',
      brandName: 'Metoprolol 47,5mg',
      pzn: '12345678',
      activeIngredients: [{ name: 'Metoprololsuccinat', strength: '47,5 mg' }],
      dosage: { type: 'structured', morning: '1', noon: '0', evening: '0', night: '0' },
    };
    expect(formatMedicationLine(med)).toBe('Metoprolol 47,5mg (Metoprololsuccinat 47,5 mg) 1 - 0 - 0 - 0');
  });

  it('handles medication without brand name', () => {
    const med: Medication = {
      kind: 'medication',
      activeIngredients: [{ name: 'Ibuprofen', strength: '400 mg' }],
      dosage: { type: 'freeText', text: 'bei Bedarf' },
    };
    expect(formatMedicationLine(med)).toBe('(Ibuprofen 400 mg) bei Bedarf');
  });

  it('handles medication with no dosage', () => {
    const med: Medication = {
      kind: 'medication',
      brandName: 'Aspirin',
      activeIngredients: [],
    };
    expect(formatMedicationLine(med)).toBe('Aspirin');
  });
});
