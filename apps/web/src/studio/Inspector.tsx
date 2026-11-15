import {
  WIDGETS,
  WIDGET_HAS_SETTINGS,
  WIDGET_SIZE_DEFINITIONS,
  type DashboardTheme,
  type LayoutDefinition,
  type SlotAssignment,
  type WidgetId
} from '@inked/commons';

import { ChevronIcon } from '../icons';
import { WidgetSettingsEditor } from '../settings/WidgetSettingsEditor';
import { WidgetPicker } from './WidgetPicker';

/** The right rail: the selected panel, its widget, and that widget's options. */
export function Inspector({
  accent,
  layout,
  selectedSlot,
  assignment,
  onStep,
  onFillEmpty,
  onClear,
  onAssign,
  onSettingsChange
}: {
  accent: DashboardTheme['accent'];
  layout: LayoutDefinition;
  selectedSlot: string;
  assignment: SlotAssignment | undefined;
  onStep: (offset: number) => void;
  onFillEmpty: () => void;
  onClear: () => void;
  onAssign: (widgetId: WidgetId) => void;
  onSettingsChange: (patch: Record<string, unknown>) => void;
}) {
  const slot = layout.slots.find((candidate) => candidate.id === selectedSlot);
  const slotIndex = Math.max(
    0,
    layout.slots.findIndex((candidate) => candidate.id === selectedSlot)
  );
  const size = slot ? WIDGET_SIZE_DEFINITIONS[slot.size] : null;
  const widgetName = assignment
    ? (WIDGETS.find((widget) => widget.id === assignment.widgetId)?.name ?? 'Widget')
    : null;

  return (
    <aside className={`rail rail--inspect accent--${accent}`}>
      <div className="inspector-head">
        <div className="inspector-title">
          <span className="eyebrow">
            Panel {slotIndex + 1} of {layout.slots.length}
          </span>
          <h2>{slot?.label ?? 'Panel'}</h2>
          <p>{size ? `${size.name} · ${size.gridColumns}×${size.gridRows}` : ''}</p>
        </div>
        <div className="inspector-stepper" role="group" aria-label="Move between panels">
          <button
            type="button"
            className="stepper-prev"
            aria-label="Previous panel"
            onClick={() => onStep(-1)}
          >
            <ChevronIcon />
          </button>
          <button type="button" aria-label="Next panel" onClick={() => onStep(1)}>
            <ChevronIcon />
          </button>
        </div>
      </div>

      <div className="inspector-actions">
        <button type="button" onClick={onFillEmpty}>
          Fill empty panels
        </button>
        <button type="button" onClick={onClear} disabled={!assignment}>
          Clear panel
        </button>
      </div>

      <div className="rail-subhead">Widget</div>
      <WidgetPicker
        size={slot?.size ?? 'small'}
        selectedId={assignment?.widgetId}
        onSelect={onAssign}
      />

      {assignment && (
        <div className="inspector-options">
          <div className="rail-subhead">Options</div>
          {WIDGET_HAS_SETTINGS[assignment.widgetId] ? (
            <WidgetSettingsEditor assignment={assignment} onChange={onSettingsChange} />
          ) : (
            <p className="options-empty">{widgetName} reads live data — nothing to set.</p>
          )}
        </div>
      )}
    </aside>
  );
}
