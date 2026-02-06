import { describe, it, expect } from 'vitest';
import { parseUkfXml } from './parse-ukf-xml.js';
import {
  SIMPLE_BMP_XML, MINIMAL_BMP_XML, FREE_TEXT_SECTION_XML,
  MULTI_INGREDIENT_XML, OBSERVATIONS_FULL_XML,
} from './fixtures.js';

describe('parseUkfXml', () => {
  describe('root attributes', () => {
    it('parses version, UUID, and language', () => {
      const bmp = parseUkfXml(SIMPLE_BMP_XML);
      expect(bmp.version).toBe('025');
      expect(bmp.uuid).toBe('11111111111111111111111111111111');
      expect(bmp.language).toBe('de');
    });
  });

  describe('patient', () => {
    it('parses all patient fields', () => {
      const { patient } = parseUkfXml(SIMPLE_BMP_XML);
      expect(patient.givenName).toBe('Max');
      expect(patient.familyName).toBe('Mustermann');
      expect(patient.egk).toBe('A123456789');
      expect(patient.birthDate).toBe('19550315');
      expect(patient.sex).toBe('M');
    });

    it('handles minimal patient', () => {
      const { patient } = parseUkfXml(MINIMAL_BMP_XML);
      expect(patient.givenName).toBe('Anna');
      expect(patient.familyName).toBe('Schmidt');
      expect(patient.egk).toBeUndefined();
    });
  });

  describe('author', () => {
    it('parses all author fields', () => {
      const { author } = parseUkfXml(SIMPLE_BMP_XML);
      expect(author.name).toBe('Dr. med. Erika Musterärztin');
      expect(author.lanr).toBe('123456789');
      expect(author.street).toBe('Musterstr. 1');
      expect(author.zip).toBe('12345');
      expect(author.city).toBe('Musterstadt');
      expect(author.phone).toBe('030-1234567');
      expect(author.email).toBe('praxis@example.de');
      expect(author.printTimestamp).toBe('20240115120000');
    });
  });

  describe('observations', () => {
    it('parses observations with allergies and vitals', () => {
      const { observations } = parseUkfXml(SIMPLE_BMP_XML);
      expect(observations.allergies).toBe('Penicillin');
      expect(observations.weight).toBe('80');
      expect(observations.height).toBe('178');
      expect(observations.creatinine).toBe('1.2');
    });

    it('parses pregnant/breastfeeding flags', () => {
      const { observations } = parseUkfXml(OBSERVATIONS_FULL_XML);
      expect(observations.pregnant).toBe(true);
      expect(observations.breastfeeding).toBe(false);
      expect(observations.allergies).toBe('Sulfonamide, Latex');
    });

    it('returns empty observations when missing', () => {
      const { observations } = parseUkfXml(MINIMAL_BMP_XML);
      expect(observations.allergies).toBeUndefined();
      expect(observations.pregnant).toBeUndefined();
    });
  });

  describe('sections', () => {
    it('parses sections with code', () => {
      const { sections } = parseUkfXml(SIMPLE_BMP_XML);
      expect(sections).toHaveLength(2);
      expect(sections[0].code).toBe('411');
      expect(sections[1].code).toBe('412');
    });

    it('parses section with free title', () => {
      const { sections } = parseUkfXml(FREE_TEXT_SECTION_XML);
      expect(sections[0].freeTitle).toBe('Hinweise zur Einnahme');
      expect(sections[0].code).toBeUndefined();
    });
  });

  describe('medications', () => {
    it('parses medication with structured dosage', () => {
      const { sections } = parseUkfXml(SIMPLE_BMP_XML);
      const med = sections[0].entries[0];
      expect(med.kind).toBe('medication');
      if (med.kind !== 'medication') return;
      expect(med.pzn).toBe('12345678');
      expect(med.brandName).toBe('Metoprolol 47,5mg');
      expect(med.formCode).toBe('FTA');
      expect(med.unit).toBe('Stk');
      expect(med.dosage).toEqual({
        type: 'structured',
        morning: '1', noon: '0', evening: '0', night: '0',
      });
      expect(med.activeIngredients).toEqual([
        { name: 'Metoprololsuccinat', strength: '47,5 mg' },
      ]);
    });

    it('parses medication with reason', () => {
      const { sections } = parseUkfXml(SIMPLE_BMP_XML);
      const med = sections[0].entries[1];
      if (med.kind !== 'medication') return;
      expect(med.reason).toBe('Bluthochdruck');
    });

    it('parses medication with free-text dosage', () => {
      const { sections } = parseUkfXml(SIMPLE_BMP_XML);
      const med = sections[1].entries[0];
      if (med.kind !== 'medication') return;
      expect(med.dosage).toEqual({
        type: 'freeText',
        text: 'bei Bedarf, max. 3x täglich',
      });
    });

    it('parses multiple active ingredients', () => {
      const { sections } = parseUkfXml(MULTI_INGREDIENT_XML);
      const med = sections[0].entries[0];
      if (med.kind !== 'medication') return;
      expect(med.activeIngredients).toHaveLength(3);
      expect(med.activeIngredients[0].name).toBe('Amlodipin');
      expect(med.activeIngredients[1].name).toBe('Valsartan');
      expect(med.activeIngredients[2].name).toBe('Hydrochlorothiazid');
    });
  });

  describe('free text and prescriptions', () => {
    it('parses free text entries', () => {
      const { sections } = parseUkfXml(FREE_TEXT_SECTION_XML);
      const entry = sections[0].entries[0];
      expect(entry.kind).toBe('freeText');
      if (entry.kind !== 'freeText') return;
      expect(entry.text).toBe('Alle Medikamente mit ausreichend Wasser einnehmen.');
    });

    it('parses prescription entries', () => {
      const { sections } = parseUkfXml(FREE_TEXT_SECTION_XML);
      const entry = sections[0].entries[1];
      expect(entry.kind).toBe('prescription');
      if (entry.kind !== 'prescription') return;
      expect(entry.text).toBe('Rezept für Physiotherapie bitte erneuern');
    });
  });

  describe('error handling', () => {
    it('throws on invalid XML', () => {
      expect(() => parseUkfXml('<not valid xml')).toThrow();
    });

    it('throws on wrong root element', () => {
      expect(() => parseUkfXml('<Root/>')).toThrow('Expected root element <MP>');
    });
  });
});
