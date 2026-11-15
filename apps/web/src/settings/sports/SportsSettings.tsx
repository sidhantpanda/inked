import type { SportsFollow, SportsWidgetSettings } from '@inked/commons';

import { withAllCompetitionEvents, withEventType, withTeam } from './follows';
import { SportsFollowing } from './SportsFollowing';
import { SportsSubscription } from './SportsSubscription';
import { useSportsCatalog } from './useSportsCatalog';

/** Sports options: one sport per panel, then competitions, event types, or teams within it. */
export function SportsSettings({
  settings,
  onChange
}: {
  settings: SportsWidgetSettings;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const browse = useSportsCatalog(settings.sportId, settings.follows[0]?.competitionId ?? '');
  const { catalog, error, sport, competition, selectedSportId } = browse;

  function selectSport(sportId: string) {
    browse.selectSport(sportId);
    if (sportId !== settings.sportId) onChange({ sportId, follows: [] });
  }

  function replaceFollows(follows: SportsFollow[]) {
    onChange({
      sportId: selectedSportId,
      follows: follows.filter((follow) => follow.sportId === selectedSportId)
    });
  }

  if (!catalog && !error) return <p className="options-empty">Loading sports…</p>;
  if (!catalog) return <p className="options-empty">{error}</p>;

  return (
    <div className="sports-settings">
      <label className="settings-field">
        <span>Sport</span>
        <select value={selectedSportId} onChange={(event) => selectSport(event.target.value)}>
          {catalog.sports.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <p className="city-hint">
        One sport per widget. Add another Sports widget for a different sport.
      </p>
      <label className="settings-field">
        <span>League or series</span>
        <select
          value={browse.selectedCompetitionId}
          onChange={(event) => browse.selectCompetition(event.target.value)}
        >
          {(sport?.competitions ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {competition && sport && (
        <SportsSubscription
          competition={competition}
          follows={settings.follows}
          teams={browse.teams[competition.id]}
          onToggleAll={(selected) =>
            replaceFollows(withAllCompetitionEvents(settings.follows, sport, competition, selected))
          }
          onToggleEventType={(eventType, selected) =>
            replaceFollows(withEventType(settings.follows, sport, competition, eventType, selected))
          }
          onToggleTeam={(team, selected) =>
            replaceFollows(withTeam(settings.follows, sport, competition, team, selected))
          }
        />
      )}

      <label className="settings-field sports-horizon">
        <span>Upcoming window</span>
        <select
          value={settings.horizonDays}
          onChange={(event) => onChange({ horizonDays: Number(event.target.value) })}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </label>

      <SportsFollowing
        follows={settings.follows.filter((follow) => follow.sportId === selectedSportId)}
        competitionById={browse.competitionById}
        teams={browse.teams}
        onRemove={(target) =>
          replaceFollows(settings.follows.filter((follow) => follow !== target))
        }
      />
      {error && <p className="city-hint">{error}</p>}
    </div>
  );
}
