import type { DemoConfig, TierRule } from "./config";
import { DEMO_CONFIG } from "./config";
import { drawKind, drawValue } from "./draw";
import { boardTotal, payoutMicros, stackTotal, valueToMicros } from "./money";
import { createRng } from "./rng";
import {
  STACK_COLORS,
  type Card,
  type RoundEvent,
  type RoundResult,
  type ScriptedDraw,
  type StackColor,
  type StackState,
  type WinTier,
} from "./types";

export type ResolveInput = {
  seed: string;
  stake: number;
  config?: DemoConfig;
  /** Test/demo override. Production play leaves this empty and draws from the seed. */
  script?: readonly ScriptedDraw[];
};

/**
 * Purple targeting rule:
 *   1. the stack with the most cards,
 *   2. tie → the stack with the highest current total,
 *   3. tie → the leftmost stack.
 * Only stacks that hold at least one card are eligible. If every stack is
 * empty the boost lands on the leftmost stack and applies to whatever
 * arrives there later.
 */
export function chooseBoostTarget(stacks: readonly StackState[]): StackColor {
  const eligible = stacks.filter((stack) => stack.cards.length > 0);
  const pool = eligible.length > 0 ? eligible : stacks;
  let best = pool[0];
  if (!best) throw new Error("No stacks to boost");
  for (const stack of pool.slice(1)) {
    if (stack.cards.length > best.cards.length) {
      best = stack;
      continue;
    }
    if (stack.cards.length === best.cards.length && stackTotal(stack) > stackTotal(best)) {
      best = stack;
    }
  }
  return best.color;
}

export function tierFor(multiplierMicros: bigint, tiers: readonly TierRule[]): WinTier {
  if (multiplierMicros <= 0n) return "none";
  for (const rule of tiers) {
    if (multiplierMicros >= rule.minMicros) return rule.tier;
  }
  return "win";
}

function emptyStacks(): StackState[] {
  return STACK_COLORS.map((color) => ({ color, cards: [], factor: 1 }));
}

/**
 * Pure round resolver. No timers, DOM, or Math.random.
 * One call debits the stake once and emits exactly one terminal `round_end`.
 */
export function resolveRound(input: ResolveInput): RoundResult {
  const config = input.config ?? DEMO_CONFIG;
  if (!Number.isInteger(config.cardsPerPack) || config.cardsPerPack < 1) {
    throw new Error("cardsPerPack must be a positive integer");
  }
  if (!Number.isInteger(config.packsPerRound) || config.packsPerRound < 1) {
    throw new Error("packsPerRound must be a positive integer");
  }

  const rng = createRng(input.seed);
  const script = [...(input.script ?? [])];
  let serial = 1;
  const nextId = (): string => {
    const id = `c${String(serial).padStart(4, "0")}`;
    serial += 1;
    return id;
  };

  const drawCard = (): Card => {
    const scripted = script.shift();
    const kind = scripted ? scripted.kind : drawKind(rng, config.weights);
    const id = nextId();
    if (kind === "red") return { kind: "red", id };
    if (kind === "purple") return { kind: "purple", id, factor: config.purpleFactor };
    const valueMicros =
      scripted && scripted.kind === kind && "value" in scripted && scripted.value !== undefined
        ? valueToMicros(scripted.value)
        : drawValue(rng, config.ranges[kind]);
    return { kind: "value", id, color: kind, valueMicros };
  };

  const events: RoundEvent[] = [];
  let stacks = emptyStacks();
  let outcome: RoundResult["outcome"] = "resolved";
  let lostMicros = 0n;
  let opened = 0;
  let ended = false;

  for (let packNo = 1; packNo <= config.packsPerRound && !ended; packNo += 1) {
    opened = packNo;
    events.push({ type: "pack_open", packNo, cards: config.cardsPerPack });

    for (let position = 0; position < config.cardsPerPack; position += 1) {
      const card = drawCard();
      events.push({ type: "card_reveal", card, packNo, position });

      if (card.kind === "red") {
        lostMicros = boardTotal(stacks);
        stacks = emptyStacks();
        outcome = "bust";
        events.push({ type: "bust", cardId: card.id, lostMicros });
        events.push({ type: "round_end", multiplierMicros: 0n, outcome: "bust", tier: "none" });
        ended = true;
        break;
      }

      if (card.kind === "purple") {
        const color = chooseBoostTarget(stacks);
        stacks = stacks.map((stack) =>
          stack.color === color ? { ...stack, factor: stack.factor * card.factor } : stack,
        );
        const target = stacks.find((stack) => stack.color === color)!;
        events.push({
          type: "boost",
          cardId: card.id,
          color,
          factor: card.factor,
          stackFactor: target.factor,
          stackTotalMicros: stackTotal(target),
          totalMicros: boardTotal(stacks),
        });
        continue;
      }

      stacks = stacks.map((stack) =>
        stack.color === card.color ? { ...stack, cards: [...stack.cards, card] } : stack,
      );
      const target = stacks.find((stack) => stack.color === card.color)!;
      events.push({
        type: "stack_add",
        cardId: card.id,
        color: card.color,
        stackTotalMicros: stackTotal(target),
        totalMicros: boardTotal(stacks),
      });
    }
  }

  const multiplierMicros = ended ? 0n : boardTotal(stacks);
  const tier = ended ? "none" : tierFor(multiplierMicros, config.tiers);
  if (!ended) {
    events.push({ type: "round_end", multiplierMicros, outcome: "resolved", tier });
  }

  return {
    seed: input.seed,
    stake: input.stake,
    events,
    outcome,
    multiplierMicros,
    payoutMicros: payoutMicros(input.stake, multiplierMicros),
    tier,
    openedPacks: opened,
    stacks,
    lostMicros,
    stakeDebits: 1,
  };
}
