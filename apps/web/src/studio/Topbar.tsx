import type { ComponentProps } from 'react';

import { DownloadIcon, PaintIcon } from '../icons';
import { CompositionMenu } from './CompositionMenu';
import type { Status } from './types';

/** Brand, composition controls, status, and the save/export actions. */
export function Topbar({
  composition,
  status,
  exportReady,
  onDownloadBmp,
  onSave,
  onPaint
}: {
  composition: ComponentProps<typeof CompositionMenu>;
  status: Status;
  exportReady: boolean;
  onDownloadBmp: () => Promise<void>;
  onSave: () => Promise<void>;
  onPaint: () => Promise<void>;
}) {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Inked home">
        <span className="brand-mark">I</span>
        <span>INKED</span>
      </a>

      <CompositionMenu {...composition} />

      <div className="topbar-actions">
        <div className={`status status--${status.kind}`}>
          <i />
          {status.message}
        </div>
        <a className="button button--ghost button--icon" href="/widgets" title="Widget gallery">
          Widgets
        </a>
        <a className="button button--ghost button--icon" href="/font-test" title="Font calibration">
          Fonts
        </a>
        <span className="topbar-divider" />
        <button
          type="button"
          className="button button--ghost"
          disabled={!exportReady}
          onClick={() => {
            void onDownloadBmp();
          }}
          title="Download the previewed BMP"
        >
          <DownloadIcon />
          BMP
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => {
            void onSave();
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={!exportReady}
          onClick={() => {
            void onPaint();
          }}
        >
          <PaintIcon />
          Paint display
        </button>
      </div>
    </header>
  );
}
