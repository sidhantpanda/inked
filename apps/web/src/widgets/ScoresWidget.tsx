import type { WidgetComponentProps } from './types';
import { WidgetLabel } from './WidgetLabel';

export function ScoresWidget({ input, size }: WidgetComponentProps<'scores'>) {
  const limit =
    size === 'small' ? 1 : size === 'wide' ? 2 : size === 'tall' ? 3 : size === 'large' ? 3 : 4;
  return (
    <>
      <WidgetLabel>Match centre</WidgetLabel>
      <div className="game-list">
        {input.games.slice(0, limit).map((game) => (
          <div className="game" key={game.id}>
            <div className="game-competition">{game.competition}</div>
            <div className="team">
              <strong>{game.home}</strong>
              <b>{game.homeScore}</b>
            </div>
            <div className="team">
              <strong>{game.away}</strong>
              <b>{game.awayScore}</b>
            </div>
            <span className={game.live ? 'game-status is-live' : 'game-status'}>{game.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}
