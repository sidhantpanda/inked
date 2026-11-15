import { useState } from 'react';

import {
  WIDGET_LAYOUT_VARIANTS,
  WIDGET_SIZES,
  WIDGETS,
  formatRefreshPolicy,
  type WidgetId
} from '@inked/commons';

import { WidgetIcon } from '../widgets';
import {
  initialSportsPreviewMode,
  initialWidgetId,
  updateGalleryUrl,
  type SportsPreviewMode
} from './gallery-url';
import { SportsPresetPicker } from './SportsPresetPicker';
import { WidgetSizeGroup } from './WidgetSizeGroup';

/** Every widget at every real layout geometry, rendered natively by the server. */
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
            <SportsPresetPicker mode={sportsPreviewMode} onSelect={selectSportsPreviewMode} />
          )}

          <div className="widget-size-groups">
            {WIDGET_SIZES.map((size) => (
              <WidgetSizeGroup
                key={size}
                widget={selectedWidget}
                size={size}
                sportsPreviewMode={sportsPreviewMode}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
