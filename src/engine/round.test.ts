import { describe, expect, it } from "vitest";
import {
  BLUE_VALUES,
  BLUE_VALUES_HARD,
  CELEBRATION_MIN_MICROS,
  DEMO_CONFIG,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  STACK_MILESTONES,
  SUPER_STACK_FACTOR,
  GOLD_VALUES,
  GREEN_VALUES,
  GREEN_VALUES_EASY,
  MICRO,
  WIN_TIERS,
  configFor,
} from "./config";
import { drawKind, drawValue, rangeSteps, tableWeight, valueBounds, valueSupport, weightTotal } from "./draw";
import { FEATURED_SEEDS } from "./featured";
import { FIXTURES } from "../fixtures";
import { boardTotal, stackTotal } from "./money";
import { createRng } from "./rng";
import { chooseBoostTarget, chooseGreyTarget, resolveRound, tierFor } from "./round";
import { STACK_COLORS, type Card, type Difficulty, type RoundEvent, type RoundResult, type ScriptedDraw, type StackColor, type StackState } from "./types";

const g = (value?: number): ScriptedDraw => ({ kind: "green", value });
const b = (value?: number): ScriptedDraw => ({ kind: "blue", value });
const au = (value?: number): ScriptedDraw => ({ kind: "gold", value });
const purple: ScriptedDraw = { kind: "purple" };
const red: ScriptedDraw = { kind: "red" };
const extra: ScriptedDraw = { kind: "extra" };
const grey: ScriptedDraw = { kind: "grey" };
const greyTo = (target: StackColor): ScriptedDraw => ({ kind: "grey", target });
const valueCards = (stack: StackState): number => stack.cards.filter((card) => card.kind === "value").length;
const greysIn = (stack: StackState): number => stack.cards.filter((card) => card.kind === "grey").length;

/** Six filler greens so a scripted pack can be padded to its full length. */
const fill = (value = 0.1): ScriptedDraw[] => Array.from({ length: 6 }, () => g(value));

function eventsOf(result: RoundResult, type: RoundEvent["type"]): RoundEvent[] {
  return result.events.filter((event) => event.type === type);
}

function transcript(result: RoundResult): string {
  return JSON.stringify(result, (_key, value: unknown) => (typeof value === "bigint" ? `${value}n` : value));
}

function assertSingleSettlement(result: RoundResult): void {
  expect(result.stakeDebits).toBe(1);
  expect(eventsOf(result, "round_end")).toHaveLength(1);
  const end = result.events.at(-1);
  expect(end?.type).toBe("round_end");
  if (end?.type === "round_end") {
    expect(end.multiplierMicros).toBe(result.multiplierMicros);
    expect(end.outcome).toBe(result.outcome);
    expect(end.tier).toBe(result.tier);
  }
  expect(result.payoutMicros).toBe(BigInt(result.stake) * result.multiplierMicros);
  expect(result.netMicros).toBe(result.payoutMicros - BigInt(result.stake) * MICRO);
}

function assertWellFormed(result: RoundResult, config = DEMO_CONFIG, strictValues = false): void {
  let bustSeen = false;
  let reveals = 0;
  let opened = 0;
  let pending = 0;
  let earned = 0;
  let revealsInPack = 0;
  let revealed: Card | null = null;
  expect(result.difficulty).toBe(config.difficulty);
  expect(result.colors).toEqual(config.colors);
  expect(result.stacks.map((stack) => stack.color)).toEqual(config.colors);
  const stacks: StackState[] = config.colors.map((color) => ({ color, cards: [], factor: 1, stackBonusFactor: 1 }));
  for (const event of result.events) {
    if (bustSeen && event.type !== "round_end") {
      throw new Error(`Event ${event.type} followed the red card`);
    }
    if (event.type === "pack_open") {
      if (opened > 0) {
        expect(revealsInPack).toBe(config.cardsPerPack);
        expect(pending).toBeGreaterThan(0);
        pending -= 1;
      }
      opened += 1;
      revealsInPack = 0;
      expect(event.packNo).toBe(opened);
      expect(event.pending).toBe(pending);
      expect(opened).toBeLessThanOrEqual(config.maxPacks);
    }
    if (event.type === "pack_earned") {
      pending += 1;
      earned += 1;
      expect(event.pending).toBe(pending);
      expect(event.totalPacks).toBe(opened + pending);
      // A +1 PACK must always be able to award a complete pack.
      expect(opened + pending).toBeLessThanOrEqual(config.maxPacks);
    }
    if (event.type === "card_reveal") {
      reveals += 1;
      revealsInPack += 1;
      const card = event.card;
      revealed = card;
      if (card.kind === "value") {
        // Only eligible colours may appear, and only on configured denominations.
        expect(config.colors).toContain(card.color);
        if (strictValues) expect(valueSupport(config.values[card.color])).toContain(card.valueMicros);
        const stack = stacks.find((entry) => entry.color === card.color)!;
        stack.cards = [...stack.cards, card];
      }
    }
    if (event.type === "grey") {
      // The grey joins exactly one eligible pile, and an occupied one whenever any pile holds a card.
      if (revealed?.kind !== "grey" || revealed.id !== event.cardId) throw new Error("grey event without its reveal");
      expect(config.colors).toContain(event.color);
      const stack = stacks.find((entry) => entry.color === event.color)!;
      if (stacks.some((entry) => entry.cards.length > 0)) expect(stack.cards.length).toBeGreaterThan(0);
      const before = boardTotal(stacks);
      stack.cards = [...stack.cards, revealed];
      expect(event.count).toBe(stack.cards.length);
      expect(event.stackTotalMicros).toBe(stackTotal(stack));
      expect(event.totalMicros).toBe(boardTotal(stacks));
      // A grey adds 0×. If it crosses 10 or 20, the award arrives on the next event, not this one.
      expect(boardTotal(stacks)).toBe(before);
    }
    if (event.type === "stack_add") {
      const stack = stacks.find((entry) => entry.color === event.color)!;
      expect(event.stackTotalMicros).toBe(stackTotal(stack));
      expect(event.totalMicros).toBe(boardTotal(stacks));
    }
    if (event.type === "stack_bonus") {
      // Once per milestone, on the card that crossed it, right after that card's landing event.
      const stack = stacks.find((entry) => entry.color === event.color)!;
      const milestone = STACK_MILESTONES.find((entry) => entry.count === event.threshold);
      expect(milestone).toBeDefined();
      expect(stack.stackBonusFactor).toBe(event.previousFactor);
      expect(stack.cards.length).toBe(event.threshold);
      expect(stack.cards.at(-1)?.id).toBe(event.cardId);
      expect(event.count).toBe(event.threshold);
      expect(event.factor).toBe(milestone!.factor);
      expect(event.factor).toBeGreaterThan(event.previousFactor);
      expect(event.beforeMicros).toBe(stackTotal(stack));
      const before = stackTotal(stack);
      stack.stackBonusFactor = event.factor;
      // The new factor replaces the old one. 2 → 4 doubles again. It does not become ×8.
      expect(stackTotal(stack)).toBe((before / BigInt(event.previousFactor)) * BigInt(event.factor));
      expect(event.stackTotalMicros).toBe(stackTotal(stack));
      expect(event.totalMicros).toBe(boardTotal(stacks));
    }
    if (event.type === "boost") {
      const stack = stacks.find((entry) => entry.color === event.color)!;
      stack.factor *= event.factor;
      expect(event.stackFactor).toBe(stack.factor);
      expect(event.stackTotalMicros).toBe(stackTotal(stack));
      expect(event.totalMicros).toBe(boardTotal(stacks));
    }
    if (event.type === "bust") {
      bustSeen = true;
      expect(event.lostMicros).toBe(boardTotal(stacks));
      expect(event.cancelledPacks).toBe(pending);
    }
  }
  expect(result.openedPacks).toBe(opened);
  expect(result.earnedPacks).toBe(earned);
  expect(reveals).toBeLessThanOrEqual(config.cardsPerPack * config.maxPacks);
  if (result.outcome === "bust") {
    expect(result.multiplierMicros).toBe(0n);
    expect(result.tier).toBe("none");
    expect(result.netMicros).toBe(-BigInt(result.stake) * MICRO);
    expect(result.cancelledPacks).toBe(pending);
    expect(result.stacks.every((stack) => stack.cards.length === 0 && stack.stackBonusFactor === 1 && stack.factor === 1)).toBe(true);
    expect(result.stackBonusPiles).toBe(0);
    expect(result.superStackPiles).toBe(0);
  } else {
    // Every earned pack was opened: the queue is empty on a safe finish.
    expect(pending).toBe(0);
    expect(result.cancelledPacks).toBe(0);
    expect(opened).toBe(1 + earned);
    expect(reveals).toBe(config.cardsPerPack * opened);
    expect(result.multiplierMicros).toBe(boardTotal(result.stacks));
    expect(result.lostMicros).toBe(0n);
    expect(result.stackBonusPiles).toBe(result.stacks.filter((stack) => stack.stackBonusFactor >= 2).length);
    expect(result.superStackPiles).toBe(result.stacks.filter((stack) => stack.stackBonusFactor >= 4).length);
    expect(result.greyCards).toBe(result.events.filter((event) => event.type === "grey").length);
    if (result.multiplierMicros === 0n) expect(result.tier).toBe("none");
    else if (result.multiplierMicros < MICRO) expect(result.tier).toBe("return");
    if (result.multiplierMicros === MICRO) expect(result.tier).toBe("even");
    if (result.multiplierMicros > MICRO && result.multiplierMicros < CELEBRATION_MIN_MICROS) expect(result.tier).toBe("win");
  }
  assertSingleSettlement(result);
}

const config = (difficulty: Difficulty) => configFor(difficulty);
const seedsFor = (difficulty: Difficulty, count: number, stake = 10) =>
  Array.from({ length: count }, (_, i) => resolveRound({ seed: `${difficulty}-${i}`, stake, difficulty }));

describe("config", () => {
  it("every difficulty has per-mille weights summing to 1000 with zero weight on its ineligible colours", () => {
    for (const id of DIFFICULTY_ORDER) {
      const mode = DIFFICULTIES[id];
      expect(weightTotal(mode.weights)).toBe(1000);
      for (const color of STACK_COLORS) {
        if (mode.colors.includes(color)) expect(mode.weights[color]).toBeGreaterThan(0);
        else expect(mode.weights[color]).toBe(0);
      }
      // Purple, Red and +1 PACK exist in every mode.
      expect(mode.weights.purple).toBeGreaterThan(0);
      expect(mode.weights.red).toBeGreaterThan(0);
      expect(mode.weights.extra).toBeGreaterThan(0);
      expect(mode.weights.grey).toBeGreaterThan(0);
      expect(mode.weights.grey).not.toBe(mode.weights.green);
      // v0.12 did not move Red. These are the v0.10 per-mille weights.
      expect(mode.weights.red).toBe(id === "easy" ? 78 : id === "medium" ? 96 : 290);
      // Grey is noticeably more common than v0.11 (88 / 94 / 50) and stays inside the exploration band.
      const greyBand = id === "hard" ? [90, 130] : [160, 200];
      expect(mode.weights.grey).toBeGreaterThanOrEqual(greyBand[0]!);
      expect(mode.weights.grey).toBeLessThanOrEqual(greyBand[1]!);
      expect(mode.weights.grey).toBeGreaterThan(id === "hard" ? 50 : 94);
      expect(configFor(id).maxPacks).toBe(6);
      expect(configFor(id).cardsPerPack).toBe(6);
    }
  });

  it("maps the three difficulties to their eligible card sets", () => {
    expect(DIFFICULTIES.easy.colors).toEqual(["green", "blue"]);
    expect(DIFFICULTIES.medium.colors).toEqual(["green", "blue", "gold"]);
    expect(DIFFICULTIES.hard.colors).toEqual(["blue", "gold"]);
    expect(DEMO_CONFIG.difficulty).toBe("medium");
  });

  it("keeps green small: at least 75 % of green cards are ≤ 0.20× on Easy and Medium", () => {
    for (const table of [GREEN_VALUES, GREEN_VALUES_EASY]) {
      if (table.kind !== "weighted") throw new Error("green must be a weighted table");
      const total = tableWeight(table);
      const small = table.entries.filter((entry) => entry.valueMicros <= 200_000n).reduce((sum, entry) => sum + entry.weight, 0);
      expect(small / total).toBeGreaterThanOrEqual(0.75);
      for (const value of [100_000n, 120_000n, 130_000n, 1_000_000n]) expect(valueSupport(table)).toContain(value);
      expect(valueBounds(table).minMicros).toBe(100_000n);
      expect(valueBounds(table).maxMicros).toBe(1_000_000n);
    }
    expect(DIFFICULTIES.easy.values.green).toBe(GREEN_VALUES_EASY);
    expect(DIFFICULTIES.medium.values.green).toBe(GREEN_VALUES);
    if (BLUE_VALUES_HARD.kind !== "weighted") throw new Error("hard blue must be a weighted table");
    expect(valueBounds(BLUE_VALUES_HARD)).toEqual({ minMicros: 1_000_000n, maxMicros: 3_000_000n });
    expect(valueBounds(GOLD_VALUES)).toEqual({ minMicros: 5_000_000n, maxMicros: 15_000_000n });
    expect(rangeSteps(BLUE_VALUES.kind === "uniform" ? BLUE_VALUES : (() => { throw new Error("blue"); })())).toBe(41);
    expect(rangeSteps(GOLD_VALUES.kind === "uniform" ? GOLD_VALUES : (() => { throw new Error("gold"); })())).toBe(21);
    expect(WIN_TIERS.map((rule) => rule.tier)).toEqual(["mega", "huge", "big"]);
    expect(WIN_TIERS.at(-1)?.minMicros).toBe(CELEBRATION_MIN_MICROS);
  });

  it("draws only the mode's kinds and only configured denominations", () => {
    for (const id of DIFFICULTY_ORDER) {
      const mode = DIFFICULTIES[id];
      const rng = createRng(`draw-${id}`);
      const seen = new Set<string>();
      for (let i = 0; i < 3_000; i += 1) {
        seen.add(drawKind(rng, mode.weights));
        for (const color of mode.colors) {
          expect(valueSupport(mode.values[color])).toContain(drawValue(rng, mode.values[color]));
        }
      }
      expect([...seen].sort()).toEqual([...mode.colors, "extra", "grey", "purple", "red"].sort());
    }
  });

  it("never draws +1 PACK once its weight is removed from the pool", () => {
    const rng = createRng("no-extra");
    for (let i = 0; i < 2_000; i += 1) {
      expect(drawKind(rng, { ...DEMO_CONFIG.weights, extra: 0 })).not.toBe("extra");
    }
  });
});

describe("difficulty", () => {
  it("only deals eligible colours and only builds eligible piles, in every mode", () => {
    for (const id of DIFFICULTY_ORDER) {
      const mode = DIFFICULTIES[id];
      let dealt = new Set<string>();
      for (const result of seedsFor(id, 300)) {
        assertWellFormed(result, config(id), true);
        for (const event of result.events) {
          if (event.type === "card_reveal" && event.card.kind === "value") dealt.add(event.card.color);
        }
      }
      expect([...dealt].sort()).toEqual([...mode.colors].sort());
      dealt = new Set();
    }
  });

  it("rejects a scripted card of an ineligible colour", () => {
    expect(() => resolveRound({ seed: "x", stake: 1, difficulty: "easy", script: [au(5)] })).toThrow(/gold/);
    expect(() => resolveRound({ seed: "x", stake: 1, difficulty: "hard", script: [g(0.1)] })).toThrow(/green/);
  });

  it("puts purple on the leftmost eligible pile when the board is empty: Green on Easy/Medium, Blue on Hard", () => {
    const easy = resolveRound({ seed: "p", stake: 1, difficulty: "easy", script: [purple, g(0.5), b(1), g(0.5), g(0.5), g(0.5)] });
    expect(eventsOf(easy, "boost")[0]).toMatchObject({ color: "green" });
    // green 2 × 2 + blue 1
    expect(easy.multiplierMicros).toBe(5_000_000n);
    const medium = resolveRound({ seed: "p", stake: 1, difficulty: "medium", script: [purple, au(5), b(1), g(0.5), g(0.5), g(0.5)] });
    expect(eventsOf(medium, "boost")[0]).toMatchObject({ color: "green" });
    const hard = resolveRound({ seed: "p", stake: 1, difficulty: "hard", script: [purple, au(5), b(1), b(1), b(1), b(1)] });
    expect(eventsOf(hard, "boost")[0]).toMatchObject({ color: "blue" });
    // blue 4 × 2 + gold 5
    expect(hard.multiplierMicros).toBe(13_000_000n);
    expect(hard.stacks.map((stack) => stack.color)).toEqual(["blue", "gold"]);
  });

  it("targets an occupied eligible pile by count, then total, then leftmost", () => {
    const hard = resolveRound({ seed: "p2", stake: 1, difficulty: "hard", script: [au(5), b(1), b(1), purple, b(1), b(1)] });
    expect(eventsOf(hard, "boost")[0]).toMatchObject({ color: "blue", stackFactor: 2 });
    const easy = resolveRound({ seed: "p3", stake: 1, difficulty: "easy", script: [g(0.1), b(1), purple, g(0.1), g(0.1), g(0.1)] });
    // 1 card each → higher total → blue.
    expect(eventsOf(easy, "boost")[0]).toMatchObject({ color: "blue" });
  });

  it("a safe round can finish below 1× in every mode that deals Green, and is reported as a return", () => {
    for (const id of ["easy", "medium"] as const) {
      const returns = seedsFor(id, 400).filter(
        (result) => result.outcome === "resolved" && result.multiplierMicros > 0n && result.multiplierMicros < MICRO,
      );
      expect(returns.length).toBeGreaterThan(0);
      for (const result of returns) {
        expect(result.tier).toBe("return");
        expect(result.payoutMicros).toBeGreaterThan(0n);
        expect(result.payoutMicros).toBeLessThan(BigInt(result.stake) * MICRO);
        expect(result.netMicros).toBeLessThan(0n);
      }
    }
    const small = resolveRound({ seed: "small", stake: 10, difficulty: "easy", script: [g(0.1), g(0.12), g(0.13), g(0.1), g(0.1), g(0.15)] });
    expect(small.multiplierMicros).toBe(700_000n);
    expect(small.payoutMicros).toBe(7_000_000n);
    expect(small.netMicros).toBe(-3_000_000n);
    expect(small.tier).toBe("return");
  });

  it("Hard never pays below 1× on a safe finish but busts far more often; it is not strictly better", () => {
    const easy = seedsFor("easy", 2_000, 1);
    const hard = seedsFor("hard", 2_000, 1);
    const mean = (rounds: RoundResult[]) => rounds.reduce((sum, r) => sum + Number(r.multiplierMicros) / 1e6, 0) / rounds.length;
    const bust = (rounds: RoundResult[]) => rounds.filter((r) => r.outcome === "bust").length / rounds.length;
    for (const result of hard) {
      if (result.outcome !== "resolved") continue;
      const prizes = result.stacks.reduce((sum, stack) => sum + valueCards(stack), 0);
      if (prizes === 0) {
        expect(result.multiplierMicros).toBe(0n);
        expect(result.tier).toBe("none");
      } else {
        expect(result.multiplierMicros).toBeGreaterThanOrEqual(MICRO);
      }
    }
    expect(bust(hard)).toBeGreaterThan(bust(easy) + 0.3);
    expect(mean(hard)).toBeLessThan(mean(easy) * 1.6);
    expect(mean(hard)).toBeGreaterThan(0.5);
  });
});

describe("resolveRound", () => {
  it("is deterministic for the same seed and stake", () => {
    const a = resolveRound({ seed: "same", stake: 5 });
    const b2 = resolveRound({ seed: "same", stake: 5 });
    expect(transcript(a)).toBe(transcript(b2));
    expect(transcript(resolveRound({ seed: "other", stake: 5 }))).not.toBe(transcript(a));
  });

  it("opens one pack of six and pays the sum of the stacks", () => {
    const result = resolveRound({ seed: "sum", stake: 10, script: [g(0.31), b(1.5), g(0.2), au(5), b(2.05), g(0.1)] });
    assertWellFormed(result);
    expect(result.outcome).toBe("resolved");
    expect(result.multiplierMicros).toBe(9_160_000n);
    expect(result.payoutMicros).toBe(91_600_000n);
    expect(result.tier).toBe("win");
    expect(result.stacks.map((stack) => stack.cards.length)).toEqual([3, 2, 1]);
  });

  it("ends instantly at 0× when red appears and cancels every remaining card", () => {
    const result = resolveRound({ seed: "red", stake: 10, script: [g(0.5), au(10), red, au(15), au(15), au(15)] });
    assertWellFormed(result);
    expect(result.outcome).toBe("bust");
    expect(result.lostMicros).toBe(10_500_000n);
    expect(eventsOf(result, "card_reveal")).toHaveLength(3);
    expect(result.payoutMicros).toBe(0n);
  });

  it("red on the first card is a bust with nothing lost", () => {
    const result = resolveRound({ seed: "red-first", stake: 1, script: [red] });
    assertWellFormed(result);
    expect(result.lostMicros).toBe(0n);
    expect(eventsOf(result, "card_reveal")).toHaveLength(1);
  });

  it("purple doubles the stack it lands on and boosts compound", () => {
    const result = resolveRound({ seed: "boost", stake: 1, script: [g(0.5), g(0.25), b(2), purple, purple, g(0.25)] });
    assertWellFormed(result);
    const boosts = eventsOf(result, "boost");
    expect(boosts).toHaveLength(2);
    expect(boosts.map((event) => (event.type === "boost" ? event.color : null))).toEqual(["green", "green"]);
    expect(boosts.map((event) => (event.type === "boost" ? event.stackFactor : 0))).toEqual([2, 4]);
    // green (0.5 + 0.25 + 0.25) × 4 + blue 2
    expect(result.multiplierMicros).toBe(6_000_000n);
  });

  it("computes tiers from the final multiplier: return < 1× = even < win < big/huge/mega", () => {
    expect(tierFor(0n, WIN_TIERS)).toBe("none");
    expect(tierFor(10_000n, WIN_TIERS)).toBe("return");
    expect(tierFor(999_999n, WIN_TIERS)).toBe("return");
    expect(tierFor(1_000_000n, WIN_TIERS)).toBe("even");
    expect(tierFor(1_000_001n, WIN_TIERS)).toBe("win");
    expect(tierFor(9_990_000n, WIN_TIERS)).toBe("win");
    expect(tierFor(10_000_000n, WIN_TIERS)).toBe("big");
    expect(tierFor(25_000_000n, WIN_TIERS)).toBe("huge");
    expect(tierFor(50_000_000n, WIN_TIERS)).toBe("mega");
    const big = resolveRound({ seed: "big", stake: 1, script: [au(15), au(15), au(15), au(15), purple, g(0.1)] });
    expect(big.tier).toBe("mega");
    expect(big.multiplierMicros).toBe(120_100_000n);
    const even = resolveRound({ seed: "even", stake: 4, script: [g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.5)] });
    expect(even.tier).toBe("even");
    expect(even.netMicros).toBe(0n);
  });

  it("keeps every featured seed on its advertised outcome", () => {
    expect(FEATURED_SEEDS.map((example) => example.id)).toEqual([
      "chain",
      "small",
      "boost",
      "hard",
      "big",
      "bust",
      "grey",
      "stack",
      "stackPurple",
    ]);
    for (const example of FEATURED_SEEDS) {
      const result = resolveRound({ seed: example.seed, stake: 10, difficulty: example.difficulty });
      assertWellFormed(result, config(example.difficulty), true);
      if (example.id === "chain") {
        expect(example.difficulty).toBe("medium");
        expect(result.outcome).toBe("resolved");
        expect(result.openedPacks).toBe(3);
        expect(result.tier).toBe("win");
        // Two boosters wait under the pack at the same time.
        expect(eventsOf(result, "pack_earned").some((event) => event.type === "pack_earned" && event.pending === 2)).toBe(true);
      }
      if (example.id === "small") {
        expect(example.difficulty).toBe("easy");
        expect(result.outcome).toBe("resolved");
        expect(result.tier).toBe("return");
        expect(result.multiplierMicros).toBe(760_000n);
      }
      if (example.id === "bust") {
        expect(result.outcome).toBe("bust");
        expect(result.cancelledPacks).toBe(2);
      }
      if (example.id === "boost") {
        expect(result.outcome).toBe("resolved");
        expect(result.openedPacks).toBe(2);
        expect(result.tier).toBe("win");
        expect(eventsOf(result, "boost").length).toBeGreaterThan(0);
      }
      if (example.id === "hard") {
        expect(example.difficulty).toBe("hard");
        expect(result.outcome).toBe("resolved");
        expect(result.tier).toBe("big");
        expect(result.stacks.map((stack) => stack.color)).toEqual(["blue", "gold"]);
      }
      if (example.id === "big") {
        expect(result.outcome).toBe("resolved");
        expect(result.openedPacks).toBe(3);
        expect(result.tier).toBe("big");
        expect(result.multiplierMicros).toBeGreaterThanOrEqual(CELEBRATION_MIN_MICROS);
        expect(result.multiplierMicros).toBeLessThan(25_000_000n);
      }
      if (example.id === "grey") {
        expect(result.outcome).toBe("resolved");
        expect(result.tier).toBe("return");
        expect(result.greyCards).toBe(2);
        expect(result.multiplierMicros).toBeGreaterThan(0n);
        expect(result.multiplierMicros).toBeLessThan(MICRO);
        expect(eventsOf(result, "bust")).toHaveLength(0);
      }
      if (example.id === "stack") {
        expect(result.outcome).toBe("resolved");
        expect(result.stackBonusPiles).toBe(1);
        expect(result.stacks.some((stack) => stack.stackBonusFactor >= 2 && stack.factor === 1)).toBe(true);
        expect(eventsOf(result, "stack_bonus")).toHaveLength(1);
      }
      if (example.id === "stackPurple") {
        expect(result.outcome).toBe("resolved");
        expect(result.stacks.some((stack) => stack.stackBonusFactor >= 2 && stack.factor >= 2)).toBe(true);
        expect(eventsOf(result, "stack_bonus")).toHaveLength(1);
        expect(eventsOf(result, "boost").length).toBeGreaterThan(0);
      }
    }
  });

  it("stays well formed across many seeds", () => {
    let chains = 0;
    for (let i = 0; i < 600; i += 1) {
      const result = resolveRound({ seed: `fuzz-${i}`, stake: 3 });
      assertWellFormed(result, DEMO_CONFIG, true);
      if (result.openedPacks > 1) chains += 1;
    }
    expect(chains).toBeGreaterThan(0);
  });
});

describe("+1 PACK chain", () => {
  it("a +1 in the first pack opens a second pack from the same stake", () => {
    const result = resolveRound({ seed: "extra-1", stake: 10, script: [g(0.5), extra, g(0.5), g(0.5), g(0.5), g(0.5), ...fill(0.1)] });
    assertWellFormed(result);
    expect(result.openedPacks).toBe(2);
    expect(result.earnedPacks).toBe(1);
    expect(eventsOf(result, "pack_open").map((event) => (event.type === "pack_open" ? event.pending : -1))).toEqual([0, 0]);
    expect(eventsOf(result, "pack_earned")).toEqual([{ type: "pack_earned", cardId: "c0002", pending: 1, totalPacks: 2 }]);
    expect(eventsOf(result, "card_reveal")).toHaveLength(12);
    // 11 greens cross Full Stack once: (5 × 0.5 + 6 × 0.1) × 2
    expect(result.stackBonusPiles).toBe(1);
    expect(result.multiplierMicros).toBe(6_200_000n);
    expect(result.stakeDebits).toBe(1);
  });

  it("a later pack can earn another pack and the chain continues", () => {
    const result = resolveRound({
      seed: "extra-chain",
      stake: 1,
      script: [extra, ...fill(0.2).slice(1), g(0.3), g(0.3), extra, g(0.3), g(0.3), g(0.3), ...fill(0.4)],
    });
    assertWellFormed(result);
    expect(result.openedPacks).toBe(3);
    expect(result.earnedPacks).toBe(2);
    expect(eventsOf(result, "pack_earned").map((event) => (event.type === "pack_earned" ? event.totalPacks : 0))).toEqual([2, 3]);
    // 16 greens, one Full Stack: (5 × 0.2 + 5 × 0.3 + 6 × 0.4) × 2
    expect(eventsOf(result, "stack_bonus")).toHaveLength(1);
    expect(result.multiplierMicros).toBe(9_800_000n);
  });

  it("several +1 cards in one pack queue several packs", () => {
    const result = resolveRound({ seed: "extra-multi", stake: 1, script: [extra, extra, extra, g(1), g(1), g(1), ...fill(0.1), ...fill(0.1), ...fill(0.1)] });
    assertWellFormed(result);
    expect(result.openedPacks).toBe(4);
    expect(eventsOf(result, "pack_earned").map((event) => (event.type === "pack_earned" ? event.pending : 0))).toEqual([1, 2, 3]);
    expect(eventsOf(result, "pack_open").map((event) => (event.type === "pack_open" ? event.pending : -1))).toEqual([0, 2, 1, 0]);
    // 21 greens cross both milestones: (3 × 1.00 + 18 × 0.10) × 4. The ×4 replaces ×2.
    expect(eventsOf(result, "stack_bonus")).toHaveLength(2);
    expect(eventsOf(result, "stack_bonus").map((event) => (event.type === "stack_bonus" ? event.factor : 0))).toEqual([2, 4]);
    expect(result.multiplierMicros).toBe(19_200_000n);
    expect(result.superStackPiles).toBe(1);
  });

  it("stacks, their values and purple boosts persist across packs", () => {
    const result = resolveRound({
      seed: "extra-persist",
      stake: 1,
      script: [b(2), b(1), purple, extra, g(0.5), g(0.5), b(1.5), g(0.5), g(0.5), g(0.5), g(0.5), g(0.5)],
    });
    assertWellFormed(result);
    const blue = result.stacks.find((stack) => stack.color === "blue")!;
    const green = result.stacks.find((stack) => stack.color === "green")!;
    expect(blue.cards.map((card) => (card.kind === "value" ? card.valueMicros : null))).toEqual([2_000_000n, 1_000_000n, 1_500_000n]);
    expect(blue.factor).toBe(2);
    expect(green.cards).toHaveLength(7);
    // blue (2 + 1 + 1.5) × 2 + green 7 × 0.5
    expect(result.multiplierMicros).toBe(12_500_000n);
    const addsInPackTwo = result.events.filter((event, index) => event.type === "stack_add" && index > result.events.findIndex((e) => e.type === "pack_open" && e.packNo === 2));
    expect(addsInPackTwo).toHaveLength(6);
  });

  it("+1 then red in the same pack busts and cancels the queued pack", () => {
    const result = resolveRound({ seed: "extra-red", stake: 10, script: [g(0.5), extra, au(5), red, g(1), g(1)] });
    assertWellFormed(result);
    expect(result.outcome).toBe("bust");
    expect(result.openedPacks).toBe(1);
    expect(result.earnedPacks).toBe(1);
    expect(result.cancelledPacks).toBe(1);
    expect(result.lostMicros).toBe(5_500_000n);
    expect(eventsOf(result, "card_reveal")).toHaveLength(4);
    expect(eventsOf(result, "bust")).toEqual([{ type: "bust", cardId: "c0004", lostMicros: 5_500_000n, cancelledPacks: 1 }]);
    expect(result.payoutMicros).toBe(0n);
  });

  it("red in a later pack wipes everything earned in earlier packs", () => {
    const result = resolveRound({ seed: "extra-red-later", stake: 1, script: [au(10), extra, extra, g(0.5), g(0.5), g(0.5), g(0.2), red] });
    assertWellFormed(result);
    expect(result.outcome).toBe("bust");
    expect(result.openedPacks).toBe(2);
    expect(result.cancelledPacks).toBe(1);
    expect(result.lostMicros).toBe(11_700_000n);
    expect(result.multiplierMicros).toBe(0n);
    expect(result.events.at(-1)?.type).toBe("round_end");
  });

  it("never opens more than maxPacks and stops drawing +1 at the cap", () => {
    const tight = { ...DEMO_CONFIG, maxPacks: 2, weights: { ...DEMO_CONFIG.weights, extra: 600, red: 0 } };
    for (let i = 0; i < 200; i += 1) {
      const result = resolveRound({ seed: `cap-${i}`, stake: 1, config: tight });
      assertWellFormed(result, tight);
      expect(result.openedPacks).toBeLessThanOrEqual(2);
      expect(result.earnedPacks).toBeLessThanOrEqual(1);
    }
    // With red disabled and a heavy +1 weight nearly every round earns exactly one pack.
    const earned = Array.from({ length: 50 }, (_, i) => resolveRound({ seed: `cap-${i}`, stake: 1, config: tight }).earnedPacks);
    expect(earned.some((count) => count === 1)).toBe(true);
    expect(() => resolveRound({ seed: "cap-script", stake: 1, config: tight, script: [extra, extra] })).toThrow(/maxPacks/);
  });

  it("settles exactly once at the end of the chain and debits one stake", () => {
    const result = resolveRound({ seed: "extra-settle", stake: 7, script: [extra, g(0.5), g(0.5), g(0.5), g(0.5), g(0.5), ...fill(0.5)] });
    assertWellFormed(result);
    expect(eventsOf(result, "round_end")).toHaveLength(1);
    expect(result.events.filter((event) => event.type === "round_end").length).toBe(1);
    expect(result.stakeDebits).toBe(1);
    // 11 × 0.50 × one Full Stack = 11.00×, which is a big win. Stake 7.
    expect(result.multiplierMicros).toBe(11_000_000n);
    expect(result.payoutMicros).toBe(77_000_000n);
    expect(result.tier).toBe("big");
  });

  it("a +1 does not count as a card for purple targeting", () => {
    const result = resolveRound({ seed: "extra-target", stake: 1, script: [g(0.5), extra, extra, b(3), purple, g(0.1), ...fill(0.1), ...fill(0.1)] });
    const boost = eventsOf(result, "boost")[0];
    // green 1 card vs blue 1 card: tie → highest total → blue. Extras never tip the count.
    expect(boost?.type === "boost" && boost.color).toBe("blue");
  });
});

describe("chooseBoostTarget", () => {
  const stack = (color: StackState["color"], values: number[], factor = 1, stackBonusFactor = 1, greys = 0): StackState => ({
    color,
    factor,
    stackBonusFactor,
    cards: [
      ...values.map((value, index) => ({
        kind: "value" as const,
        id: `${color}-${index}`,
        color,
        valueMicros: BigInt(Math.round(value * 100)) * 10_000n,
      })),
      ...Array.from({ length: greys }, (_, index) => ({ kind: "grey" as const, id: `${color}-g${index}` })),
    ],
  });

  it("picks the pile with the most physical cards, Grey included", () => {
    expect(chooseBoostTarget([stack("green", [0.1, 0.1, 0.1]), stack("blue", [3, 3]), stack("gold", [15])])).toBe("green");
    // Green 3 prizes + 2 greys = 5 cards. Blue 4 prizes worth 12×. Physical count wins.
    expect(chooseBoostTarget([stack("green", [0.1, 0.1, 0.1], 1, 1, 2), stack("blue", [3, 3, 3, 3])])).toBe("green");
    // A pile of only greys is occupied and can take the boost.
    expect(chooseBoostTarget([stack("green", []), stack("blue", [], 1, 1, 2), stack("gold", [])])).toBe("blue");
  });

  it("breaks a physical-count tie by the highest current total, including existing boosts and Stack Bonus", () => {
    expect(chooseBoostTarget([stack("green", [0.9, 0.9]), stack("blue", [1, 1]), stack("gold", [])])).toBe("blue");
    expect(chooseBoostTarget([stack("green", [0.9, 0.9], 4), stack("blue", [1, 1]), stack("gold", [])])).toBe("green");
    // Same count. Stack Bonus doubles blue's total and wins the tie.
    expect(chooseBoostTarget([stack("green", [1, 1]), stack("blue", [1, 1], 1, 2), stack("gold", [])])).toBe("blue");
    // A longer pile still beats a shorter one even when that shorter pile is already doubled.
    expect(chooseBoostTarget([stack("green", [0.1, 0.1, 0.1], 1, 2), stack("blue", [5, 5])])).toBe("green");
    // Two cards each. The grey does not add value, so the richer pile wins the tie.
    expect(chooseBoostTarget([stack("green", [0.4], 1, 1, 1), stack("blue", [0.3, 0.3])])).toBe("blue");
    expect(chooseBoostTarget([stack("green", [1], 1, 1, 1), stack("blue", [0.4], 1, 2, 1)])).toBe("green");
    expect(chooseBoostTarget([stack("green", [0.3], 1, 1, 1), stack("blue", [0.4], 1, 2, 1)])).toBe("blue");
  });

  it("breaks a full tie by the leftmost pile and ignores empty piles while any pile has cards", () => {
    expect(chooseBoostTarget([stack("green", [0.5, 0.5]), stack("blue", [0.5, 0.5]), stack("gold", [])])).toBe("green");
    expect(chooseBoostTarget([stack("green", [0.5], 1, 1, 1), stack("blue", [0.5], 1, 1, 1)])).toBe("green");
    expect(chooseBoostTarget([stack("green", []), stack("blue", [1]), stack("gold", [])])).toBe("blue");
  });

  it("falls back to the leftmost stack when the board is empty", () => {
    expect(chooseBoostTarget([stack("green", []), stack("blue", []), stack("gold", [])])).toBe("green");
    expect(chooseBoostTarget([stack("blue", []), stack("gold", [])])).toBe("blue");
    const result = resolveRound({
      seed: "early-purple",
      stake: 1,
      script: [purple, g(0.5), b(1), g(0.1), g(0.1), g(0.1)],
    });
    // green (0.5 + 0.3) × 2 + blue 1
    expect(result.multiplierMicros).toBe(2_600_000n);
  });
});

const greens = (count: number, value = 0.1): ScriptedDraw[] => Array.from({ length: count }, () => g(value));

describe("grey card", () => {
  it("joins a pile at 0×, without boosting, earning a pack, or busting", () => {
    const result = resolveRound({
      seed: "grey-one",
      stake: 1,
      script: [g(0.5), grey, g(0.2), grey, b(1), purple],
    });
    assertWellFormed(result);
    expect(result.outcome).toBe("resolved");
    expect(result.greyCards).toBe(2);
    expect(eventsOf(result, "grey")).toHaveLength(2);
    const green = result.stacks.find((stack) => stack.color === "green")!;
    const blue = result.stacks.find((stack) => stack.color === "blue")!;
    // Only green held a card when each grey was dealt, so both greys joined it.
    expect(green.cards.map((card) => card.kind)).toEqual(["value", "grey", "value", "grey"]);
    expect(blue.cards.map((card) => card.kind)).toEqual(["value"]);
    expect(eventsOf(result, "grey").map((event) => (event.type === "grey" ? [event.color, event.count] : []))).toEqual([
      ["green", 2],
      ["green", 4],
    ]);
    expect(eventsOf(result, "boost")).toHaveLength(1);
    expect(eventsOf(result, "pack_earned")).toHaveLength(0);
    expect(eventsOf(result, "bust")).toHaveLength(0);
    expect(eventsOf(result, "stack_bonus")).toHaveLength(0);
    // green (0.5 + 0.2) × 2 + blue 1. Greys add nothing.
    expect(result.multiplierMicros).toBe(2_400_000n);
    expect(result.tier).toBe("win");
  });

  it("goes to a random pile that already holds a card, and to any eligible pile on an empty board", () => {
    const stack = (color: StackColor, count: number): StackState => ({
      color,
      factor: 1,
      stackBonusFactor: 1,
      cards: Array.from({ length: count }, (_, index) => ({ kind: "value" as const, id: `${color}${index}`, color, valueMicros: 100_000n })),
    });
    const picks = (stacks: StackState[], seed: string): Set<StackColor> => {
      const rng = createRng(seed);
      return new Set(Array.from({ length: 200 }, () => chooseGreyTarget(stacks, rng)));
    };
    // Empty board: every eligible pile can receive it.
    expect([...picks([stack("green", 0), stack("blue", 0), stack("gold", 0)], "a")].sort()).toEqual(["blue", "gold", "green"]);
    expect([...picks([stack("blue", 0), stack("gold", 0)], "b")].sort()).toEqual(["blue", "gold"]);
    // Any pile with a card: empty piles are never chosen.
    expect([...picks([stack("green", 0), stack("blue", 2), stack("gold", 1)], "c")].sort()).toEqual(["blue", "gold"]);
    expect([...picks([stack("green", 0), stack("blue", 0), stack("gold", 3)], "d")]).toEqual(["gold"]);
    // A pile that holds only a grey is non-empty too.
    const onlyGrey: StackState = { color: "blue", factor: 1, stackBonusFactor: 1, cards: [{ kind: "grey", id: "x" }] };
    expect([...picks([stack("green", 0), onlyGrey, stack("gold", 0)], "e")]).toEqual(["blue"]);

    for (const id of DIFFICULTY_ORDER) {
      const result = resolveRound({ seed: `grey-empty-${id}`, stake: 1, difficulty: id, script: [grey, grey, grey, grey, grey, grey] });
      assertWellFormed(result, config(id));
      const homes = eventsOf(result, "grey").map((event) => (event.type === "grey" ? event.color : null));
      expect(DIFFICULTIES[id].colors).toContain(homes[0]);
      // After the first grey lands only that pile is non-empty, so the rest follow it.
      expect(new Set(homes).size).toBe(1);
    }
  });

  it("routes the same way on every replay and never changes which cards a seed deals", () => {
    const again = (seed: string, difficulty: Difficulty) => transcript(resolveRound({ seed, stake: 1, difficulty }));
    for (const id of DIFFICULTY_ORDER) {
      for (let i = 0; i < 40; i += 1) expect(again(`route-${i}`, id)).toBe(again(`route-${i}`, id));
    }
    // A scripted target overrides the routing stream and nothing else.
    const left = resolveRound({ seed: "route", stake: 1, script: [g(0.5), b(1), greyTo("green"), g(0.1), g(0.1), g(0.1)] });
    const right = resolveRound({ seed: "route", stake: 1, script: [g(0.5), b(1), greyTo("blue"), g(0.1), g(0.1), g(0.1)] });
    expect(greysIn(left.stacks[0]!)).toBe(1);
    expect(greysIn(right.stacks[1]!)).toBe(1);
    expect(left.multiplierMicros).toBe(right.multiplierMicros);
    expect(() => resolveRound({ seed: "route", stake: 1, difficulty: "hard", script: [greyTo("green")] })).toThrow(/grey target/);
  });

  it("pulls a purple onto the biggest physical pile, including a pile of only greys", () => {
    const result = resolveRound({
      seed: "grey-purple",
      stake: 1,
      script: [
        g(0.1),
        g(0.1),
        g(0.1),
        greyTo("green"),
        greyTo("green"),
        extra,
        b(3),
        b(3),
        b(3),
        b(3),
        purple,
        g(0.1),
      ],
    });
    assertWellFormed(result);
    const green = result.stacks.find((stack) => stack.color === "green")!;
    const blue = result.stacks.find((stack) => stack.color === "blue")!;
    // Green 3 prizes + 2 greys = 5. Blue 4 prizes worth 12×. Purple still goes to green.
    expect(green.cards).toHaveLength(6);
    expect(valueCards(green)).toBe(4);
    expect(greysIn(green)).toBe(2);
    expect(blue.cards).toHaveLength(4);
    expect(eventsOf(result, "boost")[0]).toMatchObject({ color: "green", stackTotalMicros: 600_000n });
    // Green (0.40) × 2 + blue 12. The purple does not touch the richer pile.
    expect(green.factor).toBe(2);
    expect(blue.factor).toBe(1);
    expect(result.multiplierMicros).toBe(12_800_000n);

    // Two greys make blue the only occupied pile. Purple lands there at 0× and stays for the value card.
    const blank = resolveRound({
      seed: "grey-purple-2",
      stake: 1,
      script: [greyTo("blue"), greyTo("blue"), purple, b(1), g(0.5), g(0.5)],
    });
    assertWellFormed(blank);
    const boost = eventsOf(blank, "boost")[0];
    expect(boost).toMatchObject({ color: "blue", stackTotalMicros: 0n, stackFactor: 2 });
    expect(blank.stacks.find((stack) => stack.color === "blue")).toMatchObject({ factor: 2 });
    // blue 1.00 × 2 + green 1.00. The factor persisted onto the card that arrived after the boost.
    expect(blank.multiplierMicros).toBe(3_000_000n);
    expect(blank.stacks.find((stack) => stack.color === "green")!.factor).toBe(1);
  });

  it("resolves six greys as a safe 0× no-win, distinct from a red bust", () => {
    const blank = resolveRound({ seed: "six-grey", stake: 8, script: [grey, grey, grey, grey, grey, grey] });
    assertWellFormed(blank);
    expect(blank.outcome).toBe("resolved");
    expect(blank.tier).toBe("none");
    expect(blank.multiplierMicros).toBe(0n);
    expect(blank.payoutMicros).toBe(0n);
    expect(blank.netMicros).toBe(-8_000_000n);
    expect(blank.greyCards).toBe(6);
    expect(blank.stacks.reduce((sum, stack) => sum + stack.cards.length, 0)).toBe(6);
    expect(blank.stacks.every((stack) => valueCards(stack) === 0)).toBe(true);
    expect(eventsOf(blank, "bust")).toHaveLength(0);
    expect(eventsOf(blank, "card_reveal")).toHaveLength(6);

    const bust = resolveRound({ seed: "red-not-grey", stake: 8, script: [grey, grey, red] });
    assertWellFormed(bust);
    expect(bust.outcome).toBe("bust");
    expect(bust.tier).toBe("none");
    expect(bust.greyCards).toBe(2);
    expect(bust.stacks.every((stack) => stack.cards.length === 0)).toBe(true);
    expect(eventsOf(bust, "card_reveal")).toHaveLength(3);
  });

  it("keeps a safe payout above zero and below 1× as a return, on every difficulty", () => {
    for (const id of DIFFICULTY_ORDER) {
      const mode = DIFFICULTIES[id];
      const value = mode.colors[0] === "green" ? g(0.2) : b(1);
      const script: ScriptedDraw[] = [value, grey, grey, grey, grey, grey];
      const result = resolveRound({ seed: `grey-return-${id}`, stake: 4, difficulty: id, script });
      assertWellFormed(result, config(id));
      if (mode.colors[0] === "green") {
        expect(result.tier).toBe("return");
        expect(result.multiplierMicros).toBe(200_000n);
        expect(result.payoutMicros).toBeGreaterThan(0n);
        expect(result.netMicros).toBeLessThan(0n);
      } else {
        expect(result.multiplierMicros).toBeGreaterThanOrEqual(MICRO);
      }
    }
  });
});

describe("stack milestones", () => {
  it("counts grey 0× cards toward the 10, and never purple, red or +1 PACK", () => {
    // 7 greens + 3 greys in the green pile = 10 cards. Two +1 PACKs and a purple are dealt too.
    const mixed = resolveRound({
      seed: "sb-grey",
      stake: 1,
      script: [extra, g(0.2), g(0.2), greyTo("green"), g(0.2), purple, g(0.2), g(0.2), greyTo("green"), g(0.2), g(0.2), greyTo("green")],
    });
    assertWellFormed(mixed);
    const green = mixed.stacks.find((stack) => stack.color === "green")!;
    expect(green.cards).toHaveLength(10);
    expect(valueCards(green)).toBe(7);
    expect(greysIn(green)).toBe(3);
    expect(green).toMatchObject({ stackBonusFactor: 2, factor: 2 });
    // The 10th card is a grey. It unlocks the bonus and adds no value of its own.
    const unlock = eventsOf(mixed, "stack_bonus");
    expect(unlock).toHaveLength(1);
    expect(unlock[0]).toMatchObject({ cardId: "c0012", color: "green", count: 10, threshold: 10, previousFactor: 1, factor: 2 });
    // The grey's own landing still reports the pre-bonus total. The bonus event doubles it.
    expect(mixed.events.at(-3)).toMatchObject({ type: "grey", color: "green", count: 10, stackTotalMicros: 2_800_000n });
    expect(mixed.events.at(-2)).toMatchObject({ type: "stack_bonus", stackTotalMicros: 5_600_000n });
    // 7 × 0.20 = 1.40 → purple ×2 = 2.80 → Stack Bonus ×2 = 5.60
    expect(mixed.multiplierMicros).toBe(5_600_000n);

    // 9 pile cards plus purple and +1 PACK is still 9: no bonus.
    const short = resolveRound({
      seed: "sb-short",
      stake: 1,
      script: [extra, g(0.2), g(0.2), greyTo("green"), g(0.2), purple, g(0.2), g(0.2), greyTo("green"), g(0.2), g(0.2), purple],
    });
    assertWellFormed(short);
    expect(short.stacks.find((stack) => stack.color === "green")!.cards).toHaveLength(9);
    expect(eventsOf(short, "stack_bonus")).toHaveLength(0);
    expect(short.stackBonusPiles).toBe(0);
    // 7 × 0.20 × purple 4, no Stack Bonus
    expect(short.multiplierMicros).toBe(5_600_000n);
  });

  it("matches the worked example: 3.20× → purple ×2 = 6.40× → Stack Bonus ×2 = 12.80×", () => {
    const result = resolveRound({
      seed: "sb-example",
      stake: 1,
      difficulty: "hard",
      script: [b(1.6), b(1.6), greyTo("blue"), greyTo("blue"), purple, extra, greyTo("blue"), greyTo("blue"), greyTo("blue"), greyTo("blue"), greyTo("blue"), greyTo("blue")],
    });
    assertWellFormed(result, config("hard"));
    const boost = eventsOf(result, "boost")[0];
    expect(boost).toMatchObject({ color: "blue", stackTotalMicros: 6_400_000n });
    expect(eventsOf(result, "stack_bonus")).toEqual([
      {
        type: "stack_bonus",
        cardId: "c0012",
        color: "blue",
        count: 10,
        threshold: 10,
        previousFactor: 1,
        factor: 2,
        beforeMicros: 6_400_000n,
        stackTotalMicros: 12_800_000n,
        totalMicros: 12_800_000n,
      },
    ]);
    expect(result.multiplierMicros).toBe(12_800_000n);
    expect(result.tier).toBe("big");
  });

  it("a pile of ten greys unlocks the bonus and still pays 0×", () => {
    const result = resolveRound({
      seed: "sb-blank",
      stake: 1,
      script: [extra, ...Array.from({ length: 10 }, () => greyTo("blue")), g(0.5)],
    });
    assertWellFormed(result);
    expect(result.stacks.find((stack) => stack.color === "blue")).toMatchObject({ stackBonusFactor: 2 });
    expect(eventsOf(result, "stack_bonus")).toHaveLength(1);
    expect(result.multiplierMicros).toBe(500_000n);
  });

  it("awards ×2 once at 10, upgrades ×2 to ×4 once at 20, and stays ×4 after that", () => {
    const ten = resolveRound({
      seed: "fs-10",
      stake: 1,
      script: [extra, ...greens(5), ...greens(5), g(0.1)],
    });
    assertWellFormed(ten);
    expect(eventsOf(ten, "stack_bonus")).toHaveLength(1);
    expect(eventsOf(ten, "stack_bonus")[0]).toMatchObject({ color: "green", count: 10, threshold: 10, previousFactor: 1, factor: 2 });
    expect(ten.stacks.find((stack) => stack.color === "green")).toMatchObject({ stackBonusFactor: 2, factor: 1 });
    expect(ten.stacks.find((stack) => stack.color === "green")!.cards).toHaveLength(11);
    // 11 × 0.10 × stack 2. The 11th card does not award again.
    expect(ten.multiplierMicros).toBe(2_200_000n);
    expect(ten.stackBonusPiles).toBe(1);
    expect(ten.superStackPiles).toBe(0);

    const twenty = resolveRound({
      seed: "fs-20",
      stake: 1,
      script: [extra, ...greens(5), extra, ...greens(5), extra, ...greens(5), ...greens(6)],
    });
    assertWellFormed(twenty);
    expect(twenty.stacks.find((stack) => stack.color === "green")!.cards).toHaveLength(21);
    expect(eventsOf(twenty, "stack_bonus")).toHaveLength(2);
    expect(eventsOf(twenty, "stack_bonus")[1]).toMatchObject({
      count: 20,
      threshold: 20,
      previousFactor: 2,
      factor: SUPER_STACK_FACTOR,
      beforeMicros: 4_000_000n,
      stackTotalMicros: 8_000_000n,
    });
    // 21 × 0.10 × 4. Not 21 × 0.10 × 8.
    expect(twenty.multiplierMicros).toBe(8_400_000n);
    expect(twenty.superStackPiles).toBe(1);

    const past = resolveRound({
      seed: "fs-30",
      stake: 1,
      script: [extra, extra, extra, extra, extra, ...greens(31)],
    });
    assertWellFormed(past);
    expect(past.stacks.find((stack) => stack.color === "green")!.cards.length).toBeGreaterThanOrEqual(30);
    expect(eventsOf(past, "stack_bonus")).toHaveLength(2);
    expect(past.stacks.find((stack) => stack.color === "green")!.stackBonusFactor).toBe(4);
    expect(past.multiplierMicros).toBe(BigInt(past.stacks[0]!.cards.length) * 100_000n * 4n);
  });

  it("unlocks two piles independently and keeps the bonus across a later pack", () => {
    const result = resolveRound({
      seed: "fs-two",
      stake: 1,
      script: [
        extra,
        extra,
        ...greens(4),
        extra,
        ...greens(5),
        b(1),
        ...Array.from({ length: 5 }, () => b(1)),
        ...Array.from({ length: 5 }, () => b(1)),
        g(0.2),
      ],
    });
    assertWellFormed(result);
    const green = result.stacks.find((stack) => stack.color === "green")!;
    const blue = result.stacks.find((stack) => stack.color === "blue")!;
    expect(green.cards).toHaveLength(10);
    expect(blue.cards).toHaveLength(11);
    expect(green.stackBonusFactor).toBe(2);
    expect(blue.stackBonusFactor).toBe(2);
    expect(eventsOf(result, "stack_bonus").map((event) => (event.type === "stack_bonus" ? event.color : ""))).toEqual(["blue", "green"]);
    // green 1.10 × 2 + blue 11 × 2. The green card after the unlock is still doubled.
    expect(result.multiplierMicros).toBe(24_200_000n);
    expect(result.stackBonusPiles).toBe(2);
  });

  it("compounds the same way whether purple lands before or after the unlock", () => {
    const after = resolveRound({
      seed: "fs-after",
      stake: 1,
      script: [...greens(5), extra, ...greens(5), purple],
    });
    const before = resolveRound({
      seed: "fs-before",
      stake: 1,
      script: [purple, extra, ...greens(4), ...greens(6)],
    });
    assertWellFormed(after);
    assertWellFormed(before);
    // 10 × 0.10 × purple 2 × full stack 2
    expect(after.multiplierMicros).toBe(4_000_000n);
    expect(before.multiplierMicros).toBe(4_000_000n);
    expect(after.stacks.find((stack) => stack.color === "green")).toMatchObject({ factor: 2, stackBonusFactor: 2 });
    expect(before.stacks.find((stack) => stack.color === "green")).toMatchObject({ factor: 2, stackBonusFactor: 2 });
    expect(eventsOf(after, "stack_bonus")).toHaveLength(1);
    expect(eventsOf(before, "stack_bonus")).toHaveLength(1);
  });

  it("lets a grey be the 10th and the 20th card, and keeps a grey-only ×4 pile at 0×", () => {
    const hit = resolveRound({ seed: "fixture-stack20grey", stake: 1, difficulty: "easy", script: FIXTURES.stack20grey.script });
    assertWellFormed(hit, config("easy"));
    const awards = eventsOf(hit, "stack_bonus");
    expect(awards).toHaveLength(2);
    expect(awards[0]).toMatchObject({ threshold: 10, previousFactor: 1, factor: 2, beforeMicros: 6_400_000n, stackTotalMicros: 12_800_000n });
    expect(awards[1]).toMatchObject({ threshold: 20, previousFactor: 2, factor: 4, beforeMicros: 12_800_000n, stackTotalMicros: 25_600_000n });
    expect(eventsOf(hit, "grey").some((event) => event.type === "grey" && event.cardId === (awards[0]?.type === "stack_bonus" ? awards[0].cardId : ""))).toBe(true);
    expect(eventsOf(hit, "grey").some((event) => event.type === "grey" && event.cardId === (awards[1]?.type === "stack_bonus" ? awards[1].cardId : ""))).toBe(true);
    // 3.20 × purple 2 × stack 4 = 25.60. Not 51.20.
    expect(hit.multiplierMicros).toBe(25_600_000n);
    expect(hit.stacks.find((stack) => stack.color === "green")).toMatchObject({ stackBonusFactor: 4, factor: 2 });

    const blank = resolveRound({
      seed: "sb-blank-20",
      stake: 1,
      difficulty: "easy",
      script: [extra, extra, extra, ...Array.from({ length: 20 }, () => greyTo("blue")), b(1)],
    });
    assertWellFormed(blank, config("easy"));
    const blue = blank.stacks.find((stack) => stack.color === "blue")!;
    expect(blue.cards.filter((card) => card.kind === "grey")).toHaveLength(20);
    expect(blue.stackBonusFactor).toBe(4);
    expect(eventsOf(blank, "stack_bonus").map((event) => (event.type === "stack_bonus" ? event.stackTotalMicros : 0n))).toEqual([0n, 0n]);
    // The value card arrives after both tiers and takes ×4. 1.00 × 4.
    expect(blue.cards.at(-1)?.kind).toBe("value");
    expect(blank.multiplierMicros).toBe(4_000_000n);
  });

  it("compounds purple with each tier, including a boost that landed on greys before any value", () => {
    const early = resolveRound({
      seed: "tier-early",
      stake: 1,
      script: [purple, extra, extra, extra, ...greens(20)],
    });
    const late = resolveRound({
      seed: "tier-late",
      stake: 1,
      script: [extra, extra, extra, ...greens(20), purple],
    });
    assertWellFormed(early);
    assertWellFormed(late);
    // 20 × 0.10 × purple 2 × stack 4 = 16.00, whichever order the purple arrived.
    expect(early.multiplierMicros).toBe(16_000_000n);
    expect(late.multiplierMicros).toBe(16_000_000n);
    expect(early.stacks.find((stack) => stack.color === "green")).toMatchObject({ factor: 2, stackBonusFactor: 4 });

    const twice = resolveRound({
      seed: "tier-twice",
      stake: 1,
      script: [purple, extra, extra, extra, extra, ...greens(8, 0.4), purple, ...Array.from({ length: 16 }, () => greyTo("green"))],
    });
    assertWellFormed(twice);
    // 3.20 × purple 4 × stack 4 = 51.20. Two purples and the ×4 tier are allowed to compound.
    expect(twice.multiplierMicros).toBe(51_200_000n);
    expect(twice.stacks.find((stack) => stack.color === "green")).toMatchObject({ factor: 4, stackBonusFactor: 4 });

    const waiting = resolveRound({
      seed: "tier-wait",
      stake: 1,
      difficulty: "easy",
      script: [
        extra,
        extra,
        extra,
        extra,
        ...Array.from({ length: 20 }, () => greyTo("blue")),
        purple,
        b(1),
        ...Array.from({ length: 4 }, () => greyTo("blue")),
      ],
    });
    assertWellFormed(waiting, config("easy"));
    const boost = eventsOf(waiting, "boost")[0];
    expect(boost).toMatchObject({ color: "blue", stackFactor: 2, stackTotalMicros: 0n });
    expect(waiting.stacks.find((stack) => stack.color === "blue")!.stackBonusFactor).toBe(4);
    // 1.00 × purple 2 × stack 4.
    expect(waiting.multiplierMicros).toBe(8_000_000n);
  });

  it("a red card after Stack ×4 wipes the bonus and cancels the packs still waiting", () => {
    const result = resolveRound({
      seed: "fs-red-4",
      stake: 5,
      script: [extra, extra, extra, extra, extra, ...greens(20), red],
    });
    assertWellFormed(result);
    expect(eventsOf(result, "stack_bonus").map((event) => (event.type === "stack_bonus" ? event.factor : 0))).toEqual([2, 4]);
    expect(result.outcome).toBe("bust");
    expect(result.multiplierMicros).toBe(0n);
    expect(result.payoutMicros).toBe(0n);
    expect(result.stackBonusPiles).toBe(0);
    expect(result.superStackPiles).toBe(0);
    expect(result.stacks.every((stack) => stack.stackBonusFactor === 1 && stack.cards.length === 0)).toBe(true);
    expect(result.cancelledPacks).toBeGreaterThan(0);
    expect(result.stakeDebits).toBe(1);
    expect(eventsOf(result, "round_end")).toHaveLength(1);
    expect(result.events.at(-1)?.type).toBe("round_end");
  });

  it("a red card after Full Stack wipes the bonus and cancels the packs still waiting", () => {
    const result = resolveRound({
      seed: "fs-red",
      stake: 5,
      script: [extra, extra, ...greens(4), extra, ...greens(5), g(0.1), extra, red],
    });
    assertWellFormed(result);
    expect(eventsOf(result, "stack_bonus")).toHaveLength(1);
    expect(result.outcome).toBe("bust");
    expect(result.multiplierMicros).toBe(0n);
    expect(result.stackBonusPiles).toBe(0);
    expect(result.stacks.every((stack) => stack.stackBonusFactor === 1 && stack.cards.length === 0)).toBe(true);
    expect(result.cancelledPacks).toBe(2);
    expect(result.lostMicros).toBe(2_000_000n);
    expect(result.payoutMicros).toBe(0n);
    expect(result.stakeDebits).toBe(1);
    expect(eventsOf(result, "round_end")).toHaveLength(1);
  });
});
