import type {
  SportsCatalogCompetition,
  SportsCatalogTeam,
  SportsEventType,
  SportsFollow
} from '@inked/commons';

import { competitionSelection, EVENT_TYPE_LABELS } from './follows';

/** What to follow within one competition: everything, chosen event types, or chosen teams. */
export function SportsSubscription({
  competition,
  follows,
  teams,
  onToggleAll,
  onToggleEventType,
  onToggleTeam
}: {
  competition: SportsCatalogCompetition;
  follows: SportsFollow[];
  teams: SportsCatalogTeam[] | undefined;
  onToggleAll: (selected: boolean) => void;
  onToggleEventType: (eventType: SportsEventType, selected: boolean) => void;
  onToggleTeam: (team: SportsCatalogTeam, selected: boolean) => void;
}) {
  const { followsAllEvents, selectedTypes } = competitionSelection(follows, competition.id);

  return (
    <div className="sports-subscription">
      <strong>{competition.supportsTeams ? 'Matches' : 'Events'}</strong>
      <label className="sports-check sports-check--all">
        <input
          type="checkbox"
          checked={followsAllEvents}
          onChange={(event) => onToggleAll(event.target.checked)}
        />
        <span>
          All {competition.name} {competition.supportsTeams ? 'matches' : 'events'}
        </span>
      </label>

      {!competition.supportsTeams && !followsAllEvents && (
        <>
          <span className="sports-choice-label">Or choose event types</span>
          <div className="sports-event-types">
            {competition.eventTypes.map((eventType) => (
              <label className="sports-check" key={eventType}>
                <input
                  type="checkbox"
                  checked={selectedTypes.has(eventType)}
                  onChange={(event) => onToggleEventType(eventType, event.target.checked)}
                />
                <span>{EVENT_TYPE_LABELS[eventType]}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {competition.supportsTeams && !followsAllEvents && (
        <>
          <span className="sports-choice-label">Or choose teams</span>
          <div className="sports-team-list">
            {(teams ?? []).map((team) => (
              <label className="sports-check" key={team.id}>
                <input
                  type="checkbox"
                  checked={follows.some(
                    (follow) => follow.kind === 'team' && follow.teamId === team.id
                  )}
                  onChange={(event) => onToggleTeam(team, event.target.checked)}
                />
                <span>{team.name}</span>
              </label>
            ))}
            {!teams && <p className="city-hint">Loading teams…</p>}
          </div>
        </>
      )}
    </div>
  );
}
