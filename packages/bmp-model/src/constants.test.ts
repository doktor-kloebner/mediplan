import { describe, it, expect } from 'vitest';
import { getSectionLabel, SECTION_LABELS } from './constants.js';

describe('getSectionLabel', () => {
  it('returns label for known section code', () => {
    expect(getSectionLabel({ code: '411' })).toBe('Dauermedikation');
    expect(getSectionLabel({ code: '412' })).toBe('Bedarfsmedikation');
  });

  it('returns freeTitle when code is unknown', () => {
    expect(getSectionLabel({ code: '999', freeTitle: 'Mein Abschnitt' })).toBe('Mein Abschnitt');
  });

  it('returns freeTitle when no code', () => {
    expect(getSectionLabel({ freeTitle: 'Sonstiges' })).toBe('Sonstiges');
  });

  it('returns code as fallback', () => {
    expect(getSectionLabel({ code: '999' })).toBe('999');
  });

  it('returns default when nothing given', () => {
    expect(getSectionLabel({})).toBe('Medikation');
  });

  it('has all expected section codes', () => {
    const expected = ['411', '412', '413', '414', '415', '416', '417', '418', '419', '421', '422'];
    expect(Object.keys(SECTION_LABELS).sort()).toEqual(expected.sort());
  });
});
