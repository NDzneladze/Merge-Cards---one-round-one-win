import { forwardRef, useEffect, useState } from "react";
import { FULL_STACK_COUNT, FULL_STACK_FACTOR, SUPER_STACK_COUNT, SUPER_STACK_FACTOR } from "../engine/config";
import type { Card, StackColor } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import { labelColor, type Burst, type StackCard, type StackView } from "../playback/scene";
import { PLAYBACK_SCALE } from "../playback/timing";
import { PEEK_EDGES, VISIBLE_FACES } from "./fitStage";
import { CardFace, Mark } from "./CardFace";

type Props = {
  colors: readonly StackColor[];
  stacks: Record<StackColor, StackView>;
  dead: boolean;
  /** Lights the "close to a milestone" pulse. The goals themselves stay visible. */
  showProgress: boolean;
  /** The short label for the card that just landed. Shown over the pile it belongs to. */
  burst: Burst | null;
  tempo?: number;
  registerSlot: (color: StackColor, element: HTMLDivElement | null) => void;
};

/** A milestone is "close" in the last three cards before 10 or before 20. */
const NEAR_BONUS = 3;

/**
 * One pile per eligible colour. The front card is the real face. Four older
 * cards peek by their nameplate. The rest stay in the round and sit under
 * that last peek, with a short thickness ridge for the hidden count.
 * A grey 0× card is a real card in the pile: it shows its own face and counts.
 */
export function CardBoard({ colors, stacks, dead, showProgress, burst, tempo = 1, registerSlot }: Props) {
  return (
    <div className={`board piles-${colors.length} ${dead ? "is-dead" : ""}`} aria-label="Card piles">
      {colors.map((color) => (
        <Pile
          key={color}
          stack={stacks[color]}
          showProgress={showProgress}
          tempo={tempo}
          // The Stack Bonus has its own ribbon on the pile, so its burst is not drawn twice.
          burst={burst && burst.color === color && burst.tone !== "stack" ? burst : null}
          ref={(element) => registerSlot(color, element)}
        />
      ))}
    </div>
  );
}

function faceOf(card: StackCard, color: StackColor): Card {
  return card.kind === "grey" ? { kind: "grey", id: card.id } : { kind: "value", id: card.id, color, valueMicros: card.valueMicros };
}

type PileProps = { stack: StackView; showProgress: boolean; burst: Burst | null; tempo: number };

/** Two goals, always: 10 cards → ×2, 20 cards → ×4. The bar runs to 20, not to 10. */
function MilestoneRail({ color, count, factor, near, hot }: { color: StackColor; count: number; factor: number; near: boolean; hot: boolean }) {
  const capped = Math.min(count, SUPER_STACK_COUNT);
  const goal = factor >= FULL_STACK_FACTOR ? SUPER_STACK_COUNT : FULL_STACK_COUNT;
  const fraction = factor >= SUPER_STACK_FACTOR ? `${SUPER_STACK_COUNT}/${SUPER_STACK_COUNT}` : `${Math.min(count, goal)}/${goal}`;
  const aria =
    factor >= SUPER_STACK_FACTOR
      ? `${count} cards. Stack ×${SUPER_STACK_FACTOR} active. Max tier.`
      : factor >= FULL_STACK_FACTOR
        ? `${count} of ${SUPER_STACK_COUNT} cards. Stack ×${FULL_STACK_FACTOR} active. 20 cards → ×${SUPER_STACK_FACTOR}.`
        : `${count} of ${FULL_STACK_COUNT} cards toward Stack ×${FULL_STACK_FACTOR}. 20 cards → ×${SUPER_STACK_FACTOR}.`;
  return (
    <div
      className={`pile-mile ${near ? "is-near" : ""} ${factor >= FULL_STACK_FACTOR ? "is-tier2" : ""} ${factor >= SUPER_STACK_FACTOR ? "is-tier4" : ""} ${hot ? "is-hot" : ""}`}
      data-testid={`milestones-${color}`}
    >
      <div className="pile-mile-goals">
        {factor >= FULL_STACK_FACTOR ? (
          <span className={`pile-seal ${factor >= SUPER_STACK_FACTOR ? "is-super" : ""}`} data-testid={`fullstack-${color}`}>
            Stack ×{factor >= SUPER_STACK_FACTOR ? SUPER_STACK_FACTOR : FULL_STACK_FACTOR}
          </span>
        ) : (
          <span data-testid={`goal10-${color}`}>10→×{FULL_STACK_FACTOR}</span>
        )}
        <b className={`pile-progress ${near ? "is-near" : ""}`} data-testid={`progress-${color}`} aria-label={aria}>
          {fraction}
        </b>
        <span data-testid={`goal20-${color}`} className={factor >= SUPER_STACK_FACTOR ? "is-done" : ""}>
          {factor >= SUPER_STACK_FACTOR ? "MAX" : `20→×${SUPER_STACK_FACTOR}`}
        </span>
      </div>
      <div className="pile-mile-bar" style={{ ["--fill" as string]: `${(capped / SUPER_STACK_COUNT) * 100}%` }} aria-hidden="true">
        <i />
      </div>
    </div>
  );
}

const Pile = forwardRef<HTMLDivElement, PileProps>(function Pile({ stack, showProgress, burst, tempo }, ref) {
  const live = stack.cards.filter((card) => card.state !== "dying");
  const boosted = stack.factor > 1;
  const name = labelColor(stack.color);
  const occupied = stack.cards.length > 0;
  const count = stack.cards.length;
  const greys = stack.cards.filter((card) => card.kind === "grey").length;
  const tier = stack.stackBonusFactor;
  const nextAt = tier >= SUPER_STACK_FACTOR ? null : tier >= FULL_STACK_FACTOR ? SUPER_STACK_COUNT : FULL_STACK_COUNT;
  const near = showProgress && nextAt !== null && count >= nextAt - NEAR_BONUS && count < nextAt;
  const shownTotal = useCountUp(stack.totalMicros, stack.preBonusMicros, stack.bonusHot, stack.stackBonusKey, COUNT_UP_MS * tempo);
  const totalLabel = occupied || boosted ? formatMultiplier(stack.totalMicros) : "empty";
  const shown = Math.min(stack.cards.length, VISIBLE_FACES);
  const tierLabel =
    tier >= SUPER_STACK_FACTOR
      ? `, Stack Bonus ×${SUPER_STACK_FACTOR}, max tier`
      : tier >= FULL_STACK_FACTOR
        ? `, Stack Bonus ×${FULL_STACK_FACTOR}, next ${SUPER_STACK_COUNT} cards ×${SUPER_STACK_FACTOR}`
        : "";
  const superHot = stack.bonusHot && tier >= SUPER_STACK_FACTOR;
  return (
    <section
      className={`pile tone-${stack.color} ${stack.hot ? "is-hot" : ""} ${occupied ? "" : "is-empty"} ${boosted ? "is-boosted" : ""} ${tier >= FULL_STACK_FACTOR ? "is-full" : ""} ${tier >= SUPER_STACK_FACTOR ? "is-super" : ""} ${stack.bonusHot ? "is-bonus-hot" : ""} ${superHot ? "is-super-hot" : ""}`}
      aria-label={`${name} pile, ${count === 1 ? "1 card" : `${count} cards`}, total ${totalLabel}${tierLabel}`}
      data-testid={`pile-${stack.color}`}
      data-count={count}
      data-greys={greys}
      data-shown={shown}
      data-tier={tier}
    >
      {burst ? (
        <p key={burst.id} className={`burst tone-${burst.tone} color-${stack.color}`} aria-hidden="true">
          {burst.text}
        </p>
      ) : null}
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
        <div className="pile-slot" ref={ref}>
          {live.length > 0 ? null : (
            <div className="landing-hint" aria-hidden="true">
              <Mark tone={stack.color} className="landing-glyph" />
            </div>
          )}
        </div>
        {tier >= FULL_STACK_FACTOR ? <div key={`halo-${stack.stackBonusKey ?? ""}`} className="pile-halo" aria-hidden="true" /> : null}
        {stack.cards.length > VISIBLE_FACES ? <div className="pile-thickness" data-testid={`thickness-${stack.color}`} aria-hidden="true" /> : null}
        {stack.cards.map((card, index) => {
          const depth = stack.cards.length - 1 - index;
          const visible = depth <= PEEK_EDGES;
          return (
            <div
              key={card.id}
              className={`stack-card tone-${card.kind === "grey" ? "grey" : stack.color} kind-${card.kind} is-${card.state} ${visible ? "is-shown" : "is-buried"}`}
              style={{ ["--i" as string]: index, ["--depth" as string]: depth }}
              data-testid={`stack-card-${card.id}`}
              data-kind={card.kind}
              data-depth={depth}
              aria-hidden="true"
            >
              <CardFace card={faceOf(card, stack.color)} size="stack" />
            </div>
          );
        })}
        {stack.boostKey ? <div key={`flash-${stack.boostKey}`} className="pile-flash" aria-hidden="true" /> : null}
        {stack.bonusHot ? (
          <div
            key={`bonus-${stack.stackBonusKey ?? ""}`}
            className={`pile-bonus ${superHot ? "is-super" : ""}`}
            data-testid={`stack-bonus-${stack.color}`}
            role="status"
          >
            <span className="pile-bonus-rays" aria-hidden="true" />
            <p className="pile-bonus-ribbon">
              <span>{superHot ? "Super stack" : "Stack bonus"}</span>
              <strong>
                {superHot && stack.bonusFromFactor === FULL_STACK_FACTOR ? <s>×{FULL_STACK_FACTOR}</s> : null}
                ×{tier}
              </strong>
            </p>
          </div>
        ) : null}
      </div>
      <footer className="pile-foot">
        <MilestoneRail color={stack.color} count={count} factor={tier} near={near} hot={stack.bonusHot} />
        {occupied || boosted ? (
          <div className="pile-total">
            <span className="pile-count" data-testid={`count-${stack.color}`}>
              {count} {count === 1 ? "CARD" : "CARDS"}
            </span>
            <strong data-testid={`stack-${stack.color}-total`} data-total={formatMultiplier(stack.totalMicros)}>
              <small>Pile</small>
              {formatMultiplier(shownTotal)}
            </strong>
          </div>
        ) : null}
      </footer>
    </section>
  );
});

const COUNT_UP_MS = 900 * PLAYBACK_SCALE;

/**
 * Shows `target`, except on the step where the Stack Bonus lands: there it
 * runs from the pre-bonus total up to the doubled one, so the ×2 is seen.
 */
function useCountUp(target: bigint, from: bigint | null, active: boolean, key: string | null, duration: number): bigint {
  const [shown, setShown] = useState<bigint | null>(null);
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const canCount = active && from !== null && from < target && key !== null && typeof requestAnimationFrame === "function";
  useEffect(() => {
    if (!canCount || from === null) return;
    const span = Number(target - from);
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      if (t < 1) {
        // Whole cents, so the figure never shows more digits than a multiplier has.
        setShown(from + (BigInt(Math.round(span * eased)) / 10_000n) * 10_000n);
        frame = requestAnimationFrame(tick);
      } else {
        setShown(null);
        setDoneKey(key);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setShown(null);
    };
  }, [canCount, duration, from, key, target]);
  // Until the count has run for this bonus, the first painted figure is the old total, never the new one.
  if (canCount && from !== null && doneKey !== key) return shown ?? from;
  return target;
}
