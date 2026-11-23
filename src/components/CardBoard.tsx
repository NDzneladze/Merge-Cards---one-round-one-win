import { forwardRef } from "react";
import { FULL_STACK_COUNT } from "../engine/config";
import type { StackColor } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import { labelColor, type StackView } from "../playback/scene";
import { PEEK_EDGES, VISIBLE_FACES } from "./fitStage";
import { CardFace, Mark } from "./CardFace";

type Props = {
  colors: readonly StackColor[];
  stacks: Record<StackColor, StackView>;
  dead: boolean;
  /** Compact n/10 marker. Only while the paid round is still unfolding. */
  showProgress: boolean;
  registerSlot: (color: StackColor, element: HTMLDivElement | null) => void;
};

/**
 * One pile per eligible colour. The front card is the real face. Four older
 * cards peek by their nameplate. The rest stay in the round and sit under
 * that last peek, with a short thickness ridge for the hidden count.
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
  const count = stack.cards.length;
  const progress = showProgress && !stack.fullStack && live.length > 0;
  const totalLabel = occupied || boosted ? formatMultiplier(stack.totalMicros) : "empty";
  const shown = Math.min(stack.cards.length, VISIBLE_FACES);
  return (
    <section
      className={`pile tone-${stack.color} ${stack.hot ? "is-hot" : ""} ${occupied ? "" : "is-empty"} ${boosted ? "is-boosted" : ""} ${stack.fullStack ? "is-full" : ""}`}
      aria-label={`${name} pile, ${count === 1 ? "1 card" : `${count} cards`}, total ${totalLabel}`}
      data-testid={`pile-${stack.color}`}
      data-count={count}
      data-shown={shown}
    >
      <header className="pile-tag">
        <Mark tone={stack.color} className="pile-mark" />
        <span className="pile-name">{name}</span>
        {boosted ? (
          <span key={stack.boostKey ?? "chip"} className="pile-chip" data-testid={`chip-${stack.color}`}>
            ×{stack.factor}
          </span>
        ) : null}
        {stack.fullStack ? (
          <p key={stack.fullStackKey ?? "seal"} className="pile-seal" data-testid={`fullstack-${stack.color}`}>
            Full stack ×2
          </p>
        ) : null}
      </header>
      <div className="pile-well" style={{ ["--n" as string]: Math.max(stack.cards.length, 1) }}>
        <div className="pile-slot" ref={ref}>
          {occupied ? null : (
            <div className="landing-hint" aria-hidden="true">
              <Mark tone={stack.color} className="landing-glyph" />
            </div>
          )}
        </div>
        {stack.cards.length > VISIBLE_FACES ? <div className="pile-thickness" data-testid={`thickness-${stack.color}`} aria-hidden="true" /> : null}
        {stack.cards.map((card, index) => {
          const depth = stack.cards.length - 1 - index;
          const visible = depth <= PEEK_EDGES;
          return (
            <div
              key={card.id}
              className={`stack-card tone-${stack.color} is-${card.state} ${visible ? "is-shown" : "is-buried"}`}
              style={{ ["--i" as string]: index, ["--depth" as string]: depth }}
              data-testid={`stack-card-${card.id}`}
              data-depth={depth}
              aria-hidden="true"
            >
              <CardFace card={{ kind: "value", id: card.id, color: stack.color, valueMicros: card.valueMicros }} size="stack" />
            </div>
          );
        })}
        {stack.boostKey ? <div key={stack.boostKey} className="pile-flash" aria-hidden="true" /> : null}
      </div>
      <footer className="pile-total">
        <span className="pile-count" data-testid={`count-${stack.color}`}>
          {progress ? (
            <em className="is-progress" data-testid={`progress-${stack.color}`}>
              {count}/{FULL_STACK_COUNT}
            </em>
          ) : occupied ? (
            `${count} ${count === 1 ? "CARD" : "CARDS"}`
          ) : (
            "—"
          )}
        </span>
        <strong data-testid={`stack-${stack.color}-total`}>{occupied || boosted ? formatMultiplier(stack.totalMicros) : "—"}</strong>
      </footer>
    </section>
  );
});
