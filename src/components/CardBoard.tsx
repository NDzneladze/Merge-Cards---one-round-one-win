import { forwardRef } from "react";
import { COLORS, type Color } from "../engine/types";
import { formatMultiplier, levelMicros, sumLevels } from "../engine/money";
import { labelColor, type LaneCard } from "../playback/scene";

type Props = {
  lanes: Record<Color, LaneCard[]>;
  dead: boolean;
  registerLane: (color: Color, element: HTMLDivElement | null) => void;
};

/**
 * Four fixed merge lanes. Each lane is a pile: the highest level sits on top,
 * lower levels peek out underneath. Because equal cards merge at once, a lane
 * holds at most one card per level, so the pile stays short and readable.
 */
export function CardBoard({ lanes, dead, registerLane }: Props) {
  return (
    <div className={`lanes ${dead ? "is-dead" : ""}`} aria-label="Merge lanes">
      {COLORS.map((color) => (
        <Lane
          key={color}
          color={color}
          cards={lanes[color]}
          ref={(element) => registerLane(color, element)}
        />
      ))}
    </div>
  );
}

type LaneProps = { color: Color; cards: LaneCard[] };

const Lane = forwardRef<HTMLDivElement, LaneProps>(function Lane({ color, cards }, ref) {
  const live = cards.filter((card) => card.state !== "dying");
  const total = sumLevels(live.map((card) => card.level));
  const ordered = [...cards].sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
  const active = cards.some((card) => card.state === "landing" || card.state === "born" || card.state === "collapsing");

  return (
    <section className={`lane tone-${color} ${active ? "is-active" : ""} ${cards.length === 0 ? "is-empty" : ""}`} aria-label={`${labelColor(color)} lane`}>
      <header className="lane-head">
        <span>{labelColor(color)}</span>
        <strong data-testid={`lane-${color}-total`}>{live.length === 0 ? "—" : formatMultiplier(total)}</strong>
      </header>
      <div className="pile">
        <div className="pile-slot" ref={ref} aria-hidden="true">
          <span>{live.length === 0 ? "empty" : "next"}</span>
        </div>
        {ordered.map((card, index) => (
          <div
            key={card.id}
            className={`pile-card tone-${color} is-${card.state}`}
            style={{ ["--i" as string]: index }}
            data-testid={`lane-card-${card.id}`}
          >
            <span className="pile-level">L{card.level}</span>
            <span className="pile-tag">
              L{card.level} · {formatMultiplier(levelMicros(card.level))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
