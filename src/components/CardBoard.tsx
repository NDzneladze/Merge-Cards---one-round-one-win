import { forwardRef } from "react";
import type { StackColor } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import { labelColor, type StackView } from "../playback/scene";
import { Gem } from "./CardFace";

type Props = {
  colors: readonly StackColor[];
  stacks: Record<StackColor, StackView>;
  dead: boolean;
  registerSlot: (color: StackColor, element: HTMLDivElement | null) => void;
};

/**
 * Compact card piles, one per eligible colour, side by side in the middle of
 * the stage. There is no box around a pile: it is the cards themselves. Each
 * new card slides in on top, pushed up by a small peek so every earlier
 * card's value strip stays readable. A purple boost is a ×N chip on the tag.
 */
export function CardBoard({ colors, stacks, dead, registerSlot }: Props) {
  return (
    <div className={`board piles-${colors.length} ${dead ? "is-dead" : ""}`} aria-label="Card piles">
      {colors.map((color) => (
        <Pile key={color} stack={stacks[color]} ref={(element) => registerSlot(color, element)} />
      ))}
    </div>
  );
}

const Pile = forwardRef<HTMLDivElement, { stack: StackView }>(function Pile({ stack }, ref) {
  const live = stack.cards.filter((card) => card.state !== "dying");
  const boosted = stack.factor > 1;
  const name = labelColor(stack.color);
  return (
    <section
      className={`pile tone-${stack.color} ${stack.hot ? "is-hot" : ""} ${live.length === 0 ? "is-empty" : ""} ${boosted ? "is-boosted" : ""}`}
      aria-label={`${name} pile`}
      data-testid={`pile-${stack.color}`}
    >
      <header className="pile-tag">
        <span className="pile-name">{name}</span>
        {boosted ? (
          <span key={stack.boostKey ?? "chip"} className="pile-chip" data-testid={`chip-${stack.color}`}>
            ×{stack.factor}
          </span>
        ) : null}
      </header>
      <div className="pile-well" style={{ ["--n" as string]: Math.max(stack.cards.length, 1) }}>
        <div className="pile-slot" ref={ref} aria-hidden="true" style={{ ["--i" as string]: live.length }}>
          <Gem />
        </div>
        {stack.cards.map((card, index) => (
          <div
            key={card.id}
            className={`stack-card tone-${stack.color} is-${card.state}`}
            style={{ ["--i" as string]: index }}
            data-testid={`stack-card-${card.id}`}
          >
            <span className="stack-card-strip">
              <span className="stack-card-index">{name}</span>
              <span className="stack-card-strip-value">{formatMultiplier(card.valueMicros)}</span>
            </span>
            <strong className="stack-card-value">{formatMultiplier(card.valueMicros)}</strong>
            <Gem className="stack-card-pip" />
          </div>
        ))}
        {stack.boostKey ? <div key={stack.boostKey} className="pile-flash" aria-hidden="true" /> : null}
      </div>
      <footer className="pile-total">
        <span>{live.length}</span>
        <strong data-testid={`stack-${stack.color}-total`}>{live.length === 0 && !boosted ? "—" : formatMultiplier(stack.totalMicros)}</strong>
      </footer>
    </section>
  );
});
