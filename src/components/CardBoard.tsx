import { COLORS } from "../engine/types";
import type { ColorCard } from "../engine/types";
import { formatMultiplier, levelMicros } from "../engine/money";
import { labelColor } from "../playback/reduce";

type Props = {
  board: readonly ColorCard[];
  hotIds: readonly string[];
  wiped: boolean;
};

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

export function CardBoard({ board, hotIds, wiped }: Props) {
  return (
    <div className={`board ${wiped ? "is-wiped" : ""}`} aria-label="Persistent merge board">
      {COLORS.map((color) => {
        const cards = board.filter((card) => card.color === color);
        const groups = LEVELS.map((level) => cards.filter((card) => card.level === level)).filter(
          (group) => group.length > 0,
        );
        return (
          <section key={color} className={`lane tone-${color}`} aria-label={`${labelColor(color)} cards`}>
            <header>
              <span>{labelColor(color)}</span>
              <strong>{cards.length}</strong>
            </header>
            {groups.length === 0 ? (
              <p className="lane-empty">Waiting</p>
            ) : (
              <div className="stacks">
                {groups.map((group) => {
                  const sample = group[0];
                  if (!sample) return null;
                  const hot = group.some((card) => hotIds.includes(card.id));
                  return (
                    <div key={sample.level} className={`stack ${hot ? "is-hot" : ""}`}>
                      <span className="stack-level">L{sample.level}</span>
                      <span className="stack-count">×{group.length}</span>
                      <span className="stack-value">{formatMultiplier(levelMicros(sample.level))}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
