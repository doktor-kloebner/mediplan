import { describe, it, expect } from 'vitest';
import { mergeMultiPageBmps } from './merge.js';
import { parseUkfXml } from './parse-ukf-xml.js';
import { PAGE_1_XML, PAGE_2_XML, SIMPLE_BMP_XML } from './fixtures.js';

describe('mergeMultiPageBmps', () => {
  it('returns single page unchanged', () => {
    const page = parseUkfXml(PAGE_1_XML);
    const merged = mergeMultiPageBmps([page]);
    expect(merged).toBe(page);
  });

  it('merges two pages', () => {
    const page1 = parseUkfXml(PAGE_1_XML);
    const page2 = parseUkfXml(PAGE_2_XML);
    const merged = mergeMultiPageBmps([page1, page2]);

    expect(merged.patient.givenName).toBe('Maria');
    expect(merged.sections).toHaveLength(2);
    expect(merged.sections[0].code).toBe('411');
    expect(merged.sections[1].code).toBe('412');
  });

  it('throws on empty array', () => {
    expect(() => mergeMultiPageBmps([])).toThrow('Cannot merge empty array');
  });

  it('throws on UUID mismatch', () => {
    const page1 = parseUkfXml(PAGE_1_XML);
    const other = parseUkfXml(SIMPLE_BMP_XML);
    expect(() => mergeMultiPageBmps([page1, other])).toThrow('UUID mismatch');
  });
});
