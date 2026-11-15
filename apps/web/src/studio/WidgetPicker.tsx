import { WIDGETS, formatRefreshPolicy, type WidgetId, type WidgetSize } from '@inked/commons';

import { CheckIcon } from '../icons';
import { WidgetIcon } from '../widgets';

/** Every widget, described by the content plan it would use at this slot's size. */
export function WidgetPicker({
  size,
  selectedId,
  onSelect
}: {
  size: WidgetSize;
  selectedId: WidgetId | undefined;
  onSelect: (widgetId: WidgetId) => void;
}) {
  return (
    <div className="widget-list">
      {WIDGETS.map((widget) => {
        const variant = widget.variants[size];
        return (
          <button
            type="button"
            key={widget.id}
            className={`widget-option ${selectedId === widget.id ? 'is-selected' : ''}`}
            onClick={() => onSelect(widget.id)}
          >
            <span className="widget-option-icon">
              <WidgetIcon id={widget.id} />
            </span>
            <span className="widget-option-copy">
              <strong>
                {widget.name}
                <em>{formatRefreshPolicy(widget.refresh)}</em>
              </strong>
              <small>
                {variant.name} · {variant.summary}
              </small>
            </span>
            <span className="selection-dot">{selectedId === widget.id && <CheckIcon />}</span>
          </button>
        );
      })}
    </div>
  );
}
