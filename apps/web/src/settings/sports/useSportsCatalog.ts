import { useEffect, useMemo, useState } from 'react';

import type { SportsCatalog, SportsCatalogTeam } from '@inked/commons';

/**
 * Loads the sports catalog and, lazily, each competition's teams, while tracking
 * which sport and competition the editor is browsing.
 */
export function useSportsCatalog(initialSportId: string, initialCompetitionId: string) {
  const [catalog, setCatalog] = useState<SportsCatalog | null>(null);
  const [teams, setTeams] = useState<Record<string, SportsCatalogTeam[]>>({});
  const [selectedSportId, setSelectedSportId] = useState(initialSportId);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(initialCompetitionId);
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

  /** Browses to a sport and its first competition. */
  function selectSport(sportId: string) {
    setSelectedSportId(sportId);
    const next = catalog?.sports.find((candidate) => candidate.id === sportId)?.competitions[0];
    setSelectedCompetitionId(next?.id ?? '');
  }

  return {
    catalog,
    teams,
    error,
    sport,
    competition,
    competitionById,
    selectedSportId,
    selectedCompetitionId,
    selectSport,
    selectCompetition: setSelectedCompetitionId
  };
}
