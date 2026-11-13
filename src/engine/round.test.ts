import { describe, expect, it } from "vitest";
import { DEMO_CONFIG, DEMO_WEIGHTS, VALUE_RANGES, WIN_TIERS } from "./config";
import { drawKind, drawValue, rangeSteps, weightTotal } from "./draw";
import { FEATURED_SEEDS } from "./featured";
import { boardTotal, stackTotal } from "./money";
import { createRng } from "./rng";
import { chooseBoostTarget, resolveRound, tierFor } from "./round";
import { STACK_COLORS, type RoundEvent, type RoundResult, type ScriptedDraw, type StackState } from "./types";

const g = (value?: number): ScriptedDraw => ({ kind: "green", value });
const b = (value?: number): ScriptedDraw => ({ kind: "blue", value });
const au = (value?: number): ScriptedDraw => ({ kind: "gold", value });
const purple: ScriptedDraw = { kind: "purple" };
const red: ScriptedDraw = { kind: "red" };
const extra: ScriptedDraw = { kind: "extra" };

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
}

function assertWellFormed(result: RoundResult, config = DEMO_CONFIG): void {
  let bustSeen = false;
  let reveals = 0;
  let opened = 0;
  let pending = 0;
  let earned = 0;
  let revealsInPack = 0;
  const stacks: StackState[] = STACK_COLORS.map((color) => ({ color, cards: [], factor: 1 }));
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
      if (card.kind === "value") {
        const range = VALUE_RANGES[card.color];
        expect(card.valueMicros).toBeGreaterThanOrEqual(range.minMicros);
        expect(card.valueMicros).toBeLessThanOrEqual(range.maxMicros);
        expect((card.valueMicros - range.minMicros) % range.stepMicros).toBe(0n);
        const stack = stacks.find((entry) => entry.color === card.color)!;
        stack.cards = [...stack.cards, card];
      }
    }
    if (event.type === "stack_add") {
      const stack = stacks.find((entry) => entry.color === event.color)!;
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
    expect(result.cancelledPacks).toBe(pending);
    expect(result.stacks.every((stack) => stack.cards.length === 0)).toBe(true);
  } else {
    // Every earned pack was opened: the queue is empty on a safe finish.
    expect(pending).toBe(0);
    expect(result.cancelledPacks).toBe(0);
    expect(opened).toBe(1 + earned);
    expect(reveals).toBe(config.cardsPerPack * opened);
    expect(result.multiplierMicros).toBe(boardTotal(result.stacks));
    expect(result.lostMicros).toBe(0n);
  }
  assertSingleSettlement(result);
}

describe("config", () => {
  it("weights sum to 100 and every range sits on its grid", () => {
    expect(weightTotal(DEMO_WEIGHTS)).toBe(100);
    expect(rangeSteps(VALUE_RANGES.green)).toBe(91);
    expect(rangeSteps(VALUE_RANGES.blue)).toBe(41);
    expect(rangeSteps(VALUE_RANGES.gold)).toBe(21);
    expect(WIN_TIERS.map((rule) => rule.tier)).toEqual(["mega", "huge", "big"]);
    expect(DEMO_CONFIG.maxPacks).toBe(6);
  });

  it("draws only configured kinds and only in-range values", () => {
    const rng = createRng("draw-check");
    const seen = new Set<string>();
    for (let i = 0; i < 2_000; i += 1) {
      seen.add(drawKind(rng, DEMO_WEIGHTS));
      for (const color of STACK_COLORS) {
        const value = drawValue(rng, VALUE_RANGES[color]);
        expect(value).toBeGreaterThanOrEqual(VALUE_RANGES[color].minMicros);
        expect(value).toBeLessThanOrEqual(VALUE_RANGES[color].maxMicros);
      }
    }
    expect([...seen].sort()).toEqual(["blue", "extra", "gold", "green", "purple", "red"]);
  });

  it("never draws +1 PACK once its weight is removed from the pool", () => {
    const rng = createRng("no-extra");
    for (let i = 0; i < 2_000; i += 1) {
      expect(drawKind(rng, { ...DEMO_WEIGHTS, extra: 0 })).not.toBe("extra");
    }
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

  it("computes tiers from the final multiplier", () => {
    expect(tierFor(0n, WIN_TIERS)).toBe("none");
    expect(tierFor(10_000n, WIN_TIERS)).toBe("win");
    expect(tierFor(24_990_000n, WIN_TIERS)).toBe("win");
    expect(tierFor(25_000_000n, WIN_TIERS)).toBe("big");
    expect(tierFor(50_000_000n, WIN_TIERS)).toBe("huge");
    expect(tierFor(100_000_000n, WIN_TIERS)).toBe("mega");
    const big = resolveRound({ seed: "big", stake: 1, script: [au(15), au(15), au(15), au(15), purple, g(0.1)] });
    expect(big.tier).toBe("mega");
    expect(big.multiplierMicros).toBe(120_100_000n);
  });

  it("keeps every featured seed on its advertised outcome", () => {
    for (const example of FEATURED_SEEDS) {
      const result = resolveRound({ seed: example.seed, stake: 10 });
      assertWellFormed(result);
      if (example.id === "chain") {
        expect(result.outcome).toBe("resolved");
        expect(result.openedPacks).toBe(3);
        expect(result.tier).toBe("win");
      }
      if (example.id === "bust") {
        expect(result.outcome).toBe("bust");
        expect(result.cancelledPacks).toBe(1);
      }
      if (example.id === "boost") {
        expect(result.outcome).toBe("resolved");
        expect(result.openedPacks).toBe(2);
        expect(result.tier).toBe("win");
        expect(eventsOf(result, "boost").length).toBeGreaterThan(0);
      }
      if (example.id === "big") {
        expect(result.outcome).toBe("resolved");
        expect(result.openedPacks).toBe(2);
        expect(result.tier).toBe("big");
      }
      if (example.id === "mega") expect(result.tier).toBe("mega");
    }
  });

  it("stays well formed across many seeds", () => {
    let chains = 0;
    for (let i = 0; i < 600; i += 1) {
      const result = resolveRound({ seed: `fuzz-${i}`, stake: 3 });
      assertWellFormed(result);
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
    // 5 × 0.5 + 6 × 0.1
    expect(result.multiplierMicros).toBe(3_100_000n);
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
    // 5 × 0.2 + 5 × 0.3 + 6 × 0.4
    expect(result.multiplierMicros).toBe(4_900_000n);
  });

  it("several +1 cards in one pack queue several packs", () => {
    const result = resolveRound({ seed: "extra-multi", stake: 1, script: [extra, extra, extra, g(1), g(1), g(1), ...fill(0.1), ...fill(0.1), ...fill(0.1)] });
    assertWellFormed(result);
    expect(result.openedPacks).toBe(4);
    expect(eventsOf(result, "pack_earned").map((event) => (event.type === "pack_earned" ? event.pending : 0))).toEqual([1, 2, 3]);
    expect(eventsOf(result, "pack_open").map((event) => (event.type === "pack_open" ? event.pending : -1))).toEqual([0, 2, 1, 0]);
    expect(result.multiplierMicros).toBe(4_800_000n);
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
    expect(blue.cards.map((card) => card.valueMicros)).toEqual([2_000_000n, 1_000_000n, 1_500_000n]);
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
    const tight = { ...DEMO_CONFIG, maxPacks: 2, weights: { ...DEMO_WEIGHTS, extra: 60, red: 0 } };
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
    expect(result.multiplierMicros).toBe(5_500_000n);
    expect(result.payoutMicros).toBe(38_500_000n);
    expect(result.tier).toBe("win");
  });

  it("a +1 does not count as a card for purple targeting", () => {
    const result = resolveRound({ seed: "extra-target", stake: 1, script: [g(0.5), extra, extra, b(3), purple, g(0.1), ...fill(0.1), ...fill(0.1)] });
    const boost = eventsOf(result, "boost")[0];
    // green 1 card vs blue 1 card: tie → highest total → blue. Extras never tip the count.
    expect(boost?.type === "boost" && boost.color).toBe("blue");
  });
});

describe("chooseBoostTarget", () => {
  const stack = (color: StackState["color"], values: number[], factor = 1): StackState => ({
    color,
    factor,
    cards: values.map((value, index) => ({
      kind: "value",
      id: `${color}-${index}`,
      color,
      valueMicros: BigInt(Math.round(value * 100)) * 10_000n,
    })),
  });

  it("picks the stack with the most cards", () => {
    expect(chooseBoostTarget([stack("green", [0.1, 0.1, 0.1]), stack("blue", [3, 3]), stack("gold", [15])])).toBe("green");
  });

  it("breaks a card-count tie by the highest current total, including existing boosts", () => {
    expect(chooseBoostTarget([stack("green", [0.9, 0.9]), stack("blue", [1, 1]), stack("gold", [])])).toBe("blue");
    expect(chooseBoostTarget([stack("green", [0.9, 0.9], 4), stack("blue", [1, 1]), stack("gold", [])])).toBe("green");
  });

  it("breaks a full tie by the leftmost stack and ignores empty stacks while any stack has cards", () => {
    expect(chooseBoostTarget([stack("green", [0.5, 0.5]), stack("blue", [0.5, 0.5]), stack("gold", [])])).toBe("green");
    expect(chooseBoostTarget([stack("green", []), stack("blue", [1]), stack("gold", [])])).toBe("blue");
  });

  it("falls back to the leftmost stack when the board is empty", () => {
    expect(chooseBoostTarget([stack("green", []), stack("blue", []), stack("gold", [])])).toBe("green");
    const result = resolveRound({
      seed: "early-purple",
      stake: 1,
      script: [purple, g(0.5), b(1), g(0.1), g(0.1), g(0.1)],
    });
    // green (0.5 + 0.3) × 2 + blue 1
    expect(result.multiplierMicros).toBe(2_600_000n);
  });
});
