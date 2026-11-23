import { forwardRef } from "react";
import { STACK_COLORS, type StackColor } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import { labelColor, type StackView } from "../playback/scene";
import { Gem } from "./CardFace";

type Props = {
  stacks: Record<StackColor, StackView>;
  dead: boolean;
  registerSlot: (color: StackColor, element: HTMLDivElement | null) => void;
};

/**
 * Three compact compartments. Each new card lands on top of the previous one,
 * offset upward so every card's value foot stays visible. A purple boost is
 * shown as a ×N chip on the compartment and multiplies its total.
 */
export function CardBoard({ stacks, dead, registerSlot }: Props) {
  return (
    <div className={`board ${dead ? "is-dead" : ""}`} aria-label="Card stacks">
      {STACK_COLORS.map((color) => (
        <Compartment key={color} stack={stacks[color]} ref={(element) => registerSlot(color, element)} />
      ))}
    </div>
  );
}

const Compartment = forwardRef<HTMLDivElement, { stack: StackView }>(function Compartment({ stack }, ref) {
  const live = stack.cards.filter((card) => card.state !== "dying");
  const boosted = stack.factor > 1;
  return (
    <section
      className={`comp tone-${stack.color} ${stack.hot ? "is-hot" : ""} ${live.length === 0 ? "is-empty" : ""} ${boosted ? "is-boosted" : ""}`}
      aria-label={`${labelColor(stack.color)} stack`}
    >
      <header className="comp-head">
        <span className="comp-name">{labelColor(stack.color)}</span>
        {boosted ? (
          <span key={stack.boostKey ?? "chip"} className="comp-chip" data-testid={`chip-${stack.color}`}>
            ×{stack.factor}
          </span>
        ) : null}
      </header>
      <div className="comp-well" style={{ ["--n" as string]: Math.max(stack.cards.length, 1) }}>
        <div className="comp-slot" ref={ref} aria-hidden="true" style={{ ["--i" as string]: live.length }}>
          <Gem />
        </div>
        {stack.cards.map((card, index) => (
          <div
            key={card.id}
            className={`stack-card tone-${stack.color} is-${card.state}`}
            style={{ ["--i" as string]: index }}
            data-testid={`stack-card-${card.id}`}
          >
            <span className="stack-card-index">{labelColor(stack.color)}</span>
            <strong className="stack-card-value">{formatMultiplier(card.valueMicros)}</strong>
            <span className="stack-card-foot">{formatMultiplier(card.valueMicros)}</span>
          </div>
        ))}
        {stack.boostKey ? <div key={stack.boostKey} className="comp-flash" aria-hidden="true" /> : null}
      </div>
      <footer className="comp-total">
        <span>{live.length} card{live.length === 1 ? "" : "s"}</span>
        <strong data-testid={`stack-${stack.color}-total`}>{live.length === 0 && !boosted ? "—" : formatMultiplier(stack.totalMicros)}</strong>
      </footer>
    </section>
  );
});
