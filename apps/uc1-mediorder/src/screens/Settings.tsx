import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { getSetting, setSetting, clearAllData } from '../db';

const practiceEmail = signal('');
const saved = signal(false);
const confirmClear = signal(false);

export function SettingsScreen() {
  useEffect(() => {
    getSetting('practiceEmail').then((val) => {
      practiceEmail.value = val ?? '';
    });
    saved.value = false;
    confirmClear.value = false;
  }, []);

  async function handleSave() {
    await setSetting('practiceEmail', practiceEmail.value);
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2000);
  }

  async function handleClear() {
    if (!confirmClear.value) {
      confirmClear.value = true;
      return;
    }
    await clearAllData();
    practiceEmail.value = '';
    confirmClear.value = false;
  }

  return (
    <div>
      <h2>Einstellungen</h2>

      <div class="form-group" style={{ marginTop: '16px' }}>
        <label for="default-email">Standard-E-Mail der Praxis</label>
        <input
          id="default-email"
          class="input"
          type="email"
          placeholder="praxis@example.de"
          value={practiceEmail.value}
          onInput={(e) => { practiceEmail.value = (e.target as HTMLInputElement).value; }}
        />
      </div>

      <button class="btn btn-primary btn-block" onClick={handleSave}>
        Speichern
      </button>

      {saved.value && (
        <div style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: '8px', textAlign: 'center' }}>
          Gespeichert!
        </div>
      )}

      <hr style={{ margin: '32px 0', border: 'none', borderTop: '2px solid var(--color-border)' }} />

      <h3>Daten löschen</h3>
      <p style={{ margin: '8px 0 16px', color: 'var(--color-text-secondary)' }}>
        Alle gespeicherten Medikationspläne und Einstellungen werden unwiderruflich gelöscht.
      </p>

      <button class="btn btn-danger btn-block" onClick={handleClear}>
        {confirmClear.value ? 'Wirklich alle Daten löschen?' : 'Alle Daten löschen'}
      </button>
    </div>
  );
}
