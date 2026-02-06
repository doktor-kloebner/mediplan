import type { Bmp } from '@mediplan/bmp-model';

/**
 * Merge multiple BMP pages (from multi-page medication plans) into a single Bmp.
 * All pages must belong to the same plan (same UUID).
 * Patient, author, and observations are taken from the first page.
 * Sections from all pages are concatenated.
 */
export function mergeMultiPageBmps(pages: Bmp[]): Bmp {
  if (pages.length === 0) {
    throw new Error('Cannot merge empty array of BMPs');
  }
  if (pages.length === 1) {
    return pages[0];
  }

  const first = pages[0];
  const uuid = first.uuid;

  for (let i = 1; i < pages.length; i++) {
    if (pages[i].uuid !== uuid) {
      throw new Error(
        `UUID mismatch: page 0 has "${uuid}", page ${i} has "${pages[i].uuid}"`,
      );
    }
  }

  return {
    ...first,
    sections: pages.flatMap((p) => p.sections),
  };
}
