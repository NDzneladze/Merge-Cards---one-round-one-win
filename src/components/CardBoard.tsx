import { forwardRef } from "react";
import { FULL_STACK_COUNT } from "../engine/config";
import type { StackColor } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import { labelColor, type StackView } from "../playback/scene";
import { CardBack, CardFace, Mark } from "./CardFace";

type Props = {
  colors: readonly StackColor[];
  stacks: Record<StackColor, StackView>;
  dead: boolean;
  /** Compact n/10 marker. Only while the paid round is still unfolding. */
  showProgress: boolean;
  registerSlot: (color: StackColor, element: HTMLDivElement | null) => void;
};

/**
 * One pile per eligible colour, bottoms aligned, sitting just above the pack.
 * A pile is the cards themselves: the newest face is in front at the bottom
 * and each older card peeks above it by exactly its corner strip.
 */
export function CardBoard({ colors, stacks, dead, showProgress, registerSlot }: Props) {
  return (
    <div className={`board piles-${colors.length} ${dead ? "is-dead" : ""}`} aria-label="Card piles">
      {colors.map((color) => (
        <Pile key={color} stack={stacks[color]} showProgress={showProgress} ref={(element) => registerSlot(color, element)} />
      ))}
    </div>
  );
}

const Pile = forwardRef<HTMLDivElement, { stack: StackView; showProgress: boolean }>(function Pile({ stack, showProgress }, ref) {
  const live = stack.cards.filter((card) => card.state !== "dying");
  const boosted = stack.factor > 1;
  const name = labelColor(stack.color);
  const occupied = stack.cards.length > 0;
  const progress = showProgress && !stack.fullStack && live.length > 0;
  return (
    <section
      className={`pile tone-${stack.color} ${stack.hot ? "is-hot" : ""} ${occupied ? "" : "is-empty"} ${boosted ? "is-boosted" : ""} ${stack.fullStack ? "is-full" : ""}`}
      aria-label={`${name} pile`}
      data-testid={`pile-${stack.color}`}
    >
      <header className="pile-tag">
        <Mark tone={stack.color} className="pile-mark" />
        <span className="pile-name">{name}</span>
        {boosted ? (
          <span key={stack.boostKey ?? "chip"} className="pile-chip" data-testid={`chip-${stack.color}`}>
            ×{stack.factor}
          </span>
        ) : null}
      </header>
      <div className="pile-well" style={{ ["--n" as string]: Math.max(stack.cards.length, 1) }}>
        <div className="pile-slot" ref={ref} aria-hidden="true">
          {occupied ? null : <CardBack size="stack" className="landing-mark" />}
        </div>
        {stack.cards.map((card, index) => (
          <div
            key={card.id}
            className={`stack-card tone-${stack.color} is-${card.state}`}
            style={{ ["--i" as string]: index }}
            data-testid={`stack-card-${card.id}`}
          >
            <CardFace card={{ kind: "value", id: card.id, color: stack.color, valueMicros: card.valueMicros }} size="stack" />
          </div>
        ))}
        {stack.boostKey ? <div key={stack.boostKey} className="pile-flash" aria-hidden="true" /> : null}
      </div>
      {stack.fullStack ? (
        <p key={stack.fullStackKey ?? "seal"} className="pile-seal" data-testid={`fullstack-${stack.color}`}>
          Full stack ×2
        </p>
      ) : null}
      <footer className="pile-total">
        <span className={progress ? "is-progress" : ""} data-testid={progress ? `progress-${stack.color}` : undefined}>
          {progress ? `${live.length}/${FULL_STACK_COUNT}` : occupied ? stack.cards.length : 0}
        </span>
        <strong data-testid={`stack-${stack.color}-total`}>{occupied || boosted ? formatMultiplier(stack.totalMicros) : "—"}</strong>
      </footer>
    </section>
  );
});
