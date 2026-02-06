import type { Bmp } from '@mediplan/bmp-model';
import { parseUkfXml } from './parse-ukf-xml.js';

/**
 * Decode a DataMatrix barcode payload (raw bytes) into a Bmp object.
 *
 * BMP DataMatrix barcodes encode XML in ISO 8859-1 (Latin-1).
 * The payload starts with "MC" (Medication Card marker) followed by XML.
 */
export function parseDataMatrixPayload(bytes: Uint8Array): Bmp {
  // Decode ISO 8859-1: each byte maps directly to the same Unicode code point
  let text = '';
  for (let i = 0; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i]);
  }

  // Find the XML start — the payload may have a header before <MP
  const xmlStart = text.indexOf('<MP');
  if (xmlStart === -1) {
    throw new Error('No <MP> element found in DataMatrix payload');
  }

  const xml = text.slice(xmlStart);
  return parseUkfXml(xml);
}

/**
 * Parse a DataMatrix payload that was decoded as a string by the scanner library.
 * Some scanner libraries return strings directly rather than raw bytes.
 */
export function parseDataMatrixString(text: string): Bmp {
  const xmlStart = text.indexOf('<MP');
  if (xmlStart === -1) {
    throw new Error('No <MP> element found in DataMatrix payload');
  }
  return parseUkfXml(text.slice(xmlStart));
}
