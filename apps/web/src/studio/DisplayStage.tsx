import { WIDGETS, type DashboardConfig, type LayoutDefinition } from '@inked/commons';

import { ChevronIcon } from '../icons';
import type { PreviewState, RenderedPreview } from './types';

/** The rendered display with a clickable editing outline over each slot. */
export function DisplayStage({
  config,
  layout,
  preview,
  previewState,
  previewMatchesConfig,
  selectedSlot,
  onSelectSlot
}: {
  config: DashboardConfig;
  layout: LayoutDefinition;
  preview: RenderedPreview | null;
  previewState: PreviewState;
  previewMatchesConfig: boolean;
  selectedSlot: string;
  onSelectSlot: (slotId: string) => void;
}) {
  return (
    <div className="display-stage">
      <div className="display-shadow" />
      <div
        className={`display display--${config.theme.background} accent--${config.theme.accent}`}
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`
        }}
      >
        {preview && (
          <img
            className="display-preview"
            src={preview.url}
            alt={`${layout.name} PhotoPainter output preview`}
          />
        )}
        {(!previewMatchesConfig || previewState !== 'ready') && (
          <div className={`display-preview-status display-preview-status--${previewState}`}>
            {previewState === 'error' ? 'Preview unavailable' : 'Rendering exact BMP preview…'}
          </div>
        )}
        {layout.slots.map((slot, index) => {
          const assignment = config.assignments.find((candidate) => candidate.slotId === slot.id);
          return (
            <button
              type="button"
              key={slot.id}
              className={`slot ${slot.id === selectedSlot ? 'is-selected' : ''}`}
              style={{
                gridColumn: `${slot.column} / span ${slot.columnSpan}`,
                gridRow: `${slot.row} / span ${slot.rowSpan}`
              }}
              onClick={() => onSelectSlot(slot.id)}
              aria-label={`Edit ${slot.label}${assignment ? `, ${WIDGETS.find((widget) => widget.id === assignment.widgetId)?.name}` : ', empty'}`}
            >
              <span className="slot-index">{index + 1}</span>
              <span className="slot-edit">
                Edit <ChevronIcon />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
