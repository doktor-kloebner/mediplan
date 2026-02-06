/** Root BMP object — one complete medication plan. */
export interface Bmp {
  version: string;
  uuid: string;
  language: string;
  patient: Patient;
  author: Author;
  observations: Observations;
  sections: Section[];
}

export interface Patient {
  givenName: string;
  familyName: string;
  egk?: string;
  birthDate?: string;
  sex?: 'M' | 'W' | 'D' | 'X';
  title?: string;
}

export interface Author {
  name: string;
  lanr?: string;
  idf?: string;
  kik?: string;
  street?: string;
  zip?: string;
  city?: string;
  phone?: string;
  email?: string;
  printTimestamp?: string;
}

export interface Observations {
  allergies?: string;
  weight?: string;
  height?: string;
  creatinine?: string;
  pregnant?: boolean;
  breastfeeding?: boolean;
}

export interface Section {
  code?: string;
  freeTitle?: string;
  entries: SectionEntry[];
}

export type SectionEntry = Medication | FreeText | Prescription;

export interface Medication {
  kind: 'medication';
  pzn?: string;
  brandName?: string;
  formCode?: string;
  formFreeText?: string;
  dosage?: DosageStructured | DosageFreeText;
  unit?: string;
  instructions?: string;
  reason?: string;
  activeIngredients: ActiveIngredient[];
}

export interface DosageStructured {
  type: 'structured';
  morning: string;
  noon: string;
  evening: string;
  night: string;
}

export interface DosageFreeText {
  type: 'freeText';
  text: string;
}

export interface ActiveIngredient {
  name: string;
  strength?: string;
}

export interface FreeText {
  kind: 'freeText';
  text: string;
}

export interface Prescription {
  kind: 'prescription';
  text: string;
}
