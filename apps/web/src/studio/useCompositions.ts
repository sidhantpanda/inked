import { useCallback, useEffect, useState } from 'react';

import type { DashboardConfig } from '@inked/commons';

import {
  activateDashboard,
  createDashboard,
  deleteDashboard,
  fetchActiveDashboard,
  fetchDashboards,
  saveDashboard
} from './api';
import { firstSlotId } from './composition-edits';
import type { DashboardSummary, SetStatus } from './types';

interface CompositionsOptions {
  config: DashboardConfig;
  setConfig: (config: DashboardConfig) => void;
  setSelectedSlot: (slotId: string) => void;
  setStatus: SetStatus;
}

/** Saved compositions on the server: initial load, switching, creating, deleting, saving. */
export function useCompositions({
  config,
  setConfig,
  setSelectedSlot,
  setStatus
}: CompositionsOptions) {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);

  const refreshDashboards = useCallback(() => {
    void fetchDashboards().then(setDashboards);
  }, []);

  /** Opens a composition from the server and selects its first panel. */
  const open = useCallback(
    (next: DashboardConfig) => {
      setConfig(next);
      setSelectedSlot(firstSlotId(next));
      refreshDashboards();
    },
    [refreshDashboards, setConfig, setSelectedSlot]
  );

  useEffect(() => {
    fetchActiveDashboard()
      .then((response) => open(response.config))
      .catch(() => setStatus({ kind: 'error', message: 'Preview mode · server offline' }));
  }, [open, setStatus]);

  async function activate(id: string) {
    if (id === config.id) return;
    try {
      const next = await activateDashboard(id);
      open(next);
      setStatus({ kind: 'success', message: `Loaded ${next.name}` });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function create() {
    try {
      open(await createDashboard(config.theme));
      setStatus({ kind: 'success', message: 'New composition created' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function remove(id: string) {
    try {
      open(await deleteDashboard(id));
      setStatus({ kind: 'success', message: 'Composition deleted' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  async function save() {
    setStatus({ kind: 'working', message: 'Saving composition…' });
    try {
      setConfig(await saveDashboard(config));
      refreshDashboards();
      setStatus({ kind: 'success', message: 'Composition saved' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  }

  return { dashboards, activate, create, remove, save };
}
