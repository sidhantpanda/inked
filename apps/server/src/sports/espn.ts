import type { SportsEventState, SportsEventType } from '@inked/commons';

import type {
  ProviderMatchEvent,
  ProviderSessionEvent,
  ProviderSportsEvent,
  ProviderSportsTeam,
  SportsProvider,
  SportsProviderCompetitionRef,
  SportsProviderRequest
} from './types.js';

type Fetch = typeof fetch;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function parseState(value: unknown): SportsEventState {
  const status = record(record(value).type);
  const name = text(status.name).toLowerCase();
  const state = text(status.state).toLowerCase();
  if (name.includes('postpon') || name.includes('delay')) return 'postponed';
  if (name.includes('cancel')) return 'cancelled';
  if (state === 'in') return 'live';
  if (state === 'post' || status.completed === true) return 'finished';
  return 'scheduled';
}

function providerTeam(value: unknown): ProviderSportsTeam {
  const wrapper = record(value);
  const team = record(wrapper.team ?? value);
  return {
    id: text(team.id),
    name: text(team.displayName, text(team.name, 'Unknown')),
    abbreviation: text(team.abbreviation, text(team.shortDisplayName, '—'))
  };
}

function score(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sessionType(abbreviation: string): Exclude<SportsEventType, 'match'> {
  const normalized = abbreviation.toLowerCase();
  if (normalized.includes('sprint')) return 'sprint';
  if (normalized.includes('qual')) return 'qualifying';
  if (normalized.includes('race')) return 'race';
  return 'practice';
}

function sessionName(type: Exclude<SportsEventType, 'match'>, abbreviation: string): string {
  if (type === 'qualifying') return 'Qualifying';
  if (type === 'race') return 'Race';
  if (type === 'sprint')
    return abbreviation.toLowerCase().includes('qual') ? 'Sprint qualifying' : 'Sprint';
  return abbreviation || 'Practice';
}

function compactDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

/** Adapter for ESPN's public, undocumented site endpoints. */
export class EspnSportsProvider implements SportsProvider {
  readonly id = 'espn';
  readonly name = 'ESPN';

  constructor(private readonly request: Fetch = fetch) {}

  async getTeams(competition: SportsProviderCompetitionRef): Promise<ProviderSportsTeam[]> {
    const payload = await this.getJson(`${competition.id}/teams?limit=200`);
    const sports = array(record(payload).sports);
    const leagues = array(record(sports[0]).leagues);
    return array(record(leagues[0]).teams)
      .map((entry) => providerTeam(entry))
      .filter((team) => team.id && team.name !== 'Unknown');
  }

  async getEvents(request: SportsProviderRequest): Promise<ProviderSportsEvent[]> {
    const range = `${compactDate(request.from)}-${compactDate(request.to)}`;
    const payload = await this.getJson(
      `${request.competition.id}/scoreboard?dates=${range}&limit=1000`
    );
    const events = array(record(payload).events);
    return request.competition.kind === 'racing'
      ? events.flatMap((event) => this.racingSessions(event))
      : events.map((event) => this.match(event)).filter((event) => event !== null);
  }

  private match(value: unknown): ProviderMatchEvent | null {
    const event = record(value);
    const competition = record(array(event.competitions)[0]);
    const competitors = array(competition.competitors).map((item) => record(item));
    const home = competitors.find((item) => item.homeAway === 'home') ?? competitors[0];
    const away = competitors.find((item) => item.homeAway === 'away') ?? competitors[1];
    if (!home || !away) return null;
    const state = parseState(competition.status ?? event.status);
    const homeTeam = providerTeam(home);
    const awayTeam = providerTeam(away);
    const id = text(event.id, text(competition.id));
    const startsAt = text(competition.date, text(event.date));
    if (!id || !startsAt || !homeTeam.id || !awayTeam.id) return null;
    const homeScore = state === 'scheduled' ? undefined : score(home.score);
    const awayScore = state === 'scheduled' ? undefined : score(away.score);
    return {
      id,
      type: 'match',
      startsAt,
      state,
      home: homeTeam,
      away: awayTeam,
      ...(homeScore !== undefined ? { homeScore } : {}),
      ...(awayScore !== undefined ? { awayScore } : {})
    };
  }

  private racingSessions(value: unknown): ProviderSessionEvent[] {
    const event = record(value);
    const circuit = record(event.circuit);
    return array(event.competitions).flatMap((item) => {
      const competition = record(item);
      const typeData = record(competition.type);
      const abbreviation = text(typeData.abbreviation);
      const type = sessionType(abbreviation);
      const startsAt = text(competition.date);
      if (!startsAt) return [];
      return [
        {
          id: text(competition.id, `${text(event.id)}-${abbreviation}`),
          type,
          startsAt,
          state: parseState(competition.status),
          name: text(event.shortName, text(event.name, 'Formula 1')),
          session: sessionName(type, abbreviation),
          ...(text(circuit.fullName) ? { venue: text(circuit.fullName) } : {})
        }
      ];
    });
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await this.request(`https://site.api.espn.com/apis/site/v2/sports/${path}`, {
      headers: { accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`ESPN returned HTTP ${response.status}.`);
    return response.json() as Promise<unknown>;
  }
}
