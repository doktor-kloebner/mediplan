import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { getStoredBmp, getSetting, setSetting, type StoredBmp } from '../db';
import { selectedMeds, medKey } from './Plan';
import { formatDosage, type Medication } from '@mediplan/bmp-model';

const stored = signal<StoredBmp | null>(null);
const loading = signal(true);
const practiceEmail = signal('');

export function OrderScreen({ id }: { id: number }) {
  useEffect(() => {
    loading.value = true;
    Promise.all([
      getStoredBmp(id),
      getSetting('practiceEmail'),
    ]).then(([result, email]) => {
      stored.value = result ?? null;
      practiceEmail.value = email ?? '';
      loading.value = false;
    });
  }, [id]);

  if (loading.value) return <div class="loading">Laden...</div>;
  if (!stored.value) return <div class="error-msg">Medikationsplan nicht gefunden.</div>;

  const { bmp } = stored.value;
  const selected = getSelectedMedications(bmp, selectedMeds.value);

  if (selected.length === 0) {
    return (
      <div>
        <div class="error-msg">Keine Medikamente ausgewählt.</div>
        <a href={`#/plan/${id}`} class="btn btn-secondary btn-block">
          Zurück zur Auswahl
        </a>
      </div>
    );
  }

  const mailto = buildMailtoUri(bmp, selected, practiceEmail.value);

  return (
    <div>
      <h2>Nachbestellung prüfen</h2>

      <div class="patient-bar" style={{ marginTop: '16px' }}>
        <strong>{bmp.patient.givenName} {bmp.patient.familyName}</strong>
      </div>

      <div class="form-group">
        <label for="practice-email">E-Mail der Praxis</label>
        <input
          id="practice-email"
          class="input"
          type="email"
          placeholder="praxis@example.de"
          value={practiceEmail.value}
          onInput={(e) => { practiceEmail.value = (e.target as HTMLInputElement).value; }}
        />
      </div>

      <h3 style={{ marginBottom: '12px' }}>Ausgewählte Medikamente ({selected.length})</h3>

      {selected.map((med, i) => (
        <div key={i} class="card">
          <div class="med-name">{med.brandName || med.activeIngredients.map(a => a.name).join(', ')}</div>
          {med.pzn && <div class="med-detail">PZN: {med.pzn}</div>}
          {med.activeIngredients.length > 0 && (
            <div class="med-detail">
              {med.activeIngredients.map(a => a.strength ? `${a.name} ${a.strength}` : a.name).join(', ')}
            </div>
          )}
          {med.dosage && <div class="med-dosage">Dosierung: {formatDosage(med.dosage)}</div>}
        </div>
      ))}

      <div style={{ marginTop: '24px' }}>
        <a
          href={mailto}
          class="btn btn-primary btn-block"
          onClick={() => {
            // Save email for future use
            if (practiceEmail.value) {
              setSetting('practiceEmail', practiceEmail.value);
            }
          }}
        >
          E-Mail senden
        </a>
      </div>

      <div style={{ marginTop: '12px' }}>
        <a href={`#/plan/${id}`} class="btn btn-secondary btn-block">
          Zurück zur Auswahl
        </a>
      </div>
    </div>
  );
}

function getSelectedMedications(
  bmp: StoredBmp['bmp'],
  selected: Set<string>,
): Medication[] {
  const meds: Medication[] = [];
  bmp.sections.forEach((s, si) => {
    s.entries.forEach((e, ei) => {
      if (e.kind === 'medication' && selected.has(medKey(si, ei))) {
        meds.push(e);
      }
    });
  });
  return meds;
}

export function buildMailtoUri(
  bmp: StoredBmp['bmp'],
  medications: Medication[],
  toEmail: string,
): string {
  const patientName = `${bmp.patient.givenName} ${bmp.patient.familyName}`.trim();
  const subject = `Rezeptanfrage - ${patientName}`;

  const lines: string[] = [
    `Sehr geehrte Damen und Herren,`,
    ``,
    `ich bitte um Nachbestellung folgender Medikamente:`,
    ``,
    `Patient: ${patientName}`,
  ];

  if (bmp.patient.birthDate) {
    const bd = bmp.patient.birthDate;
    if (bd.length === 8) {
      lines.push(`Geburtsdatum: ${bd.slice(6, 8)}.${bd.slice(4, 6)}.${bd.slice(0, 4)}`);
    }
  }

  lines.push('');

  medications.forEach((med, i) => {
    const name = med.brandName || med.activeIngredients.map(a => a.name).join(', ') || `PZN ${med.pzn || 'unbekannt'}`;
    lines.push(`${i + 1}. ${name}`);
    if (med.pzn) lines.push(`   PZN: ${med.pzn}`);
    if (med.activeIngredients.length > 0) {
      const ai = med.activeIngredients.map(a => a.strength ? `${a.name} ${a.strength}` : a.name).join(', ');
      lines.push(`   Wirkstoff: ${ai}`);
    }
    if (med.dosage) {
      lines.push(`   Dosierung: ${formatDosage(med.dosage)}`);
    }
    lines.push('');
  });

  lines.push('Mit freundlichen Grüßen');

  const body = lines.join('\n');
  const to = encodeURIComponent(toEmail);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
