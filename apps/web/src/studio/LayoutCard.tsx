import type { LayoutDefinition } from '@inked/commons';

/** A layout choice with a miniature of its slot grid. */
export function LayoutCard({
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
