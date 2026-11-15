import {
  SPORTS_PREVIEW_PRESETS,
  WIDGET_LAYOUT_VARIANTS,
  WIDGET_SIZE_DEFINITIONS,
  type WidgetDefinition,
  type WidgetSize
} from '@inked/commons';

import type { SportsPreviewMode } from './gallery-url';
import { WidgetVariantCard } from './WidgetVariantCard';

/** Every layout geometry of one placement size, rendered for the selected widget. */
export function WidgetSizeGroup({
  widget,
  size,
  sportsPreviewMode
}: {
  widget: WidgetDefinition;
  size: WidgetSize;
  sportsPreviewMode: SportsPreviewMode;
}) {
  const definition = WIDGET_SIZE_DEFINITIONS[size];
  const variants = WIDGET_LAYOUT_VARIANTS.filter((variant) => variant.size === size);
  const slotCount = variants.reduce((total, variant) => total + variant.usages.length, 0);
  const content = widget.variants[size];

  return (
    <section className="widget-size-group">
      <header className="widget-size-group-heading">
        <div className="widget-size-group-title">
          <span className="widget-size-badge">
            {definition.gridColumns} × {definition.gridRows}
          </span>
          <div>
            <h3>{definition.name}</h3>
            <p>{definition.description}</p>
          </div>
        </div>
        <div className="widget-size-group-meta">
          <strong>{content.name}</strong>
          <span>
            {variants.length} {variants.length === 1 ? 'geometry' : 'geometries'} · {slotCount}{' '}
            {slotCount === 1 ? 'slot' : 'slots'}
          </span>
        </div>
      </header>
      <div className={`widget-layout-variant-grid widget-layout-variant-grid--${size}`}>
        {variants.map((variant, index) => (
          <WidgetVariantCard
            key={variant.id}
            widgetId={widget.id}
            size={size}
            variant={variant}
            {...(widget.id === 'scores'
              ? {
                  sportsPreset:
                    sportsPreviewMode === 'variety'
                      ? SPORTS_PREVIEW_PRESETS[index % SPORTS_PREVIEW_PRESETS.length]!.id
                      : sportsPreviewMode
                }
              : {})}
          />
        ))}
      </div>
    </section>
  );
}
