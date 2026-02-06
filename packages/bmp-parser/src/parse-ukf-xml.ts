import type {
  Bmp, Patient, Author, Observations, Section, SectionEntry,
  Medication, ActiveIngredient, FreeText, Prescription,
} from '@mediplan/bmp-model';
import { parseDosageFields } from '@mediplan/bmp-model';

/** Parse a UKF XML string into a typed Bmp object. Uses browser-native DOMParser. */
export function parseUkfXml(xml: string): Bmp {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid XML: ${parseError.textContent}`);
  }

  const root = doc.documentElement;
  if (root.tagName !== 'MP') {
    throw new Error(`Expected root element <MP>, got <${root.tagName}>`);
  }

  return {
    version: attr(root, 'v') ?? '',
    uuid: attr(root, 'U') ?? '',
    language: attr(root, 'l') ?? 'de',
    patient: parsePatient(root),
    author: parseAuthor(root),
    observations: parseObservations(root),
    sections: parseSections(root),
  };
}

function parsePatient(root: Element): Patient {
  const el = root.querySelector('P');
  if (!el) return { givenName: '', familyName: '' };
  return {
    givenName: attr(el, 'g') ?? '',
    familyName: attr(el, 'f') ?? '',
    egk: attr(el, 'egk') ?? undefined,
    birthDate: attr(el, 'b') ?? undefined,
    sex: attr(el, 's') as Patient['sex'] ?? undefined,
    title: attr(el, 't') ?? undefined,
  };
}

function parseAuthor(root: Element): Author {
  const el = root.querySelector('A');
  if (!el) return { name: '' };
  return {
    name: attr(el, 'n') ?? '',
    lanr: attr(el, 'lanr') ?? undefined,
    idf: attr(el, 'idf') ?? undefined,
    kik: attr(el, 'kik') ?? undefined,
    street: attr(el, 's') ?? undefined,
    zip: attr(el, 'z') ?? undefined,
    city: attr(el, 'c') ?? undefined,
    phone: attr(el, 'p') ?? undefined,
    email: attr(el, 'e') ?? undefined,
    printTimestamp: attr(el, 't') ?? undefined,
  };
}

function parseObservations(root: Element): Observations {
  const el = root.querySelector('O');
  if (!el) return {};
  return {
    allergies: attr(el, 'ai') ?? undefined,
    weight: attr(el, 'w') ?? undefined,
    height: attr(el, 'h') ?? undefined,
    creatinine: attr(el, 'c') ?? undefined,
    pregnant: attr(el, 'p') === '1' ? true : attr(el, 'p') === '0' ? false : undefined,
    breastfeeding: attr(el, 'b') === '1' ? true : attr(el, 'b') === '0' ? false : undefined,
  };
}

function parseSections(root: Element): Section[] {
  const sections: Section[] = [];
  for (const sEl of root.querySelectorAll('S')) {
    sections.push({
      code: attr(sEl, 'c') ?? undefined,
      freeTitle: attr(sEl, 't') ?? undefined,
      entries: parseEntries(sEl),
    });
  }
  return sections;
}

function parseEntries(sectionEl: Element): SectionEntry[] {
  const entries: SectionEntry[] = [];
  for (const child of sectionEl.children) {
    switch (child.tagName) {
      case 'M':
        entries.push(parseMedication(child));
        break;
      case 'X':
        entries.push(parseFreeText(child));
        break;
      case 'R':
        entries.push(parsePrescription(child));
        break;
    }
  }
  return entries;
}

function parseMedication(el: Element): Medication {
  return {
    kind: 'medication',
    pzn: attr(el, 'p') ?? undefined,
    brandName: attr(el, 'a') ?? undefined,
    formCode: attr(el, 'f') ?? undefined,
    formFreeText: attr(el, 'fd') ?? undefined,
    dosage: parseDosageFields(
      attr(el, 'm') ?? undefined,
      attr(el, 'd') ?? undefined,
      attr(el, 'v') ?? undefined,
      attr(el, 'h') ?? undefined,
      attr(el, 'du') ?? undefined,
    ),
    unit: attr(el, 'e') ?? undefined,
    instructions: attr(el, 'i') ?? undefined,
    reason: attr(el, 'r') ?? undefined,
    activeIngredients: parseActiveIngredients(el),
  };
}

function parseActiveIngredients(medEl: Element): ActiveIngredient[] {
  const ingredients: ActiveIngredient[] = [];
  for (const wEl of medEl.querySelectorAll('W')) {
    const name = attr(wEl, 'w');
    if (name) {
      ingredients.push({
        name,
        strength: attr(wEl, 's') ?? undefined,
      });
    }
  }
  return ingredients;
}

function parseFreeText(el: Element): FreeText {
  return {
    kind: 'freeText',
    text: attr(el, 't') ?? '',
  };
}

function parsePrescription(el: Element): Prescription {
  return {
    kind: 'prescription',
    text: attr(el, 't') ?? '',
  };
}

function attr(el: Element, name: string): string | null {
  return el.getAttribute(name);
}
