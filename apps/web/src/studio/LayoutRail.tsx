import { useMemo, useState } from 'react';

import { LAYOUTS, type DashboardTheme, type LayoutDefinition } from '@inked/commons';

import { LayoutCard } from './LayoutCard';

type LayoutFilter = 'all' | 'focused' | 'dense';

const FILTERS = [
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
] as const satisfies readonly { id: LayoutFilter; label: string; count: number }[];

/** The left rail: layout capacity filters and the layout picker. */
export function LayoutRail({
  accent,
  selectedLayoutId,
  onChoose
}: {
  accent: DashboardTheme['accent'];
  selectedLayoutId: string;
  onChoose: (layout: LayoutDefinition) => void;
}) {
  const [layoutFilter, setLayoutFilter] = useState<LayoutFilter>('all');
  const filteredLayouts = useMemo(
    () =>
      LAYOUTS.filter((candidate) => {
        if (layoutFilter === 'focused') return candidate.slots.length <= 4;
        if (layoutFilter === 'dense') return candidate.slots.length >= 5;
        return true;
      }),
    [layoutFilter]
  );

  return (
    <aside className={`rail rail--compose accent--${accent}`}>
      <section className="rail-section">
        <div className="rail-head">
          <h2>Layout</h2>
          <p>Pick a composition for the 800 × 480 canvas.</p>
        </div>
        <div className="layout-filters" role="group" aria-label="Filter layouts by capacity">
          {FILTERS.map((filter) => (
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
              selected={item.id === selectedLayoutId}
              onClick={() => onChoose(item)}
            />
          ))}
        </div>
      </section>
    </aside>
  );
}
