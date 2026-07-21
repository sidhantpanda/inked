import { useEffect, useMemo, useRef, useState } from 'react';

import {
  LAYOUTS,
  WIDGETS,
  WIDGET_HAS_SETTINGS,
  WIDGET_SIZE_DEFINITIONS,
  buildDashboardRefreshPlan,
  createAssignment,
  createDefaultDashboard,
  defaultAssignments,
  formatRefreshPolicy,
  getLayout,
  type DashboardConfig,
  type DashboardResponse,
  type LayoutDefinition,
  type PaintResponse,
  type SlotAssignment,
  type WidgetId
} from '@inked/commons';

import { CalendarSettings } from './CalendarSettings';
import { CheckIcon, ChevronIcon, DownloadIcon, PaintIcon } from './icons';
import { WeatherSettings } from './WeatherSettings';
import { WidgetIcon } from './widgets';

interface DashboardSummary {
  id: string;
  name: string;
  layoutId: string;
  updatedAt: string;
  active: boolean;
}

/** The widget-specific option editors shown for the selected panel. */
function WidgetSettingsEditor({
  assignment,
  onChange
}: {
  assignment: SlotAssignment;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  if (assignment.widgetId === 'weather') {
    return <WeatherSettings settings={assignment.settings} onChange={onChange} />;
  }
  if (assignment.widgetId === 'calendar') {
    return <CalendarSettings settings={assignment.settings} onChange={onChange} />;
  }
  if (assignment.widgetId === 'message') {
    return (
      <>
        <label className="settings-field">
          <span>Eyebrow</span>
          <input
            type="text"
            value={assignment.settings.eyebrow}
            onChange={(event) => onChange({ eyebrow: event.target.value })}
          />
        </label>
        <label className="settings-field">
          <span>Headline</span>
          <textarea
            rows={2}
            value={assignment.settings.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </label>
        <label className="settings-field">
          <span>Detail</span>
          <input
            type="text"
            value={assignment.settings.detail}
            onChange={(event) => onChange({ detail: event.target.value })}
          />
        </label>
      </>
    );
  }
  return null;
}

interface Status {
  kind: 'idle' | 'working' | 'success' | 'error';
  message: string;
}
interface RenderedPreview {
  configSignature: string;
  renderToken: string;
  url: string;
}
type LayoutFilter = 'all' | 'focused' | 'dense';

export function App() {
  const [config, setConfig] = useState<DashboardConfig>(createDefaultDashboard());
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [compositionsOpen, setCompositionsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('feature');
  const [layoutFilter, setLayoutFilter] = useState<LayoutFilter>('all');
  const [status, setStatus] = useState<Status>({ kind: 'idle', message: 'Ready to compose' });
  const [preview, setPreview] = useState<RenderedPreview | null>(null);
  const [previewState, setPreviewState] = useState<'rendering' | 'ready' | 'error'>('rendering');
  const previewUrlRef = useRef<string | null>(null);
  const layout = useMemo(() => getLayout(config.layoutId), [config.layoutId]);
  const configSignature = useMemo(() => JSON.stringify(config), [config]);
  const previewMatchesConfig = preview?.configSignature === configSignature;
  const refreshPlan = useMemo(() => buildDashboardRefreshPlan(config, WIDGETS), [config]);
  const filteredLayouts = useMemo(
    () =>
      LAYOUTS.filter((candidate) => {
        if (layoutFilter === 'focused') return candidate.slots.length <= 4;
        if (layoutFilter === 'dense') return candidate.slots.length >= 5;
        return true;
      }),
    [layoutFilter]
  );

  function refreshDashboards() {
    void fetch('/api/dashboards')
      .then((response) => (response.ok ? response.json() : { dashboards: [] }))
      .then((result: { dashboards?: DashboardSummary[] }) => setDashboards(result.dashboards ?? []))
      .catch(() => setDashboards([]));
  }

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async (response) => {
        if (!response.ok) throw new Error('Server unavailable');
        return response.json() as Promise<DashboardResponse>;
      })
      .then((response) => {
        setConfig(response.config);
        setSelectedSlot(getLayout(response.config.layoutId).slots[0]?.id ?? '');
        refreshDashboards();
      })
      .catch(() => setStatus({ kind: 'error', message: 'Preview mode · server offline' }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPreviewState('rendering');
      void fetch('/api/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: configSignature,
        signal: controller.signal
      })
        .then(async (response) => {
          if (!response.ok) throw new Error('Could not render display preview');
          const renderToken = response.headers.get('x-inked-render-token');
          if (!renderToken) throw new Error('Preview is missing its render token');
          return { renderToken, blob: await response.blob() };
        })
        .then(({ renderToken, blob }) => {
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = url;
          setPreview({ configSignature, renderToken, url });
          setPreviewState('ready');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setPreviewState('error');
          setStatus({ kind: 'error', message: (error as Error).message });
        });
    }, 120);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [configSignature]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  function chooseLayout(next: LayoutDefinition) {
    if (next.id === layout.id) return;
    setConfig((current) => {
      const currentLayout = getLayout(current.layoutId);
      const currentAssignments = currentLayout.slots
        .map((slot) => current.assignments.find((assignment) => assignment.slotId === slot.id))
        .filter((assignment): assignment is SlotAssignment => Boolean(assignment));
      const defaults = defaultAssignments(next.id);

      return {
        ...current,
        layoutId: next.id,
        assignments: next.slots.map((slot, index) => {
          const carried = currentAssignments[index];
          return carried ? { ...carried, slotId: slot.id } : defaults[index]!;
        })
      };
    });
    setSelectedSlot(next.slots[0]?.id ?? '');
    setStatus({ kind: 'idle', message: 'Layout changed · widgets preserved' });
  }

  function assignWidget(widgetId: WidgetId) {
    setConfig((current) => {
      const existing = current.assignments.find((assignment) => assignment.slotId === selectedSlot);
      // Keep the settings when re-selecting the same widget; reset otherwise.
      const next =
        existing?.widgetId === widgetId ? existing : createAssignment(selectedSlot, widgetId);
      return {
        ...current,
        assignments: [
          ...current.assignments.filter((assignment) => assignment.slotId !== selectedSlot),
          next
        ]
      };
    });
    setStatus({ kind: 'idle', message: 'Unsaved changes' });
  }

  function updateSelectedSettings(patch: Record<string, unknown>) {
    setConfig((current) => ({
      ...current,
      assignments: current.assignments.map((assignment) =>
        assignment.slotId === selectedSlot
          ? ({ ...assignment, settings: { ...assignment.settings, ...patch } } as SlotAssignment)
          : assignment
      )
    }));
    setStatus({ kind: 'idle', message: 'Unsaved changes' });
  }

  function renameConfig(name: string) {
    setConfig((current) => ({ ...current, name }));
    setStatus({ kind: 'idle', message: 'Unsaved changes' });
  }

  async function activateDashboard(id: string) {
    setCompositionsOpen(false);
    if (id === config.id) return;
    try {
      const response = await fetch(`/api/dashboards/${id}/activate`, { method: 'POST' });
      if (!response.ok) throw new Error('Could not switch composition');
      const result = (await response.json()) as { config: DashboardConfig };
      setConfig(result.config);
      setSelectedSlot(getLayout(result.config.layoutId).slots[0]?.id ?? '');
      refreshDashboards();
      setStatus({ kind: 'success', message: `Loaded ${result.config.name}` });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function createDashboard() {
    setCompositionsOpen(false);
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'New composition', theme: config.theme })
      });
      if (!response.ok) throw new Error('Could not create composition');
      const result = (await response.json()) as { config: DashboardConfig };
      setConfig(result.config);
      setSelectedSlot(getLayout(result.config.layoutId).slots[0]?.id ?? '');
      refreshDashboards();
      setStatus({ kind: 'success', message: 'New composition created' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function deleteDashboard(id: string) {
    try {
      const response = await fetch(`/api/dashboards/${id}`, { method: 'DELETE' });
      const result = (await response.json()) as { config?: DashboardConfig; error?: string };
      if (!response.ok || !result.config) throw new Error(result.error ?? 'Could not delete');
      setConfig(result.config);
      setSelectedSlot(getLayout(result.config.layoutId).slots[0]?.id ?? '');
      refreshDashboards();
      setStatus({ kind: 'success', message: 'Composition deleted' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  function clearSelectedPanel() {
    setConfig((current) => ({
      ...current,
      assignments: current.assignments.filter((assignment) => assignment.slotId !== selectedSlot)
    }));
    setStatus({ kind: 'idle', message: 'Panel cleared' });
  }

  function fillEmptyPanels() {
    setConfig((current) => {
      const defaults = defaultAssignments(current.layoutId);
      return {
        ...current,
        assignments: layout.slots.map(
          (slot, index) =>
            current.assignments.find((assignment) => assignment.slotId === slot.id) ??
            defaults[index]!
        )
      };
    });
    setStatus({ kind: 'idle', message: 'Empty panels filled' });
  }

  function updateTheme(theme: Partial<DashboardConfig['theme']>) {
    setConfig((current) => ({ ...current, theme: { ...current.theme, ...theme } }));
    setStatus({ kind: 'idle', message: 'Unsaved changes' });
  }

  function stepSlot(offset: number) {
    const slots = layout.slots;
    if (slots.length === 0) return;
    const currentIndex = Math.max(
      0,
      slots.findIndex((slot) => slot.id === selectedSlot)
    );
    const nextIndex = (currentIndex + offset + slots.length) % slots.length;
    setSelectedSlot(slots[nextIndex]!.id);
  }

  async function save() {
    setStatus({ kind: 'working', message: 'Saving composition…' });
    try {
      const response = await fetch('/api/dashboard', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok)
        throw new Error(((await response.json()) as { error?: string }).error ?? 'Could not save');
      const result = (await response.json()) as { config: DashboardConfig };
      setConfig(result.config);
      refreshDashboards();
      setStatus({ kind: 'success', message: 'Composition saved' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function downloadBmp() {
    try {
      if (!preview || !previewMatchesConfig) throw new Error('Wait for the preview to finish');
      setStatus({ kind: 'working', message: 'Preparing the previewed BMP…' });
      const response = await fetch(`/api/preview/${preview.renderToken}/bmp`);
      if (!response.ok) throw new Error('Could not render BMP');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inked-dashboard.bmp';
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'success', message: 'BMP downloaded' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function paint() {
    try {
      if (!preview || !previewMatchesConfig) throw new Error('Wait for the preview to finish');
      setStatus({ kind: 'working', message: 'Sending the previewed pixels to Photo Painter…' });
      const response = await fetch('/api/paint', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ renderToken: preview.renderToken })
      });
      const result = (await response.json()) as PaintResponse & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Photo Painter rejected the image');
      setStatus({
        kind: 'success',
        message: result.message ?? `Painted ${Math.round(result.bytes / 1024)} KB`
      });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  const selectedAssignment = config.assignments.find(
    (assignment) => assignment.slotId === selectedSlot
  );
  const selectedSlotDefinition = layout.slots.find((slot) => slot.id === selectedSlot);
  const selectedSlotIndex = Math.max(
    0,
    layout.slots.findIndex((slot) => slot.id === selectedSlot)
  );

  const selectedWidgetName = selectedAssignment
    ? (WIDGETS.find((widget) => widget.id === selectedAssignment.widgetId)?.name ?? 'Widget')
    : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Inked home">
          <span className="brand-mark">I</span>
          <span>INKED</span>
        </a>

        <div className="doc-control">
          <span className="eyebrow">Composition</span>
          <input
            className="doc-name"
            value={config.name}
            aria-label="Composition name"
            onChange={(event) => renameConfig(event.target.value)}
          />
          <button
            type="button"
            className={`doc-toggle ${compositionsOpen ? 'is-open' : ''}`}
            aria-label="Switch composition"
            aria-expanded={compositionsOpen}
            onClick={() => setCompositionsOpen((open) => !open)}
          >
            <ChevronIcon />
          </button>
          {compositionsOpen && (
            <>
              <button
                type="button"
                className="doc-backdrop"
                aria-label="Close composition menu"
                onClick={() => setCompositionsOpen(false)}
              />
              <div className="doc-menu" role="menu">
                <div className="doc-menu-head">
                  <span className="eyebrow">Saved compositions</span>
                  <button
                    type="button"
                    className="doc-new"
                    onClick={() => {
                      void createDashboard();
                    }}
                  >
                    + New
                  </button>
                </div>
                <div className="doc-menu-list">
                  {dashboards.map((item) => (
                    <div
                      key={item.id}
                      className={`doc-item ${item.id === config.id ? 'is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="doc-item-open"
                        aria-pressed={item.id === config.id}
                        onClick={() => {
                          void activateDashboard(item.id);
                        }}
                      >
                        <strong>{item.name}</strong>
                        <small>{getLayout(item.layoutId).name}</small>
                      </button>
                      {dashboards.length > 1 && (
                        <button
                          type="button"
                          className="doc-item-delete"
                          aria-label={`Delete ${item.name}`}
                          title={`Delete ${item.name}`}
                          onClick={() => {
                            void deleteDashboard(item.id);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {dashboards.length === 0 && (
                    <p className="doc-menu-empty">Save to keep compositions here.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="topbar-actions">
          <div className={`status status--${status.kind}`}>
            <i />
            {status.message}
          </div>
          <a className="button button--ghost button--icon" href="/widgets" title="Widget gallery">
            Widgets
          </a>
          <a
            className="button button--ghost button--icon"
            href="/font-test"
            title="Font calibration"
          >
            Fonts
          </a>
          <span className="topbar-divider" />
          <button
            type="button"
            className="button button--ghost"
            disabled={!previewMatchesConfig || previewState !== 'ready'}
            onClick={() => {
              void downloadBmp();
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
              void save();
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!previewMatchesConfig || previewState !== 'ready'}
            onClick={() => {
              void paint();
            }}
          >
            <PaintIcon />
            Paint display
          </button>
        </div>
      </header>

      <div className="workspace" id="top">
        <aside className={`rail rail--compose accent--${config.theme.accent}`}>
          <section className="rail-section">
            <div className="rail-head">
              <h2>Layout</h2>
              <p>Pick a composition for the 800 × 480 canvas.</p>
            </div>
            <div className="layout-filters" role="group" aria-label="Filter layouts by capacity">
              {(
                [
                  { id: 'all', label: 'All', count: LAYOUTS.length },
                  {
                    id: 'focused',
                    label: 'Focused',
                    count: LAYOUTS.filter((item) => item.slots.length <= 4).length
                  },
                  {
                    id: 'dense',
                    label: '5+',
                    count: LAYOUTS.filter((item) => item.slots.length >= 5).length
                  }
                ] as const
              ).map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  aria-pressed={layoutFilter === filter.id}
                  className={layoutFilter === filter.id ? 'is-selected' : ''}
                  onClick={() => setLayoutFilter(filter.id)}
                >
                  {filter.label}
                  <span>{filter.count}</span>
                </button>
              ))}
            </div>
            <div className="layout-list">
              {filteredLayouts.map((item) => (
                <LayoutCard
                  key={item.id}
                  layout={item}
                  selected={item.id === layout.id}
                  onClick={() => chooseLayout(item)}
                />
              ))}
            </div>
          </section>
        </aside>

        <section className="studio">
          <div className="studio-header">
            <div>
              <span className="eyebrow">Exact PhotoPainter preview</span>
              <h1>{config.name}</h1>
              <p className="studio-sub">
                {layout.name} · {layout.slots.length} panels · {refreshPlan.label}
              </p>
            </div>
          </div>
          <div className="canvas-toolbar">
            <div className="canvas-theme">
              <span className="control-label">Canvas</span>
              <div className="theme-row">
                {(['paper', 'mist', 'night'] as const).map((background) => (
                  <button
                    type="button"
                    key={background}
                    aria-label={`${background} canvas`}
                    aria-pressed={config.theme.background === background}
                    title={`${background} canvas`}
                    className={`theme-swatch theme-swatch--${background} ${config.theme.background === background ? 'is-selected' : ''}`}
                    onClick={() => updateTheme({ background })}
                  />
                ))}
              </div>
              <span className="canvas-theme-divider" />
              <span className="control-label">Ink</span>
              <div className="theme-row">
                {(['citrus', 'coral', 'cobalt'] as const).map((accent) => (
                  <button
                    type="button"
                    key={accent}
                    aria-label={`${accent} accent`}
                    aria-pressed={config.theme.accent === accent}
                    title={`${accent} accent`}
                    className={`accent-swatch accent-swatch--${accent} ${config.theme.accent === accent ? 'is-selected' : ''}`}
                    onClick={() => updateTheme({ accent })}
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
                  {previewState === 'error'
                    ? 'Preview unavailable'
                    : 'Rendering exact BMP preview…'}
                </div>
              )}
              {layout.slots.map((slot, index) => {
                const assignment = config.assignments.find(
                  (candidate) => candidate.slotId === slot.id
                );
                return (
                  <button
                    type="button"
                    key={slot.id}
                    className={`slot ${slot.id === selectedSlot ? 'is-selected' : ''}`}
                    style={{
                      gridColumn: `${slot.column} / span ${slot.columnSpan}`,
                      gridRow: `${slot.row} / span ${slot.rowSpan}`
                    }}
                    onClick={() => setSelectedSlot(slot.id)}
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
          <p className="canvas-caption">
            <span>Exact output</span> The preview under the editing outlines is the same revision
            sent to PhotoPainter.
          </p>
        </section>

        <aside className={`rail rail--inspect accent--${config.theme.accent}`}>
          <div className="inspector-head">
            <div className="inspector-title">
              <span className="eyebrow">
                Panel {selectedSlotIndex + 1} of {layout.slots.length}
              </span>
              <h2>{selectedSlotDefinition?.label ?? 'Panel'}</h2>
              <p>
                {selectedSlotDefinition
                  ? `${WIDGET_SIZE_DEFINITIONS[selectedSlotDefinition.size].name} · ${WIDGET_SIZE_DEFINITIONS[selectedSlotDefinition.size].gridColumns}×${WIDGET_SIZE_DEFINITIONS[selectedSlotDefinition.size].gridRows}`
                  : ''}
              </p>
            </div>
            <div className="inspector-stepper" role="group" aria-label="Move between panels">
              <button
                type="button"
                className="stepper-prev"
                aria-label="Previous panel"
                onClick={() => stepSlot(-1)}
              >
                <ChevronIcon />
              </button>
              <button type="button" aria-label="Next panel" onClick={() => stepSlot(1)}>
                <ChevronIcon />
              </button>
            </div>
          </div>

          <div className="inspector-actions">
            <button type="button" onClick={fillEmptyPanels}>
              Fill empty panels
            </button>
            <button type="button" onClick={clearSelectedPanel} disabled={!selectedAssignment}>
              Clear panel
            </button>
          </div>

          <div className="rail-subhead">Widget</div>
          <div className="widget-list">
            {WIDGETS.map((widget) => {
              const variant = widget.variants[selectedSlotDefinition?.size ?? 'small'];
              return (
                <button
                  type="button"
                  key={widget.id}
                  className={`widget-option ${selectedAssignment?.widgetId === widget.id ? 'is-selected' : ''}`}
                  onClick={() => assignWidget(widget.id)}
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
                  <span className="selection-dot">
                    {selectedAssignment?.widgetId === widget.id && <CheckIcon />}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedAssignment && (
            <div className="inspector-options">
              <div className="rail-subhead">Options</div>
              {WIDGET_HAS_SETTINGS[selectedAssignment.widgetId] ? (
                <WidgetSettingsEditor
                  assignment={selectedAssignment}
                  onChange={updateSelectedSettings}
                />
              ) : (
                <p className="options-empty">
                  {selectedWidgetName} reads live data — nothing to set.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function LayoutCard({
  layout,
  selected,
  onClick
}: {
  layout: LayoutDefinition;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`layout-card ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
      title={layout.description}
    >
      <div
        className="layout-thumbnail"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`
        }}
      >
        {layout.slots.map((slot) => (
          <span
            key={slot.id}
            style={{
              gridColumn: `${slot.column} / span ${slot.columnSpan}`,
              gridRow: `${slot.row} / span ${slot.rowSpan}`
            }}
          />
        ))}
      </div>
      <span className="layout-copy">
        <strong>{layout.name}</strong>
        <small>{layout.description}</small>
        <em>
          {layout.slots.length} widgets · {layout.slots.length >= 5 ? 'High density' : 'Focused'}
        </em>
      </span>
      <span className="radio">{selected && <i />}</span>
    </button>
  );
}
