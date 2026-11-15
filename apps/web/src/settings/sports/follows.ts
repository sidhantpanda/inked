import type {
  SportsCatalogCompetition,
  SportsCatalogSport,
  SportsCatalogTeam,
  SportsEventType,
  SportsFollow
} from '@inked/commons';

export const EVENT_TYPE_LABELS: Record<SportsEventType, string> = {
  match: 'Matches',
  practice: 'Practice',
  qualifying: 'Qualifying',
  sprint: 'Sprint',
  race: 'Race'
};

/** Pure edits to a Sports panel's follow list; the editor scopes results to one sport. */
export function withAllCompetitionEvents(
  follows: SportsFollow[],
  sport: SportsCatalogSport,
  competition: SportsCatalogCompetition,
  selected: boolean
): SportsFollow[] {
  const withoutCompetition = follows.filter(
    (follow) => !(follow.competitionId === competition.id && follow.kind === 'competition')
  );
  if (!selected) return withoutCompetition;
  return [
    ...withoutCompetition.filter((follow) => follow.competitionId !== competition.id),
    {
      kind: 'competition',
      sportId: sport.id,
      competitionId: competition.id,
      eventTypes: []
    }
  ];
}

export function withTeam(
  follows: SportsFollow[],
  sport: SportsCatalogSport,
  competition: SportsCatalogCompetition,
  team: SportsCatalogTeam,
  selected: boolean
): SportsFollow[] {
  const withoutTarget = follows.filter(
    (follow) =>
      follow.competitionId !== competition.id ||
      (follow.kind === 'team' && follow.teamId !== team.id)
  );
  if (!selected) return withoutTarget;
  return [
    ...withoutTarget,
    {
      kind: 'team',
      sportId: sport.id,
      competitionId: competition.id,
      teamId: team.id,
      eventTypes: ['match']
    }
  ];
}

export function withEventType(
  follows: SportsFollow[],
  sport: SportsCatalogSport,
  competition: SportsCatalogCompetition,
  eventType: SportsEventType,
  selected: boolean
): SportsFollow[] {
  const current = follows.find(
    (follow) => follow.kind === 'competition' && follow.competitionId === competition.id
  );
  const types = new Set(current?.eventTypes ?? []);
  if (selected) types.add(eventType);
  else types.delete(eventType);
  const withoutCompetition = follows.filter(
    (follow) => !(follow.kind === 'competition' && follow.competitionId === competition.id)
  );
  return types.size === 0
    ? withoutCompetition
    : [
        ...withoutCompetition,
        {
          kind: 'competition',
          sportId: sport.id,
          competitionId: competition.id,
          eventTypes: [...types]
        }
      ];
}

/** True when a follow covers every event, either explicitly or as the match default. */
export function coversAllEvents(eventTypes: SportsEventType[]): boolean {
  return eventTypes.length === 0 || (eventTypes.length === 1 && eventTypes[0] === 'match');
}

/** How the competition-level follow, if any, is currently configured. */
export function competitionSelection(follows: SportsFollow[], competitionId: string | undefined) {
  const competitionFollow = follows.find(
    (follow) => follow.kind === 'competition' && follow.competitionId === competitionId
  );
  const followsAllEvents = Boolean(
    competitionFollow && coversAllEvents(competitionFollow.eventTypes)
  );
  return {
    followsAllEvents,
    selectedTypes: new Set(followsAllEvents ? [] : (competitionFollow?.eventTypes ?? []))
  };
}
