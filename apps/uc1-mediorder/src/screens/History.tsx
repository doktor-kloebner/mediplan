import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { getAllBmps, deleteBmp, type StoredBmp } from '../db';

const items = signal<StoredBmp[]>([]);
const loading = signal(true);

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

  async function handleDelete(id: number) {
    await deleteBmp(id);
    items.value = await getAllBmps();
  }

  return (
    <div>
      <h2>Verlauf</h2>
      <div style={{ marginTop: '16px' }}>
        {items.value.map((item) => (
          <div key={item.id} class="list-item" style={{ flexWrap: 'wrap' }}>
            <a
              href={`#/plan/${item.id}`}
              style={{ flex: 1, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
            >
              <div class="title">{item.patientName}</div>
              <div class="subtitle">
                {item.authorName} &middot; {formatDate(item.scannedAt)}
              </div>
            </a>
            <button
              class="btn btn-danger"
              style={{ minHeight: '40px', minWidth: '40px', padding: '8px 12px', fontSize: '0.875rem' }}
              onClick={() => handleDelete(item.id!)}
              aria-label={`${item.patientName} löschen`}
            >
              Löschen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
