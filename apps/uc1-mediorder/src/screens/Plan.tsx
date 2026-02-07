import { signal, computed } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { navigate } from '../router';
import { getStoredBmp, type StoredBmp } from '../db';
import { getSectionLabel, formatDosage, type Medication, type Section } from '@mediplan/bmp-model';

const stored = signal<StoredBmp | null>(null);
const loading = signal(true);
const selectedMeds = signal<Set<string>>(new Set());
const showXml = signal(false);

/** Create a stable key for a medication within the plan. */
function medKey(sectionIndex: number, entryIndex: number): string {
  return `${sectionIndex}-${entryIndex}`;
}

export function PlanScreen({ id }: { id: number }) {
  useEffect(() => {
    loading.value = true;
    selectedMeds.value = new Set();
    getStoredBmp(id).then((result) => {
      stored.value = result ?? null;
      loading.value = false;
      // Pre-select all medications
      if (result) {
        const keys = new Set<string>();
        result.bmp.sections.forEach((s, si) => {
          s.entries.forEach((e, ei) => {
            if (e.kind === 'medication') keys.add(medKey(si, ei));
          });
        });
        selectedMeds.value = keys;
      }
    });
  }, [id]);

  if (loading.value) return <div class="loading">Laden...</div>;
  if (!stored.value) return <div class="error-msg">Medikationsplan nicht gefunden.</div>;

  const { bmp } = stored.value;
  const selectedCount = computed(() => selectedMeds.value.size);

  function toggleMed(key: string) {
    const next = new Set(selectedMeds.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selectedMeds.value = next;
  }

  function toggleAll() {
    const allKeys = new Set<string>();
    bmp.sections.forEach((s, si) => {
      s.entries.forEach((e, ei) => {
        if (e.kind === 'medication') allKeys.add(medKey(si, ei));
      });
    });
    if (selectedMeds.value.size === allKeys.size) {
      selectedMeds.value = new Set();
    } else {
      selectedMeds.value = allKeys;
    }
  }

  return (
    <div>
      {/* Patient info */}
      <div class="patient-bar">
        <div><strong>{bmp.patient.givenName} {bmp.patient.familyName}</strong>{bmp.patient.birthDate && <>, geb. {formatDate(bmp.patient.birthDate)}</>}</div>
        <div class="meta">{bmp.author.name}{bmp.author.printTimestamp && <>, {formatDate(bmp.author.printTimestamp)}</>}</div>
      </div>

      {/* Raw XML debug */}
      <button
        class="btn"
        style={{ fontSize: '0.8em', padding: '2px 8px', marginBottom: '8px' }}
        onClick={() => { showXml.value = !showXml.value; }}
      >
        {showXml.value ? 'XML ausblenden' : 'XML anzeigen'}
      </button>
      {showXml.value && stored.value?.rawXml && (
        <pre style={{ fontSize: '0.7em', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginBottom: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {formatXml(stored.value.rawXml)}
        </pre>
      )}

      {/* Observations */}
      {bmp.observations.allergies && (
        <div class="error-msg" style={{ marginBottom: '16px' }}>
          Allergien: {bmp.observations.allergies}
        </div>
      )}

      {/* Select all toggle */}
      <div style={{ marginBottom: '8px' }}>
        <label class="checkbox-row" style={{ padding: '8px 0' }}>
          <input
            type="checkbox"
            checked={selectedMeds.value.size > 0 && selectedMeds.value.size === countMeds(bmp.sections)}
            onChange={toggleAll}
          />
          <span style={{ fontWeight: 600 }}>Alle auswählen / abwählen</span>
        </label>
      </div>

      {/* Sections */}
      {bmp.sections.map((section, si) => (
        <div key={si}>
          <div class="section-header">{getSectionLabel(section)}</div>
          {section.entries.map((entry, ei) => {
            if (entry.kind === 'medication') {
              const key = medKey(si, ei);
              const selected = selectedMeds.value.has(key);
              return (
                <div key={key} class={`card ${selected ? 'card-selected' : ''}`}>
                  <label class="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMed(key)}
                    />
                    <div>
                      <MedicationCard med={entry} />
                    </div>
                  </label>
                </div>
              );
            }
            if (entry.kind === 'freeText') {
              return (
                <div key={`${si}-${ei}`} class="card">
                  <p style={{ fontStyle: 'italic' }}>{entry.text}</p>
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}

      {/* Sticky order button */}
      <div class="sticky-bottom">
        <button
          class="btn btn-primary btn-block"
          disabled={selectedCount.value === 0}
          onClick={() => navigate(`/order/${id}`)}
        >
          Nachbestellung senden ({selectedCount.value})
        </button>
      </div>
    </div>
  );
}

function MedicationCard({ med }: { med: Medication }) {
  const displayName = med.brandName
    || med.activeIngredients.map(a => a.name).join(', ')
    || (med.pzn ? `PZN ${med.pzn} (Name unbekannt)` : 'Unbekanntes Medikament');

  return (
    <div>
      <div class="med-name">{displayName}</div>
      {med.activeIngredients.length > 0 && (
        <div class="med-detail">
          {med.activeIngredients.map(a => a.strength ? `${a.name} ${a.strength}` : a.name).join(', ')}
        </div>
      )}
      {med.pzn && <div class="med-detail">PZN: {med.pzn}</div>}
      {med.dosage && <div class="med-dosage">Dosierung: {formatDosage(med.dosage)}</div>}
      {med.reason && <div class="med-detail">Grund: {med.reason}</div>}
      {med.instructions && <div class="med-detail">Hinweis: {med.instructions}</div>}
    </div>
  );
}

function formatDate(raw: string): string {
  if (raw.length >= 8) {
    return `${raw.slice(6, 8)}.${raw.slice(4, 6)}.${raw.slice(0, 4)}`;
  }
  return raw;
}

function countMeds(sections: Section[]): number {
  let count = 0;
  for (const s of sections) {
    for (const e of s.entries) {
      if (e.kind === 'medication') count++;
    }
  }
  return count;
}

function formatXml(xml: string): string {
  let indent = 0;
  return xml.replace(/>\s*</g, '>\n<').replace(/(<[^/][^>]*[^/]>)|(<\/[^>]+>)|(<[^>]+\/>)/g, (match) => {
    if (match.startsWith('</')) indent--;
    const pad = '  '.repeat(Math.max(0, indent));
    if (match.startsWith('<') && !match.startsWith('</') && !match.endsWith('/>')) indent++;
    return pad + match;
  });
}

// Export selectedMeds for use by Order screen
export { selectedMeds, medKey };
