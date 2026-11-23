import type { DemoConfig, TierRule } from "./config";
import { DEFAULT_DIFFICULTY, MICRO, configFor, stackMilestoneAt } from "./config";
import { drawKind, drawValue } from "./draw";
import { boardTotal, payoutMicros, stackTotal, valueToMicros } from "./money";
import { createRng, type Rng } from "./rng";
import type { Card, Difficulty, PileCard, RoundEvent, RoundResult, ScriptedDraw, StackColor, StackState, WinTier } from "./types";

export type ResolveInput = {
  seed: string;
  stake: number;
  /** Chosen before Play and locked for the round. Ignored when `config` is given. */
  difficulty?: Difficulty;
  config?: DemoConfig;
  /** Test/demo override. Production play leaves this empty and draws from the seed. */
  script?: readonly ScriptedDraw[];
};

/**
 * Purple targeting over the difficulty's eligible piles. The count is the
 * physical pile: every landed card, Grey included. Purple, Red and +1 PACK
 * never join a pile, so they never increase it.
 *   1. the pile with the most physical cards,
 *   2. tie → the pile with the highest current total (existing Purple factors
 *      and Stack Bonus included),
 *   3. tie → the leftmost pile.
 * A pile of only Grey cards is occupied and can take the boost. Its total
 * stays 0× until a value card joins, and the factor applies to that card.
 * If every eligible pile is empty, the boost lands on the leftmost one
 * (Green on Easy and Medium, Blue on Hard).
 */
export function chooseBoostTarget(stacks: readonly StackState[]): StackColor {
  const occupied = stacks.filter((stack) => stack.cards.length > 0);
  const pool = occupied.length > 0 ? occupied : stacks;
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

/**
 * Grey routing. A grey 0× card joins a random pile that already holds a card.
 * If every pile is empty it joins a random eligible pile.
 * `rng` is the round's routing stream, never the card stream.
 */
export function chooseGreyTarget(stacks: readonly StackState[], rng: Pick<Rng, "nextInt">): StackColor {
  const occupied = stacks.filter((stack) => stack.cards.length > 0);
  const pool = occupied.length > 0 ? occupied : stacks;
  const pick = pool[pool.length === 1 ? 0 : rng.nextInt(pool.length)];
  if (!pick) throw new Error("No pile for a grey card");
  return pick.color;
}

export function tierFor(multiplierMicros: bigint, tiers: readonly TierRule[]): WinTier {
  if (multiplierMicros <= 0n) return "none";
  for (const rule of tiers) {
    if (multiplierMicros >= rule.minMicros) return rule.tier;
  }
  if (multiplierMicros < MICRO) return "return";
  if (multiplierMicros === MICRO) return "even";
  return "win";
}

function emptyStacks(colors: readonly StackColor[]): StackState[] {
  return colors.map((color) => ({ color, cards: [], factor: 1, stackBonusFactor: 1 }));
}

/**
 * Pure round resolver. No timers, DOM, or Math.random.
 *
 * One stake opens one pack. Every +1 PACK card queues one more pack of the
 * same round, up to `maxPacks` in total; stacks and boosts persist across
 * packs. A red card ends the whole round at 0× at once, cancelling the queue.
 * One call debits the stake once and emits exactly one terminal `round_end`.
 */
export function resolveRound(input: ResolveInput): RoundResult {
  const config = input.config ?? configFor(input.difficulty ?? DEFAULT_DIFFICULTY);
  if (!Number.isInteger(config.cardsPerPack) || config.cardsPerPack < 1) {
    throw new Error("cardsPerPack must be a positive integer");
  }
  if (!Number.isInteger(config.maxPacks) || config.maxPacks < 1) {
    throw new Error("maxPacks must be a positive integer");
  }
  if (config.colors.length === 0) {
    throw new Error("A difficulty needs at least one prize colour");
  }
  for (const color of ["green", "blue", "gold"] as const) {
    if (!config.colors.includes(color) && config.weights[color] !== 0) {
      throw new Error(`${color} is not eligible on ${config.difficulty} but has a draw weight`);
    }
  }

  const rng = createRng(input.seed);
  // Grey routing has its own stream, so a seed deals the same cards whether or not a grey was routed.
  const routing = createRng(`${input.seed}#grey-route`);
  const script = [...(input.script ?? [])];
  let serial = 1;
  const nextId = (): string => {
    const id = `c${String(serial).padStart(4, "0")}`;
    serial += 1;
    return id;
  };

  let opened = 0;
  let pending = 0;
  /** A +1 PACK may only be drawn while a complete extra pack can still be awarded. */
  const canEarnPack = (): boolean => opened + pending < config.maxPacks;

  let scriptedGreyTarget: StackColor | undefined;
  const drawCard = (): Card => {
    const scripted = script.shift();
    scriptedGreyTarget = scripted?.kind === "grey" ? scripted.target : undefined;
    const weights = canEarnPack() ? config.weights : { ...config.weights, extra: 0 };
    const kind = scripted ? scripted.kind : drawKind(rng, weights);
    const id = nextId();
    if (kind === "extra") {
      if (!canEarnPack()) throw new Error("Scripted +1 PACK beyond maxPacks");
      return { kind: "extra", id };
    }
    if (kind === "red") return { kind: "red", id };
    if (kind === "grey") return { kind: "grey", id };
    if (kind === "purple") return { kind: "purple", id, factor: config.purpleFactor };
    if (!config.colors.includes(kind)) throw new Error(`Scripted ${kind} card is not eligible on ${config.difficulty}`);
    const valueMicros =
      scripted && scripted.kind === kind && "value" in scripted && scripted.value !== undefined
        ? valueToMicros(scripted.value)
        : drawValue(rng, config.values[kind]);
    return { kind: "value", id, color: kind, valueMicros };
  };

  const events: RoundEvent[] = [];
  let stacks = emptyStacks(config.colors);
  let outcome: RoundResult["outcome"] = "resolved";
  let lostMicros = 0n;
  let earned = 0;
  let cancelled = 0;
  let greyCards = 0;
  let ended = false;

  /**
   * Puts a value or grey card in a pile. Crossing 10 or 20 cards awards that
   * milestone once, after the landing event, so the landing still carries the
   * pre-award total. The new factor replaces the old one.
   */
  const join = (color: StackColor, card: PileCard): { target: StackState; milestone: ReturnType<typeof stackMilestoneAt> } => {
    const before = stacks.find((stack) => stack.color === color)!;
    const target: StackState = { ...before, cards: [...before.cards, card] };
    stacks = stacks.map((stack) => (stack.color === color ? target : stack));
    const milestone = stackMilestoneAt(target.cards.length);
    return { target, milestone: milestone && milestone.factor !== before.stackBonusFactor ? milestone : undefined };
  };

  const awardStackBonus = (cardId: string, color: StackColor, milestone: { count: number; factor: number }): void => {
    const before = stacks.find((stack) => stack.color === color)!;
    const previousFactor = before.stackBonusFactor;
    const beforeMicros = stackTotal(before);
    stacks = stacks.map((stack) => (stack.color === color ? { ...stack, stackBonusFactor: milestone.factor } : stack));
    const target = stacks.find((stack) => stack.color === color)!;
    events.push({
      type: "stack_bonus",
      cardId,
      color,
      count: target.cards.length,
      threshold: milestone.count,
      previousFactor,
      factor: milestone.factor,
      beforeMicros,
      stackTotalMicros: stackTotal(target),
      totalMicros: boardTotal(stacks),
    });
  };

  while (!ended) {
    opened += 1;
    const packNo = opened;
    events.push({ type: "pack_open", packNo, cards: config.cardsPerPack, pending });

    for (let position = 0; position < config.cardsPerPack; position += 1) {
      const card = drawCard();
      events.push({ type: "card_reveal", card, packNo, position });

      if (card.kind === "red") {
        lostMicros = boardTotal(stacks);
        cancelled = pending;
        pending = 0;
        stacks = emptyStacks(config.colors);
        outcome = "bust";
        events.push({ type: "bust", cardId: card.id, lostMicros, cancelledPacks: cancelled });
        events.push({ type: "round_end", multiplierMicros: 0n, outcome: "bust", tier: "none" });
        ended = true;
        break;
      }

      if (card.kind === "extra") {
        pending += 1;
        earned += 1;
        events.push({ type: "pack_earned", cardId: card.id, pending, totalPacks: opened + pending });
        continue;
      }

      if (card.kind === "grey") {
        greyCards += 1;
        if (scriptedGreyTarget && !config.colors.includes(scriptedGreyTarget)) {
          throw new Error(`Scripted grey target ${scriptedGreyTarget} is not eligible on ${config.difficulty}`);
        }
        const color = scriptedGreyTarget ?? chooseGreyTarget(stacks, routing);
        const joined = join(color, card);
        events.push({
          type: "grey",
          cardId: card.id,
          color,
          count: joined.target.cards.length,
          stackTotalMicros: stackTotal(joined.target),
          totalMicros: boardTotal(stacks),
        });
        if (joined.milestone) awardStackBonus(card.id, color, joined.milestone);
        continue;
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

      const { target, milestone } = join(card.color, card);
      events.push({
        type: "stack_add",
        cardId: card.id,
        color: card.color,
        stackTotalMicros: stackTotal(target),
        totalMicros: boardTotal(stacks),
      });
      if (milestone) awardStackBonus(card.id, card.color, milestone);
    }

    if (ended || pending === 0) break;
    pending -= 1;
  }

  const multiplierMicros = ended ? 0n : boardTotal(stacks);
  const tier = ended ? "none" : tierFor(multiplierMicros, config.tiers);
  if (!ended) {
    events.push({ type: "round_end", multiplierMicros, outcome: "resolved", tier });
  }

  const payout = payoutMicros(input.stake, multiplierMicros);
  return {
    seed: input.seed,
    stake: input.stake,
    difficulty: config.difficulty,
    colors: config.colors,
    events,
    outcome,
    multiplierMicros,
    payoutMicros: payout,
    netMicros: payout - BigInt(input.stake) * MICRO,
    tier,
    openedPacks: opened,
    earnedPacks: earned,
    cancelledPacks: cancelled,
    stacks,
    lostMicros,
    greyCards,
    stackBonusPiles: ended ? 0 : stacks.filter((stack) => stack.stackBonusFactor >= 2).length,
    superStackPiles: ended ? 0 : stacks.filter((stack) => stack.stackBonusFactor >= 4).length,
    stakeDebits: 1,
  };
}
