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

function assertWellFormed(result: RoundResult): void {
  let bustSeen = false;
  let reveals = 0;
  const stacks: StackState[] = STACK_COLORS.map((color) => ({ color, cards: [], factor: 1 }));
  for (const event of result.events) {
    if (bustSeen && event.type !== "round_end") {
      throw new Error(`Event ${event.type} followed the red card`);
    }
    if (event.type === "card_reveal") {
      reveals += 1;
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
    }
  }
  expect(reveals).toBeLessThanOrEqual(DEMO_CONFIG.cardsPerPack * DEMO_CONFIG.packsPerRound);
  if (result.outcome === "bust") {
    expect(result.multiplierMicros).toBe(0n);
    expect(result.tier).toBe("none");
    expect(result.stacks.every((stack) => stack.cards.length === 0)).toBe(true);
  } else {
    expect(reveals).toBe(DEMO_CONFIG.cardsPerPack * DEMO_CONFIG.packsPerRound);
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
    expect([...seen].sort()).toEqual(["blue", "gold", "green", "purple", "red"]);
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
    expect(tierFor(19_990_000n, WIN_TIERS)).toBe("win");
    expect(tierFor(20_000_000n, WIN_TIERS)).toBe("big");
    expect(tierFor(40_000_000n, WIN_TIERS)).toBe("huge");
    expect(tierFor(75_000_000n, WIN_TIERS)).toBe("mega");
    const big = resolveRound({ seed: "big", stake: 1, script: [au(15), au(15), au(15), au(15), purple, g(0.1)] });
    expect(big.tier).toBe("mega");
    expect(big.multiplierMicros).toBe(120_100_000n);
  });

  it("keeps every featured seed on its advertised outcome", () => {
    for (const example of FEATURED_SEEDS) {
      const result = resolveRound({ seed: example.seed, stake: 10 });
      assertWellFormed(result);
      if (example.id === "bust") expect(result.outcome).toBe("bust");
      if (example.id === "boost") {
        expect(result.outcome).toBe("resolved");
        expect(result.tier).toBe("win");
        expect(eventsOf(result, "boost").length).toBeGreaterThan(0);
      }
      if (example.id === "big") {
        expect(result.outcome).toBe("resolved");
        expect(result.tier).toBe("big");
      }
      if (example.id === "mega") expect(result.tier).toBe("mega");
    }
  });

  it("stays well formed across many seeds", () => {
    for (let i = 0; i < 400; i += 1) {
      assertWellFormed(resolveRound({ seed: `fuzz-${i}`, stake: 3 }));
    }
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
