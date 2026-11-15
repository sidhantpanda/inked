import type { SportsCatalogCompetition, SportsCatalogTeam, SportsFollow } from '@inked/commons';

import { coversAllEvents, EVENT_TYPE_LABELS } from './follows';

/** Removable chips for everything the panel follows in the selected sport. */
export function SportsFollowing({
  follows,
  competitionById,
  teams,
  onRemove
}: {
  follows: SportsFollow[];
  competitionById: Map<string, SportsCatalogCompetition>;
  teams: Record<string, SportsCatalogTeam[]>;
  onRemove: (follow: SportsFollow) => void;
}) {
  return (
    <div className="sports-following">
      <strong>Following</strong>
      {follows.length === 0 && <p className="city-hint">Nothing selected yet.</p>}
      {follows.map((follow) => {
        const item = competitionById.get(follow.competitionId);
        const team =
          follow.kind === 'team'
            ? teams[follow.competitionId]?.find((candidate) => candidate.id === follow.teamId)
            : null;
        const competitionDetail =
          follow.kind === 'competition'
            ? coversAllEvents(follow.eventTypes)
              ? `All ${item?.supportsTeams ? 'matches' : 'events'}`
              : follow.eventTypes.map((type) => EVENT_TYPE_LABELS[type]).join(', ')
            : '';
        return (
          <button
            type="button"
            key={`${follow.kind}-${follow.competitionId}-${follow.kind === 'team' ? follow.teamId : 'all'}`}
            onClick={() => onRemove(follow)}
            title="Remove"
          >
            <span>
              {team?.name ?? item?.name ?? follow.competitionId}
              {competitionDetail ? ` · ${competitionDetail}` : ''}
            </span>
            <b>×</b>
          </button>
        );
      })}
    </div>
  );
}
