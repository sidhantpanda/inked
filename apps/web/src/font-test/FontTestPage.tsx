import { useState } from 'react';

import type { PaintResponse } from '@inked/commons';

import { DownloadIcon, PaintIcon } from '../icons';

interface Status {
  kind: 'idle' | 'working' | 'success' | 'error';
  message: string;
}

export function FontTestPage() {
  const [status, setStatus] = useState<Status>({
    kind: 'idle',
    message: 'Calibration image ready'
  });

  async function downloadBmp() {
    setStatus({ kind: 'working', message: 'Preparing calibration BMP…' });
    try {
      const response = await fetch('/api/font-test/render?format=bmp');
      if (!response.ok) throw new Error('Could not render the calibration BMP');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inked-font-test.bmp';
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'success', message: 'Calibration BMP downloaded' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function paintFontTest() {
    setStatus({ kind: 'working', message: 'Sending calibration image to Photo Painter…' });
    try {
      const response = await fetch('/api/font-test/paint', { method: 'POST' });
      const result = (await response.json()) as PaintResponse & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Photo Painter rejected the image');
      setStatus({
        kind: 'success',
        message: result.message ?? `Painted ${Math.round(result.bytes / 1024)} KB`
      });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  return (
    <main className="font-test-page">
      <header className="topbar font-test-topbar">
        <a className="brand" href="/" aria-label="Back to Inked studio">
          <span className="brand-mark">I</span>
          <span>INKED</span>
        </a>
        <div className="display-identity">
          <span className="eyebrow">Display calibration</span>
          <strong>Font visibility test</strong>
        </div>
        <div className="topbar-actions">
          <div className={`status status--${status.kind}`}>
            <i />
            {status.message}
          </div>
          <a className="button button--ghost" href="/widgets">
            Widgets
          </a>
          <a className="button button--ghost" href="/">
            Back to studio
          </a>
          <button type="button" className="button button--ghost" onClick={() => void downloadBmp()}>
            <DownloadIcon />
            Download BMP
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void paintFontTest()}
          >
            <PaintIcon />
            Paint font test
          </button>
        </div>
      </header>

      <section className="font-test-main">
        <div className="font-test-heading">
          <div>
            <span className="eyebrow">800 × 480 · Inked Sans regular · black on white</span>
            <h1>Find the smallest readable type</h1>
          </div>
          <p>
            Read the physical e-ink display from your normal viewing distance. The first comfortably
            readable cell is the minimum font size to use for widget content.
          </p>
        </div>

        <div className="font-test-frame">
          <img
            src="/api/font-test/render?format=png"
            width="800"
            height="480"
            alt="Twelve-cell font calibration grid with text increasing from Size 6 to Size 28"
          />
        </div>

        <div className="font-test-notes">
          <div>
            <strong>12 samples</strong>
            <span>6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, and 28px</span>
          </div>
          <div>
            <strong>Exact output</strong>
            <span>The preview and Photo Painter BMP come from the same native canvas.</span>
          </div>
          <div>
            <strong>Reading order</strong>
            <span>Sizes increase left to right, then top to bottom.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
