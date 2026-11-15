import { useState } from 'react';

import { getLayout } from '@inked/commons';

import { ChevronIcon } from '../icons';
import type { DashboardSummary } from './types';

/** The editable composition name and the menu of saved compositions. */
export function CompositionMenu({
  name,
  activeId,
  dashboards,
  onRename,
  onActivate,
  onCreate,
  onDelete
}: {
  name: string;
  activeId: string;
  dashboards: DashboardSummary[];
  onRename: (name: string) => void;
  onActivate: (id: string) => Promise<void>;
  onCreate: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="doc-control">
      <span className="eyebrow">Composition</span>
      <input
        className="doc-name"
        value={name}
        aria-label="Composition name"
        onChange={(event) => onRename(event.target.value)}
      />
      <button
        type="button"
        className={`doc-toggle ${open ? 'is-open' : ''}`}
        aria-label="Switch composition"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronIcon />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="doc-backdrop"
            aria-label="Close composition menu"
            onClick={() => setOpen(false)}
          />
          <div className="doc-menu" role="menu">
            <div className="doc-menu-head">
              <span className="eyebrow">Saved compositions</span>
              <button
                type="button"
                className="doc-new"
                onClick={() => {
                  setOpen(false);
                  void onCreate();
                }}
              >
                + New
              </button>
            </div>
            <div className="doc-menu-list">
              {dashboards.map((item) => (
                <div
                  key={item.id}
                  className={`doc-item ${item.id === activeId ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="doc-item-open"
                    aria-pressed={item.id === activeId}
                    onClick={() => {
                      setOpen(false);
                      void onActivate(item.id);
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
                        void onDelete(item.id);
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
  );
}
