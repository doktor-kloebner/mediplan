import Dexie, { type EntityTable } from 'dexie';
import type { Bmp } from '@mediplan/bmp-model';

export interface StoredBmp {
  id?: number;
  uuid: string;
  scannedAt: Date;
  rawXml: string;
  bmp: Bmp;
  patientName: string;
  authorName: string;
}

export interface AppSetting {
  key: string;
  value: string;
}

const db = new Dexie('mediorder') as Dexie & {
  bmps: EntityTable<StoredBmp, 'id'>;
  settings: EntityTable<AppSetting, 'key'>;
};

db.version(1).stores({
  bmps: '++id, uuid, scannedAt',
  settings: 'key',
});

export { db };

export async function saveBmp(rawXml: string, bmp: Bmp): Promise<number> {
  const id = await db.bmps.add({
    uuid: bmp.uuid,
    scannedAt: new Date(),
    rawXml,
    bmp,
    patientName: `${bmp.patient.givenName} ${bmp.patient.familyName}`.trim(),
    authorName: bmp.author.name,
  });
  return id as number;
}

export async function getStoredBmp(id: number): Promise<StoredBmp | undefined> {
  return db.bmps.get(id);
}

export async function getAllBmps(): Promise<StoredBmp[]> {
  return db.bmps.orderBy('scannedAt').reverse().toArray();
}

export async function deleteBmp(id: number): Promise<void> {
  await db.bmps.delete(id);
}

export async function getSetting(key: string): Promise<string | undefined> {
  const entry = await db.settings.get(key);
  return entry?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export async function clearAllData(): Promise<void> {
  await db.bmps.clear();
  await db.settings.clear();
}
