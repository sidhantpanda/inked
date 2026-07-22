import { useState } from 'react';

import {
  SPORTS_PREVIEW_PRESETS,
  WIDGET_LAYOUT_VARIANTS,
  WIDGET_SIZES,
  WIDGET_SIZE_DEFINITIONS,
  WIDGETS,
  formatRefreshPolicy,
  isSportsPreviewPresetId,
  type WidgetId,
  type WidgetLayoutVariant,
  type WidgetSize,
  type SportsPreviewPresetId
} from '@inked/commons';

import { WidgetIcon } from './widgets';

function initialWidgetId(): WidgetId {
  const requested = new URLSearchParams(window.location.search).get('widget');
  return WIDGETS.find((widget) => widget.id === requested)?.id ?? WIDGETS[0].id;
}

type SportsPreviewMode = 'variety' | SportsPreviewPresetId;

function initialSportsPreviewMode(): SportsPreviewMode {
  const requested = new URLSearchParams(window.location.search).get('preset');
  return isSportsPreviewPresetId(requested) ? requested : 'variety';
}

export function WidgetsPage() {
  const [selectedId, setSelectedId] = useState<WidgetId>(initialWidgetId);
  const [sportsPreviewMode, setSportsPreviewMode] =
    useState<SportsPreviewMode>(initialSportsPreviewMode);
  const selectedWidget = WIDGETS.find((widget) => widget.id === selectedId) ?? WIDGETS[0];
  const layoutSlotCount = WIDGET_LAYOUT_VARIANTS.reduce(
    (total, variant) => total + variant.usages.length,
    0
  );

  function selectWidget(widgetId: WidgetId) {
    setSelectedId(widgetId);
    updateGalleryUrl(widgetId, sportsPreviewMode);
  }

  function selectSportsPreviewMode(mode: SportsPreviewMode) {
    setSportsPreviewMode(mode);
    updateGalleryUrl('scores', mode);
  }

  return (
    <main className="widgets-page">
      <header className="topbar widgets-topbar">
        <a className="brand" href="/" aria-label="Back to Inked studio">
          <span className="brand-mark">I</span>
          <span>INKED</span>
        </a>
        <div className="display-identity">
          <span className="eyebrow">Widget gallery</span>
          <strong>All responsive variants</strong>
        </div>
        <div className="topbar-actions">
          <a className="button button--ghost" href="/font-test">
            Font test
          </a>
          <a className="button button--primary" href="/">
            Back to studio
          </a>
        </div>
      </header>

      <div className="widgets-workspace">
        <aside className="widgets-sidebar">
          <div className="widgets-sidebar-heading">
            <span className="step">01</span>
            <div>
              <span className="eyebrow">Library</span>
              <h1>Choose a widget</h1>
            </div>
          </div>
          <p>Inspect every real layout geometry using live server data and native rendering.</p>
          <nav className="widgets-sidebar-list" aria-label="Widget library">
            {WIDGETS.map((widget) => (
              <button
                type="button"
                key={widget.id}
                className={widget.id === selectedId ? 'is-selected' : ''}
                aria-pressed={widget.id === selectedId}
                onClick={() => selectWidget(widget.id)}
              >
                <span className="widgets-sidebar-icon">
                  <WidgetIcon id={widget.id} />
                </span>
                <span>
                  <strong>{widget.name}</strong>
                  <small>{formatRefreshPolicy(widget.refresh)}</small>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="widgets-gallery">
          <header className="widgets-gallery-heading">
            <div>
              <span className="eyebrow">Complete layout coverage</span>
              <h2>{selectedWidget.name}</h2>
              <p>{selectedWidget.description}</p>
            </div>
            <div className="widgets-gallery-summary">
              <span>{WIDGET_LAYOUT_VARIANTS.length} geometries</span>
              <span>{layoutSlotCount} layout slots</span>
              <span>{selectedWidget.supportedSizes.length} content sizes</span>
              <span>{formatRefreshPolicy(selectedWidget.refresh)}</span>
            </div>
          </header>

          {selectedId === 'scores' && (
            <section className="sports-preview-configs" aria-labelledby="sports-preview-heading">
              <div>
                <span className="eyebrow">Preview configurations</span>
                <h3 id="sports-preview-heading">Test different sports</h3>
                <p>
                  Variety rotates sports across every size. Choose one preset to compare the same
                  sport across all geometries.
                </p>
              </div>
              <div className="sports-preview-config-list">
                <button
                  type="button"
                  className={sportsPreviewMode === 'variety' ? 'is-selected' : ''}
                  aria-pressed={sportsPreviewMode === 'variety'}
                  onClick={() => selectSportsPreviewMode('variety')}
                >
                  <strong>Variety</strong>
                  <span>All sports</span>
                </button>
                {SPORTS_PREVIEW_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className={sportsPreviewMode === preset.id ? 'is-selected' : ''}
                    aria-pressed={sportsPreviewMode === preset.id}
                    onClick={() => selectSportsPreviewMode(preset.id)}
                  >
                    <strong>{preset.name}</strong>
                    <span>{preset.sport}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="widget-size-groups">
            {WIDGET_SIZES.map((size) => {
              const definition = WIDGET_SIZE_DEFINITIONS[size];
              const variants = WIDGET_LAYOUT_VARIANTS.filter((variant) => variant.size === size);
              const slotCount = variants.reduce(
                (total, variant) => total + variant.usages.length,
                0
              );
              const content = selectedWidget.variants[size];

              return (
                <section className="widget-size-group" key={size}>
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
                        {variants.length} {variants.length === 1 ? 'geometry' : 'geometries'} ·{' '}
                        {slotCount} {slotCount === 1 ? 'slot' : 'slots'}
                      </span>
                    </div>
                  </header>
                  <div className={`widget-layout-variant-grid widget-layout-variant-grid--${size}`}>
                    {variants.map((variant, index) => (
                      <WidgetVariantCard
                        key={variant.id}
                        widgetId={selectedWidget.id}
                        size={size}
                        variant={variant}
                        {...(selectedWidget.id === 'scores'
                          ? {
                              sportsPreset:
                                sportsPreviewMode === 'variety'
                                  ? SPORTS_PREVIEW_PRESETS[index % SPORTS_PREVIEW_PRESETS.length]!
                                      .id
                                  : sportsPreviewMode
                            }
                          : {})}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function updateGalleryUrl(widgetId: WidgetId, sportsPreviewMode: SportsPreviewMode) {
  const parameters = new URLSearchParams({ widget: widgetId });
  if (widgetId === 'scores' && sportsPreviewMode !== 'variety') {
    parameters.set('preset', sportsPreviewMode);
  }
  window.history.replaceState(null, '', `/widgets?${parameters.toString()}`);
}

function WidgetVariantCard({
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
