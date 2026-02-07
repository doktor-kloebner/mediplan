import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { getAllBmps, deleteBmp, type StoredBmp } from '../db';

const items = signal<StoredBmp[]>([]);
const loading = signal(true);

/** Extract creation date from BMP printTimestamp, fall back to scan date. */
function getCreationDate(item: StoredBmp): Date {
  const ts = item.bmp.author.printTimestamp;
  if (ts) {
    // ISO-ish: "2026-02-07 17:09"
    const isoMatch = ts.match(/^(\d{4})-(\d{2})-(\d{2})\s*(\d{2})?:?(\d{2})?/);
    if (isoMatch) {
      return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3], +(isoMatch[4] ?? 0), +(isoMatch[5] ?? 0));
    }
    // Compact: "20260207170900"
    if (/^\d{8}/.test(ts)) {
      return new Date(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8), +ts.slice(8, 10) || 0, +ts.slice(10, 12) || 0);
    }
  }
  return new Date(item.scannedAt);
}

export function HistoryScreen() {
  useEffect(() => {
    loading.value = true;
    getAllBmps().then((result) => {
      items.value = result;
      loading.value = false;
    });
  }, []);

  if (loading.value) return <div class="loading">Laden...</div>;

  if (items.value.length === 0) {
    return (
      <div class="empty-state">
        <p>Noch keine Medikationspläne gescannt.</p>
        <a href="#/" class="btn btn-primary">
          Jetzt scannen
        </a>
      </div>
    );
  }

  // Sort by creation date, newest first
  const sorted = [...items.value].sort((a, b) => getCreationDate(b).getTime() - getCreationDate(a).getTime());
  const newest = sorted[0];
  const older = sorted.slice(1);

  async function handleDelete(id: number) {
    await deleteBmp(id);
    items.value = await getAllBmps();
  }

  return (
    <div>
      <h2>Aktueller Medikationsplan</h2>

      {/* Most recent BMP — medically relevant */}
      <div style={{ marginTop: '16px' }}>
        <BmpListItem item={newest} onDelete={handleDelete} highlight />
      </div>

      {/* Older BMPs */}
      {older.length > 0 && (
        <div>
          <div style={{ borderTop: '2px solid #ccc', margin: '16px 0 8px', paddingTop: '8px', fontSize: '0.85em', color: '#666' }}>
            Ältere Pläne
          </div>
          {older.map((item) => (
            <BmpListItem key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function BmpListItem({ item, onDelete, highlight }: { item: StoredBmp; onDelete: (id: number) => void; highlight?: boolean }) {
  const creationDate = getCreationDate(item);

  return (
    <div class="list-item" style={{ flexWrap: 'wrap', ...(highlight ? { borderLeft: '3px solid #1565c0', paddingLeft: '12px' } : {}) }}>
      <a
        href={`#/plan/${item.id}`}
        style={{ flex: 1, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
      >
        <div class="title">{item.patientName}</div>
        <div class="subtitle">
          {item.authorName} &middot; erstellt {formatDate(creationDate)}
        </div>
        <div class="subtitle" style={{ fontSize: '0.8em', color: '#999' }}>
          gescannt {formatDate(new Date(item.scannedAt))}
        </div>
      </a>
      <button
        class="btn btn-danger"
        style={{ minHeight: '40px', minWidth: '40px', padding: '8px 12px', fontSize: '0.875rem' }}
        onClick={() => onDelete(item.id!)}
        aria-label={`${item.patientName} löschen`}
      >
        Löschen
      </button>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
