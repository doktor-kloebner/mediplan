import { signal } from '@preact/signals';
import { navigate } from '../router';
import { saveBmp } from '../db';
import { parseDataMatrixString } from '@mediplan/bmp-parser';
import { parseUkfXml } from '@mediplan/bmp-parser';
import { enrichBmpMedications } from '../pzn-lookup';

const error = signal<string | null>(null);
const cameraActive = signal(false);
const scanStatus = signal('');

let videoStream: MediaStream | null = null;

export function ScannerScreen() {
  return (
    <div>
      <h2>Medikationsplan scannen</h2>
      <p style={{ margin: '12px 0', color: 'var(--color-text-secondary)' }}>
        Richten Sie die Kamera auf den Barcode (DataMatrix) Ihres Medikationsplans und drücken Sie den Auslöser.
      </p>

      <div class="scanner-container" id="scanner-viewport">
        {!cameraActive.value && (
          <div class="scanner-overlay">
            <div style={{ color: '#fff', textAlign: 'center', padding: '20px' }}>
              <button class="btn btn-primary" onClick={openCamera}>
                Kamera starten
              </button>
            </div>
          </div>
        )}
        <video id="scanner-video" playsInline autoPlay muted style={{ display: cameraActive.value ? 'block' : 'none' }} />
        <canvas id="scanner-canvas" style={{ display: 'none' }} />
        {cameraActive.value && (
          <div class="scanner-overlay">
            <div class="scanner-crosshair" />
            {scanStatus.value && (
              <div style={{
                position: 'absolute', bottom: '16px', left: 0, right: 0,
                textAlign: 'center', color: '#fff', fontSize: '1rem',
                background: 'rgba(0,0,0,0.6)', padding: '8px',
              }}>
                {scanStatus.value}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Capture button — big and prominent */}
      {cameraActive.value && (
        <button
          class="btn btn-primary btn-block"
          style={{ marginBottom: '12px', fontSize: '1.25rem', minHeight: '64px' }}
          onClick={captureAndDecode}
        >
          Foto aufnehmen
        </button>
      )}

      {error.value && (
        <div class="error-msg">{error.value}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
        <button class="btn btn-secondary btn-block" onClick={loadDemo}>
          Demo-Daten laden
        </button>
        <a href="#/history" class="btn btn-secondary btn-block">
          Verlauf anzeigen
        </a>
      </div>
    </div>
  );
}

async function openCamera() {
  error.value = null;
  scanStatus.value = '';

  try {
    // Request high resolution — important for dense DataMatrix
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 3840 },
        height: { ideal: 2160 },
      },
    });

    const videoEl = document.getElementById('scanner-video') as HTMLVideoElement;
    videoEl.srcObject = videoStream;
    await videoEl.play();
    cameraActive.value = true;

    const track = videoStream.getVideoTracks()[0];
    const settings = track.getSettings();
    scanStatus.value = `Kamera bereit (${settings.width}x${settings.height})`;
    setTimeout(() => { if (scanStatus.value.startsWith('Kamera bereit')) scanStatus.value = ''; }, 2000);
  } catch (e: any) {
    if (e.name === 'NotAllowedError') {
      error.value = 'Kamerazugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Einstellungen.';
    } else if (e.name === 'NotFoundError' || e.name === 'NotReadableError') {
      error.value = 'Keine Kamera gefunden oder Kamera wird von einer anderen App verwendet.';
    } else {
      error.value = `Kamera-Fehler: ${e.message}`;
    }
  }
}

async function captureAndDecode() {
  error.value = null;
  scanStatus.value = 'Foto wird aufgenommen...';

  const videoEl = document.getElementById('scanner-video') as HTMLVideoElement;
  const canvas = document.getElementById('scanner-canvas') as HTMLCanvasElement;

  // Capture at full video resolution
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(videoEl, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  scanStatus.value = `Analysiere Bild (${canvas.width}x${canvas.height})...`;

  try {
    const { readBarcodes } = await import('zxing-wasm/reader');

    const results = await readBarcodes(imageData, {
      formats: ['DataMatrix'],
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      tryDownscale: true,
      maxNumberOfSymbols: 1,
    });

    const valid = results.find((r) => r.isValid);

    if (!valid) {
      scanStatus.value = '';
      const errMsg = results.length > 0 ? ` (${results[0].error})` : '';
      error.value = `Kein DataMatrix-Code im Bild erkannt${errMsg}. Tipps: Nur den Barcode anvisieren, gutes Licht, Kamera ruhig halten.`;
      return;
    }

    scanStatus.value = 'Code erkannt! Verarbeite...';
    stopCamera();

    // zxing-wasm gives us raw bytes — decode as ISO 8859-1
    const text = valid.text;
    const bmp = parseDataMatrixString(text);

    // Enrich medications that only have PZN (no brand name)
    scanStatus.value = 'Medikamentennamen werden aufgelöst...';
    const enriched = await enrichBmpMedications(bmp.sections);
    if (enriched > 0) {
      scanStatus.value = `${enriched} Medikament${enriched > 1 ? 'e' : ''} aufgelöst!`;
    }

    const xml = text.slice(text.indexOf('<MP'));
    const id = await saveBmp(xml, bmp);
    scanStatus.value = '';
    navigate(`/plan/${id}`);
  } catch (e: any) {
    scanStatus.value = '';
    error.value = `Fehler: ${e.message || String(e)}`;
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach((t) => t.stop());
    videoStream = null;
  }
  cameraActive.value = false;
}

const DEMO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<MP v="025" U="20250514112900DEMOKLINIK000001" l="de">
  <P g="Max" f="Mustermann" b="19550315" s="M"/>
  <A n="Musterklinik, Innere Medizin" s="Musterstr. 1" z="12345" c="Musterstadt" p="0123 456789" t="20250514112900"/>
  <O w="75" h="173"/>
  <S c="411">
    <M a="Pantoprazol - 1A Pharma 40 mg magensaftresistent" f="TAB" m="1" d="0" v="0" h="0" e="Tbl">
      <W w="Pantoprazol" s="40 mg"/>
    </M>
    <M a="Forxiga 10 mg Filmtabletten - OP28" f="TAB" m="1" d="0" v="0" h="0" e="Tbl">
      <W w="Dapagliflozin" s="10 mg"/>
    </M>
    <M a="Clopidogrel STADA 75 mg Filmtabletten" f="TAB" m="1" d="0" v="0" h="0" e="Tbl">
      <W w="Clopidogrel" s="75 mg"/>
    </M>
    <M a="ASS 100 HEXAL" f="TAB" m="1" d="0" v="0" h="0" e="Tbl">
      <W w="Acetylsalicylsäure" s="100 mg"/>
    </M>
    <M a="Ferro sanol duodenal 100mg Hartkapseln" f="KAP" m="1" d="0" v="0" h="0" e="Kps">
      <W w="Eisen(II)-Ion" s="100 mg"/>
    </M>
    <M a="Natrilix" f="TAB" m="1" d="0" v="0" h="0" e="Tbl">
      <W w="Indapamid" s="2,5 mg"/>
    </M>
    <M a="BisoHEXAL 2,5 mg Filmtabletten" f="TAB" m="1" d="0" v="0" h="0" e="Tbl">
      <W w="Bisoprololfumarat" s="2,5 mg"/>
    </M>
    <M a="Lercanidipin Puren 10 mg Filmtabletten" f="TAB" m="1" d="0" v="0" h="0" e="Tbl">
      <W w="Lercanidipin" s="9,4 mg"/>
    </M>
    <M a="Atorvastatin HEXAL 20 mg Filmtabletten" f="TAB" m="0" d="0" v="1" h="0" e="Tbl">
      <W w="Atorvastatin" s="20 mg"/>
    </M>
    <M a="Kabi 4 g/0,5 g Pulver zur Infusion" f="INF" m="4,5" d="4,5" v="4,5" h="4,5" e="g" r="postoperative Infektion, unklare Genese" i="Enddatum: 17.05.2025">
      <W w="Piperacillin" s="4 g"/>
      <W w="Tazobactam" s="0,5 g"/>
    </M>
  </S>
  <S c="412">
    <M a="Tilidin HEXAL comp 50/4 mg Retardtabletten" f="TAB" du="Bedarfsmedikation: Schmerzen; 1 Tbl je Einnahme Maximum je 24 h: 2 Tbl" e="Tbl">
      <W w="Tilidin" s="44,1 mg"/>
      <W w="Naloxonhydrochlorid" s="4 mg"/>
    </M>
  </S>
</MP>`;

async function loadDemo() {
  try {
    stopCamera();
    const bmp = parseUkfXml(DEMO_XML);
    const id = await saveBmp(DEMO_XML, bmp);
    navigate(`/plan/${id}`);
  } catch (e: any) {
    error.value = `Fehler: ${e.message}`;
  }
}
