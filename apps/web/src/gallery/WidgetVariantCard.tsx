import {
  SPORTS_PREVIEW_PRESETS,
  WIDGET_SIZE_DEFINITIONS,
  WIDGETS,
  type SportsPreviewPresetId,
  type WidgetId,
  type WidgetLayoutVariant,
  type WidgetSize
} from '@inked/commons';

/** One native PNG preview at an exact layout geometry, with where that geometry is used. */
export function WidgetVariantCard({
  widgetId,
  size,
  variant,
  sportsPreset
}: {
  widgetId: WidgetId;
  size: WidgetSize;
  variant: WidgetLayoutVariant;
  sportsPreset?: SportsPreviewPresetId;
}) {
  const definition = WIDGET_SIZE_DEFINITIONS[size];
  const widget = WIDGETS.find((candidate) => candidate.id === widgetId) ?? WIDGETS[0];
  const content = widget.variants[size];
  const preset = SPORTS_PREVIEW_PRESETS.find((candidate) => candidate.id === sportsPreset);

  return (
    <article className="widget-variant-card">
      <header>
        <div>
          <div>
            <h4>
              {variant.width} × {variant.height}px
            </h4>
            <p>{content.name}</p>
          </div>
        </div>
        <div className="widget-preview-meta">
          {preset && <span className="widget-preview-preset">{preset.name}</span>}
          <span className="widget-pixel-size">Native PNG</span>
        </div>
      </header>
      <div className={`widget-variant-preview widget-variant-preview--${size}`}>
        <img
          key={`${widgetId}-${variant.id}`}
          src={`/api/widgets/${widgetId}/${variant.id}/preview${sportsPreset ? `?preset=${sportsPreset}` : ''}`}
          width={variant.width}
          height={variant.height}
          alt={`${widget.name} ${definition.name} preview at ${variant.width} by ${variant.height} pixels`}
        />
      </div>
      <footer>
        <p>{content.summary}</p>
        <div className="widget-variant-usages">
          <span className="eyebrow">Used in</span>
          <ul>
            {variant.usages.map((usage) => (
              <li key={`${usage.layoutId}-${usage.slotId}`}>
                <strong>{usage.layoutName}</strong>
                <span>{usage.slotLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </article>
  );
}
