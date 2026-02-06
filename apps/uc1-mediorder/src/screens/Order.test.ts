import { describe, it, expect } from 'vitest';
import { buildMailtoUri } from './Order';
import type { Bmp, Medication } from '@mediplan/bmp-model';

const testBmp: Bmp = {
  version: '025',
  uuid: 'test-uuid',
  language: 'de',
  patient: { givenName: 'Max', familyName: 'Mustermann', birthDate: '19550315' },
  author: { name: 'Dr. Muster' },
  observations: {},
  sections: [],
};

const testMeds: Medication[] = [
  {
    kind: 'medication',
    pzn: '12345678',
    brandName: 'Metoprolol 47,5mg',
    activeIngredients: [{ name: 'Metoprololsuccinat', strength: '47,5 mg' }],
    dosage: { type: 'structured', morning: '1', noon: '0', evening: '0', night: '0' },
  },
  {
    kind: 'medication',
    brandName: 'Ibuprofen 400mg',
    activeIngredients: [{ name: 'Ibuprofen', strength: '400 mg' }],
    dosage: { type: 'freeText', text: 'bei Bedarf' },
  },
];

describe('buildMailtoUri', () => {
  it('creates a valid mailto URI', () => {
    const uri = buildMailtoUri(testBmp, testMeds, 'praxis@example.de');
    expect(uri).toMatch(/^mailto:/);
    expect(uri).toContain('praxis%40example.de');
    expect(uri).toContain('Rezeptanfrage');
    expect(uri).toContain('Max%20Mustermann');
  });

  it('includes medication details in the body', () => {
    const uri = buildMailtoUri(testBmp, testMeds, 'test@test.de');
    const body = decodeURIComponent(uri.split('body=')[1]);
    expect(body).toContain('Metoprolol 47,5mg');
    expect(body).toContain('PZN: 12345678');
    expect(body).toContain('Metoprololsuccinat 47,5 mg');
    expect(body).toContain('1 - 0 - 0 - 0');
    expect(body).toContain('Ibuprofen 400mg');
    expect(body).toContain('bei Bedarf');
  });

  it('includes birth date', () => {
    const uri = buildMailtoUri(testBmp, testMeds, 'test@test.de');
    const body = decodeURIComponent(uri.split('body=')[1]);
    expect(body).toContain('15.03.1955');
  });

  it('numbers medications', () => {
    const uri = buildMailtoUri(testBmp, testMeds, 'test@test.de');
    const body = decodeURIComponent(uri.split('body=')[1]);
    expect(body).toContain('1. Metoprolol');
    expect(body).toContain('2. Ibuprofen');
  });
});
