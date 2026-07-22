import { useEffect, useMemo, useState } from 'react';

import type {
  SportsCatalog,
  SportsCatalogTeam,
  SportsEventType,
  SportsFollow,
  SportsWidgetSettings
} from '@inked/commons';

const EVENT_TYPE_LABELS: Record<SportsEventType, string> = {
  match: 'Matches',
  practice: 'Practice',
  qualifying: 'Qualifying',
  sprint: 'Sprint',
  race: 'Race'
};

export function SportsSettings({
  settings,
  onChange
}: {
  settings: SportsWidgetSettings;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [catalog, setCatalog] = useState<SportsCatalog | null>(null);
  const [teams, setTeams] = useState<Record<string, SportsCatalogTeam[]>>({});
  const [selectedSportId, setSelectedSportId] = useState(settings.sportId);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(
    settings.follows[0]?.competitionId ?? ''
  );
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/sports/catalog')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load sports.');
        return response.json() as Promise<SportsCatalog>;
      })
      .then((value) => {
        setCatalog(value);
        setSelectedSportId((currentSportId) => {
          const sport =
            value.sports.find((candidate) => candidate.id === currentSportId) ?? value.sports[0];
          if (!sport) return '';
          setSelectedCompetitionId((currentCompetitionId) => {
            const competition =
              sport.competitions.find((candidate) => candidate.id === currentCompetitionId) ??
              sport.competitions[0];
            return competition?.id ?? '';
          });
          return sport.id;
        });
      })
      .catch((reason: unknown) => setError((reason as Error).message));
  }, []);

  const sport = catalog?.sports.find((candidate) => candidate.id === selectedSportId);
  const competition = sport?.competitions.find(
    (candidate) => candidate.id === selectedCompetitionId
  );

  useEffect(() => {
    if (!competition?.supportsTeams || teams[competition.id]) return;
    void fetch(`/api/sports/competitions/${competition.id}/teams`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load teams.');
        return response.json() as Promise<{ teams: SportsCatalogTeam[] }>;
      })
      .then((value) => setTeams((current) => ({ ...current, [competition.id]: value.teams })))
      .catch((reason: unknown) => setError((reason as Error).message));
  }, [competition, teams]);

  const competitionById = useMemo(() => {
    const entries =
      catalog?.sports.flatMap((item) =>
        item.competitions.map((value) => [value.id, value] as const)
      ) ?? [];
    return new Map(entries);
  }, [catalog]);

  function selectSport(sportId: string) {
    setSelectedSportId(sportId);
    const next = catalog?.sports.find((candidate) => candidate.id === sportId)?.competitions[0];
    setSelectedCompetitionId(next?.id ?? '');
    if (sportId !== settings.sportId) onChange({ sportId, follows: [] });
  }

  function replaceFollows(follows: SportsFollow[]) {
    onChange({
      sportId: selectedSportId,
      follows: follows.filter((follow) => follow.sportId === selectedSportId)
    });
  }

  function toggleAllCompetitionEvents(selected: boolean) {
    if (!competition || !sport) return;
    const withoutCompetition = settings.follows.filter(
      (follow) => !(follow.competitionId === competition.id && follow.kind === 'competition')
    );
    if (!selected) return replaceFollows(withoutCompetition);
    replaceFollows([
      ...withoutCompetition.filter((follow) => follow.competitionId !== competition.id),
      {
        kind: 'competition',
        sportId: sport.id,
        competitionId: competition.id,
        eventTypes: []
      }
    ]);
  }

  function toggleTeam(team: SportsCatalogTeam, selected: boolean) {
    if (!competition || !sport) return;
    const withoutTarget = settings.follows.filter(
      (follow) =>
        follow.competitionId !== competition.id ||
        (follow.kind === 'team' && follow.teamId !== team.id)
    );
    if (!selected) return replaceFollows(withoutTarget);
    replaceFollows([
      ...withoutTarget,
      {
        kind: 'team',
        sportId: sport.id,
        competitionId: competition.id,
        teamId: team.id,
        eventTypes: ['match']
      }
    ]);
  }

  function toggleEventType(eventType: SportsEventType, selected: boolean) {
    if (!competition || !sport) return;
    const current = settings.follows.find(
      (follow) => follow.kind === 'competition' && follow.competitionId === competition.id
    );
    const types = new Set(current?.eventTypes ?? []);
    if (selected) types.add(eventType);
    else types.delete(eventType);
    const withoutCompetition = settings.follows.filter(
      (follow) => !(follow.kind === 'competition' && follow.competitionId === competition.id)
    );
    replaceFollows(
      types.size === 0
        ? withoutCompetition
        : [
            ...withoutCompetition,
            {
              kind: 'competition',
              sportId: sport.id,
              competitionId: competition.id,
              eventTypes: [...types]
            }
          ]
    );
  }

  function removeFollow(target: SportsFollow) {
    replaceFollows(settings.follows.filter((follow) => follow !== target));
  }

  const competitionFollow = settings.follows.find(
    (follow) => follow.kind === 'competition' && follow.competitionId === competition?.id
  );
  const followsAllCompetitionEvents = Boolean(
    competitionFollow &&
    (competitionFollow.eventTypes.length === 0 ||
      (competitionFollow.eventTypes.length === 1 && competitionFollow.eventTypes[0] === 'match'))
  );
  const selectedTypes = new Set(
    followsAllCompetitionEvents ? [] : (competitionFollow?.eventTypes ?? [])
  );

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
          value={selectedCompetitionId}
          onChange={(event) => setSelectedCompetitionId(event.target.value)}
        >
          {(sport?.competitions ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {competition && (
        <div className="sports-subscription">
          <strong>{competition.supportsTeams ? 'Matches' : 'Events'}</strong>
          <label className="sports-check sports-check--all">
            <input
              type="checkbox"
              checked={followsAllCompetitionEvents}
              onChange={(event) => toggleAllCompetitionEvents(event.target.checked)}
            />
            <span>
              All {competition.name} {competition.supportsTeams ? 'matches' : 'events'}
            </span>
          </label>

          {!competition.supportsTeams && !followsAllCompetitionEvents && (
            <>
              <span className="sports-choice-label">Or choose event types</span>
              <div className="sports-event-types">
                {competition.eventTypes.map((eventType) => (
                  <label className="sports-check" key={eventType}>
                    <input
                      type="checkbox"
                      checked={selectedTypes.has(eventType)}
                      onChange={(event) => toggleEventType(eventType, event.target.checked)}
                    />
                    <span>{EVENT_TYPE_LABELS[eventType]}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {competition.supportsTeams && !followsAllCompetitionEvents && (
            <>
              <span className="sports-choice-label">Or choose teams</span>
              <div className="sports-team-list">
                {(teams[competition.id] ?? []).map((team) => (
                  <label className="sports-check" key={team.id}>
                    <input
                      type="checkbox"
                      checked={settings.follows.some(
                        (follow) => follow.kind === 'team' && follow.teamId === team.id
                      )}
                      onChange={(event) => toggleTeam(team, event.target.checked)}
                    />
                    <span>{team.name}</span>
                  </label>
                ))}
                {!teams[competition.id] && <p className="city-hint">Loading teams…</p>}
              </div>
            </>
          )}
        </div>
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

      <div className="sports-following">
        <strong>Following</strong>
        {settings.follows.filter((follow) => follow.sportId === selectedSportId).length === 0 && (
          <p className="city-hint">Nothing selected yet.</p>
        )}
        {settings.follows
          .filter((follow) => follow.sportId === selectedSportId)
          .map((follow) => {
            const item = competitionById.get(follow.competitionId);
            const team =
              follow.kind === 'team'
                ? teams[follow.competitionId]?.find((candidate) => candidate.id === follow.teamId)
                : null;
            const competitionDetail =
              follow.kind === 'competition'
                ? follow.eventTypes.length === 0 ||
                  (follow.eventTypes.length === 1 && follow.eventTypes[0] === 'match')
                  ? `All ${item?.supportsTeams ? 'matches' : 'events'}`
                  : follow.eventTypes.map((type) => EVENT_TYPE_LABELS[type]).join(', ')
                : '';
            return (
              <button
                type="button"
                key={`${follow.kind}-${follow.competitionId}-${follow.kind === 'team' ? follow.teamId : 'all'}`}
                onClick={() => removeFollow(follow)}
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
      {error && <p className="city-hint">{error}</p>}
    </div>
  );
}
