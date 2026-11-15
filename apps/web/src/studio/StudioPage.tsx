import { useMemo, useState } from 'react';

import {
  WIDGETS,
  buildDashboardRefreshPlan,
  createDefaultDashboard,
  getLayout,
  type DashboardConfig,
  type LayoutDefinition,
  type WidgetId
} from '@inked/commons';

import {
  steppedSlotId,
  withEmptySlotsFilled,
  withLayout,
  withoutSlot,
  withSettings,
  withTheme,
  withWidget
} from './composition-edits';
import { Inspector } from './Inspector';
import { LayoutRail } from './LayoutRail';
import { StudioCanvas } from './StudioCanvas';
import { Topbar } from './Topbar';
import type { Status } from './types';
import { useCompositions } from './useCompositions';
import { useDisplayPreview } from './useDisplayPreview';

/** The display studio: compose a layout, configure each panel, and paint the result. */
export function StudioPage() {
  const [config, setConfig] = useState<DashboardConfig>(createDefaultDashboard());
  const [selectedSlot, setSelectedSlot] = useState('feature');
  const [status, setStatus] = useState<Status>({ kind: 'idle', message: 'Ready to compose' });
  const layout = useMemo(() => getLayout(config.layoutId), [config.layoutId]);
  const configSignature = useMemo(() => JSON.stringify(config), [config]);
  const refreshPlan = useMemo(() => buildDashboardRefreshPlan(config, WIDGETS), [config]);
  const compositions = useCompositions({ config, setConfig, setSelectedSlot, setStatus });
  const display = useDisplayPreview(configSignature, setStatus);
  const selectedAssignment = config.assignments.find(
    (assignment) => assignment.slotId === selectedSlot
  );

  /** Applies a local edit and reports it in the status bar. */
  function edit(change: (current: DashboardConfig) => DashboardConfig, message: string) {
    setConfig(change);
    setStatus({ kind: 'idle', message });
  }

  function chooseLayout(next: LayoutDefinition) {
    if (next.id === layout.id) return;
    setConfig((current) => withLayout(current, next));
    setSelectedSlot(next.slots[0]?.id ?? '');
    setStatus({ kind: 'idle', message: 'Layout changed · widgets preserved' });
  }

  function stepSlot(offset: number) {
    const next = steppedSlotId(layout, selectedSlot, offset);
    if (next) setSelectedSlot(next);
  }

  return (
    <main className="app-shell">
      <Topbar
        composition={{
          name: config.name,
          activeId: config.id,
          dashboards: compositions.dashboards,
          onRename: (name) => edit((current) => ({ ...current, name }), 'Unsaved changes'),
          onActivate: compositions.activate,
          onCreate: compositions.create,
          onDelete: compositions.remove
        }}
        status={status}
        exportReady={display.exportReady}
        onDownloadBmp={display.downloadBmp}
        onSave={compositions.save}
        onPaint={display.paint}
      />

      <div className="workspace" id="top">
        <LayoutRail
          accent={config.theme.accent}
          selectedLayoutId={layout.id}
          onChoose={chooseLayout}
        />

        <StudioCanvas
          config={config}
          layout={layout}
          subtitle={`${layout.name} · ${layout.slots.length} panels · ${refreshPlan.label}`}
          preview={display.preview}
          previewState={display.previewState}
          previewMatchesConfig={display.previewMatchesConfig}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onThemeChange={(theme) => edit((current) => withTheme(current, theme), 'Unsaved changes')}
        />

        <Inspector
          accent={config.theme.accent}
          layout={layout}
          selectedSlot={selectedSlot}
          assignment={selectedAssignment}
          onStep={stepSlot}
          onFillEmpty={() =>
            edit((current) => withEmptySlotsFilled(current, layout), 'Empty panels filled')
          }
          onClear={() => edit((current) => withoutSlot(current, selectedSlot), 'Panel cleared')}
          onAssign={(widgetId: WidgetId) =>
            edit((current) => withWidget(current, selectedSlot, widgetId), 'Unsaved changes')
          }
          onSettingsChange={(patch) =>
            edit((current) => withSettings(current, selectedSlot, patch), 'Unsaved changes')
          }
        />
      </div>
    </main>
  );
}
