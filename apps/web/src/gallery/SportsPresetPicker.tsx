import { SPORTS_PREVIEW_PRESETS } from '@inked/commons';

import type { SportsPreviewMode } from './gallery-url';

/** Chooses which sport the Sports previews show. */
export function SportsPresetPicker({
  mode,
  onSelect
}: {
  mode: SportsPreviewMode;
  onSelect: (mode: SportsPreviewMode) => void;
}) {
  return (
    <section className="sports-preview-configs" aria-labelledby="sports-preview-heading">
      <div>
        <span className="eyebrow">Preview configurations</span>
        <h3 id="sports-preview-heading">Test different sports</h3>
        <p>
          Variety rotates sports across every size. Choose one preset to compare the same sport
          across all geometries.
        </p>
      </div>
      <div className="sports-preview-config-list">
        <button
          type="button"
          className={mode === 'variety' ? 'is-selected' : ''}
          aria-pressed={mode === 'variety'}
          onClick={() => onSelect('variety')}
        >
          <strong>Variety</strong>
          <span>All sports</span>
        </button>
        {SPORTS_PREVIEW_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={mode === preset.id ? 'is-selected' : ''}
            aria-pressed={mode === preset.id}
            onClick={() => onSelect(preset.id)}
          >
            <strong>{preset.name}</strong>
            <span>{preset.sport}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
