import {
  formatCompactSportsSession,
  formatSportsEventTiming,
  groupSportsEvents
} from '@inked/commons';

import type { WidgetComponentProps } from './types';
import { WidgetLabel } from './WidgetLabel';

export function ScoresWidget({ input, size }: WidgetComponentProps<'scores'>) {
  const limit = size === 'small' ? 1 : size === 'wide' ? 2 : size === 'tall' ? 3 : 4;
  const groups = groupSportsEvents(input.events).slice(0, limit);
  return (
    <>
      <WidgetLabel>Sports</WidgetLabel>
      <div className={`sports-event-list sports-event-list--${size}`}>
        {groups.map((group) => {
          return (
            <div className={`sports-event-card sports-event-card--${group.type}`} key={group.id}>
              {group.type === 'match' ? (
                <>
                  <div className="sports-event-competition">{group.event.competition}</div>
                  <div className="sports-team">
                    <strong>{group.event.home}</strong>
                    {group.event.homeScore !== undefined && <b>{group.event.homeScore}</b>}
                  </div>
                  <div className="sports-team">
                    <strong>{group.event.away}</strong>
                    {group.event.awayScore !== undefined && <b>{group.event.awayScore}</b>}
                  </div>
                  <SportsTiming event={group.event} timezone={input.timezone} />
                </>
              ) : (
                <>
                  <strong className="sports-event-name">{group.name}</strong>
                  {group.venue && <span className="sports-event-venue">{group.venue}</span>}
                  <div className="sports-session-list">
                    {group.sessions.map((session) => (
                      <div className="sports-session-row" key={session.id}>
                        <strong>
                          {size === 'small' || size === 'tall'
                            ? formatCompactSportsSession(session.session)
                            : session.session}
                        </strong>
                        <SportsTiming event={session} timezone={input.timezone} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {groups.length === 0 && <p className="sports-empty">No upcoming events</p>}
      </div>
    </>
  );
}

function SportsTiming({
  event,
  timezone
}: {
  event: Parameters<typeof formatSportsEventTiming>[0];
  timezone: string;
}) {
  const timing = formatSportsEventTiming(event, timezone);
  return (
    <div className={event.state === 'live' ? 'sports-event-timing is-live' : 'sports-event-timing'}>
      <strong>{timing.primary}</strong>
      {timing.secondary && <small>{timing.secondary}</small>}
    </div>
  );
}
