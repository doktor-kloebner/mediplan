import { describe, it, expect } from 'vitest';
import { parseDataMatrixPayload, parseDataMatrixString } from './parse-datamatrix.js';
import { SIMPLE_BMP_XML } from './fixtures.js';

describe('parseDataMatrixPayload', () => {
  it('decodes ISO 8859-1 bytes to BMP', () => {
    // Encode the XML as ISO 8859-1 bytes with MC header
    const header = 'MC';
    const fullText = header + SIMPLE_BMP_XML;
    const bytes = new Uint8Array(fullText.length);
    for (let i = 0; i < fullText.length; i++) {
      bytes[i] = fullText.charCodeAt(i);
    }

    const bmp = parseDataMatrixPayload(bytes);
    expect(bmp.patient.familyName).toBe('Mustermann');
    expect(bmp.sections).toHaveLength(2);
  });

  it('handles German umlauts in ISO 8859-1', () => {
    const xml = '<MP v="025" U="00000000000000000000000000000000" l="de"><P g="Jürgen" f="Müller"/><A n="Dr. Böhm"/><S c="411"><M a="Präparat"><W w="Säure"/></M></S></MP>';
    const bytes = new Uint8Array(xml.length);
    for (let i = 0; i < xml.length; i++) {
      bytes[i] = xml.charCodeAt(i);
    }

    const bmp = parseDataMatrixPayload(bytes);
    expect(bmp.patient.givenName).toBe('Jürgen');
    expect(bmp.patient.familyName).toBe('Müller');
    expect(bmp.author.name).toBe('Dr. Böhm');
  });

  it('throws when no <MP> found', () => {
    const bytes = new Uint8Array([65, 66, 67]); // "ABC"
    expect(() => parseDataMatrixPayload(bytes)).toThrow('No <MP> element found');
  });
});

describe('parseDataMatrixString', () => {
  it('parses string with header prefix', () => {
    const text = 'MC' + SIMPLE_BMP_XML;
    const bmp = parseDataMatrixString(text);
    expect(bmp.patient.givenName).toBe('Max');
  });

  it('parses raw XML string', () => {
    const bmp = parseDataMatrixString(SIMPLE_BMP_XML);
    expect(bmp.uuid).toBe('11111111111111111111111111111111');
  });

  it('throws when no <MP> found', () => {
    expect(() => parseDataMatrixString('just some text')).toThrow('No <MP> element found');
  });
});
