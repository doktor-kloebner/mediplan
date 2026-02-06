import { signal } from '@preact/signals';
import { navigate } from '../router';
import { saveBmp } from '../db';
import { parseDataMatrixString } from '@mediplan/bmp-parser';

const error = signal<string | null>(null);
const scanning = signal(false);

export function ScannerScreen() {
  return (
    <div>
      <h2>Medikationsplan scannen</h2>
      <p style={{ margin: '12px 0', color: 'var(--color-text-secondary)' }}>
        Richten Sie die Kamera auf den Barcode (DataMatrix) Ihres Medikationsplans.
      </p>

      <div class="scanner-container" id="scanner-viewport">
        {!scanning.value && (
          <div class="scanner-overlay">
            <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
              <p style={{ fontSize: '1.125rem', marginBottom: '16px' }}>
                Kamera wird geladen...
              </p>
              <button class="btn btn-primary" onClick={startScanner}>
                Kamera starten
              </button>
            </div>
          </div>
        )}
        <video id="scanner-video" playsInline />
        {scanning.value && (
          <div class="scanner-overlay">
            <div class="scanner-crosshair" />
          </div>
        )}
      </div>

      {error.value && (
        <div class="error-msg">{error.value}</div>
      )}

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <a href="#/history" class="btn btn-secondary">
          Verlauf anzeigen
        </a>
      </div>
    </div>
  );
}

async function startScanner() {
  error.value = null;
  try {
    const { BrowserDatamatrixCodeReader } = await import('@zxing/browser');
    const reader = new BrowserDatamatrixCodeReader();
    scanning.value = true;

    const videoEl = document.getElementById('scanner-video') as HTMLVideoElement;
    const result = await reader.decodeOnceFromVideoDevice(undefined, videoEl);
    scanning.value = false;

    const text = result.getText();
    const bmp = parseDataMatrixString(text);
    const xml = text.slice(text.indexOf('<MP'));
    const id = await saveBmp(xml, bmp);
    navigate(`/plan/${id}`);
  } catch (e: any) {
    scanning.value = false;
    if (e.name === 'NotAllowedError') {
      error.value = 'Kamerazugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Einstellungen.';
    } else if (e.name === 'NotFoundError') {
      error.value = 'Keine Kamera gefunden.';
    } else {
      error.value = `Fehler: ${e.message || 'Unbekannter Fehler'}`;
    }
  }
}
