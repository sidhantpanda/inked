import type { DashboardTheme } from '@inked/commons';

import type { PreviewState } from './types';

const BACKGROUNDS = ['paper', 'mist', 'night'] as const;
const ACCENTS = ['citrus', 'coral', 'cobalt'] as const;

/** Canvas and ink pickers, plus the display size and preview freshness. */
export function CanvasToolbar({
  theme,
  previewState,
  previewMatchesConfig,
  onThemeChange
}: {
  theme: DashboardTheme;
  previewState: PreviewState;
  previewMatchesConfig: boolean;
  onThemeChange: (theme: Partial<DashboardTheme>) => void;
}) {
  return (
    <div className="canvas-toolbar">
      <div className="canvas-theme">
        <span className="control-label">Canvas</span>
        <div className="theme-row">
          {BACKGROUNDS.map((background) => (
            <button
              type="button"
              key={background}
              aria-label={`${background} canvas`}
              aria-pressed={theme.background === background}
              title={`${background} canvas`}
              className={`theme-swatch theme-swatch--${background} ${theme.background === background ? 'is-selected' : ''}`}
              onClick={() => onThemeChange({ background })}
            />
          ))}
        </div>
        <span className="canvas-theme-divider" />
        <span className="control-label">Ink</span>
        <div className="theme-row">
          {ACCENTS.map((accent) => (
            <button
              type="button"
              key={accent}
              aria-label={`${accent} accent`}
              aria-pressed={theme.accent === accent}
              title={`${accent} accent`}
              className={`accent-swatch accent-swatch--${accent} ${theme.accent === accent ? 'is-selected' : ''}`}
              onClick={() => onThemeChange({ accent })}
            />
          ))}
        </div>
      </div>
      <div className="canvas-meta">
        <span>800 × 480</span>
        <span
          className={`canvas-live canvas-live--${previewMatchesConfig && previewState === 'ready' ? 'ready' : previewState}`}
        >
          {previewState === 'error'
            ? 'Preview error'
            : previewMatchesConfig && previewState === 'ready'
              ? 'Live BMP'
              : 'Rendering…'}
        </span>
      </div>
    </div>
  );
}
