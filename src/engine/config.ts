import type { CardKind, Difficulty, StackColor, WinTier } from "./types";

/**
 * DEMO-ONLY placeholders. Every weight, value table and tier below is a
 * prototype knob: NOT a validated RTP, NOT certified, NOT for real money.
 * `npm run simulate` reports what the current knobs produce per difficulty.
 */
export const DEMO_CONFIG_ID = "merge-packs-demo-v0.13";

export const MICRO = 1_000_000n;

/**
 * Draw order for the weighted roll. Grey is its own bucket: it is not a
 * re-labelled green, and a mode can change `weights.grey` without touching
 * the green table.
 */
export const KIND_ORDER = ["green", "blue", "gold", "grey", "purple", "red", "extra"] as const satisfies readonly CardKind[];

export type Weights = Record<CardKind, number>;

/** Hard cap on packs opened in one round, the starting pack included. Prototype safety, not math. */
export const MAX_PACKS = 6;

/** A purple card multiplies the targeted stack by this factor. Boosts compound. */
export const PURPLE_FACTOR = 2;

/**
 * Total Stack Bonus for one pile, by physical cards (value cards and Grey).
 * Purple, Red and +1 PACK never count. Each milestone replaces the factor:
 * reaching 20 sets ×4, it does not multiply the existing ×2 into ×8.
 * 21, 30 and 40 add no further tier. Prototype rule, not an approved bonus.
 */
export const STACK_MILESTONES = [
  { count: 10, factor: 2 },
  { count: 20, factor: 4 },
] as const;

/** First milestone. The 10th card awards this once. */
export const FULL_STACK_COUNT = STACK_MILESTONES[0].count;
export const FULL_STACK_FACTOR = STACK_MILESTONES[0].factor;

/** Second milestone. The 20th card replaces ×2 with this, once. */
export const SUPER_STACK_COUNT = STACK_MILESTONES[1].count;
export const SUPER_STACK_FACTOR = STACK_MILESTONES[1].factor;

/** Total stack factor for a physical count. 1 below 10, 2 from 10, 4 from 20. */
export function stackBonusFactorFor(count: number): number {
  let factor = 1;
  for (const milestone of STACK_MILESTONES) {
    if (count >= milestone.count) factor = milestone.factor;
  }
  return factor;
}

/** The milestone crossed by landing exactly on `count`, if that count is one. */
export function stackMilestoneAt(count: number): (typeof STACK_MILESTONES)[number] | undefined {
  return STACK_MILESTONES.find((milestone) => milestone.count === count);
}

export type ValueDistribution =
  /** Uniform on an inclusive step grid. */
  | { kind: "uniform"; minMicros: bigint; maxMicros: bigint; stepMicros: bigint }
  /** Explicit denominations with draw weights. */
  | { kind: "weighted"; entries: readonly { valueMicros: bigint; weight: number }[] };

/**
 * Green on Easy. Same 0.10×–1.00× denominations. v0.13 shifts the small end
 * up toward 0.18×–0.20× so a 40% Grey rate can still sit near 0.95×.
 * 80% are ≤ 0.20×. Mean 0.2236×. The 0.75× and 1.00× cards stay.
 */
export const GREEN_VALUES_EASY: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 100_000n, weight: 8 },
    { valueMicros: 120_000n, weight: 4 },
    { valueMicros: 130_000n, weight: 4 },
    { valueMicros: 150_000n, weight: 14 },
    { valueMicros: 180_000n, weight: 20 },
    { valueMicros: 200_000n, weight: 30 },
    { valueMicros: 300_000n, weight: 8 },
    { valueMicros: 400_000n, weight: 5 },
    { valueMicros: 500_000n, weight: 4 },
    { valueMicros: 750_000n, weight: 2 },
    { valueMicros: 1_000_000n, weight: 1 },
  ],
};

/**
 * Green on Medium. v0.13 lifts the small end, less than Easy because Medium
 * also has Gold. 82% are ≤ 0.20×. Mean 0.214×.
 */
export const GREEN_VALUES: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 100_000n, weight: 10 },
    { valueMicros: 120_000n, weight: 8 },
    { valueMicros: 130_000n, weight: 4 },
    { valueMicros: 150_000n, weight: 16 },
    { valueMicros: 180_000n, weight: 18 },
    { valueMicros: 200_000n, weight: 26 },
    { valueMicros: 300_000n, weight: 8 },
    { valueMicros: 400_000n, weight: 4 },
    { valueMicros: 500_000n, weight: 3 },
    { valueMicros: 750_000n, weight: 2 },
    { valueMicros: 1_000_000n, weight: 1 },
  ],
};

/** Blue on Easy and Medium: uniform 1.00× – 3.00×. */
export const BLUE_VALUES: ValueDistribution = {
  kind: "uniform",
  minMicros: 1_000_000n,
  maxMicros: 3_000_000n,
  stepMicros: 50_000n,
};

/**
 * Blue on Hard. Every prize is still 1.00×–3.00×. v0.13 moves weight toward
 * 2.00×–2.50× so a 25% Grey rate can sit near 0.95×. Mean 1.814×. The 3.00×
 * card stays in the table.
 */
export const BLUE_VALUES_HARD: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 1_000_000n, weight: 14 },
    { valueMicros: 1_200_000n, weight: 12 },
    { valueMicros: 1_500_000n, weight: 20 },
    { valueMicros: 2_000_000n, weight: 32 },
    { valueMicros: 2_500_000n, weight: 14 },
    { valueMicros: 3_000_000n, weight: 8 },
  ],
};

export const GOLD_VALUES: ValueDistribution = {
  kind: "uniform",
  minMicros: 5_000_000n,
  maxMicros: 15_000_000n,
  stepMicros: 500_000n,
};

export const VALUE_TABLES: Record<StackColor, ValueDistribution> = {
  green: GREEN_VALUES,
  blue: BLUE_VALUES,
  gold: GOLD_VALUES,
};

export const VALUE_TABLES_EASY: Record<StackColor, ValueDistribution> = {
  ...VALUE_TABLES,
  green: GREEN_VALUES_EASY,
};

export const VALUE_TABLES_HARD: Record<StackColor, ValueDistribution> = {
  ...VALUE_TABLES,
  blue: BLUE_VALUES_HARD,
};

export type TierRule = { tier: Exclude<WinTier, "none" | "return" | "even" | "win">; minMicros: bigint };

/**
 * Highest matching tier wins. Everything from `big` upward opens the short
 * celebration; below it the result is read from the HUD only.
 */
export const CELEBRATION_MIN_MICROS = 10_000_000n;
export const WIN_TIERS: readonly TierRule[] = [
  { tier: "mega", minMicros: 50_000_000n },
  { tier: "huge", minMicros: 25_000_000n },
  { tier: "big", minMicros: CELEBRATION_MIN_MICROS },
];

export type DifficultyConfig = {
  id: Difficulty;
  label: string;
  /** Prize colours in board order. Other colours never appear and have no pile. */
  colors: readonly StackColor[];
  blurb: string;
  /** Draw weights per card in per-mille (sum 1000). Ineligible colours must be 0. */
  weights: Weights;
  /** Payout distribution per colour for this mode. */
  values: Record<StackColor, ValueDistribution>;
};

export const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

/**
 * Draw weights, per-mille, summing to 1000. NOT certified RTP.
 *
 * v0.13 more than doubles Grey again, still by taking weight from value cards.
 * Red, Purple, Gold and +1 PACK stay at the v0.12 weights.
 *
 * Hard's red weight stays 29.0%. It was not raised to pull the mean down.
 *
 * v0.12 → v0.13 per-mille. Grey more than doubles. A little of the remaining
 * value weight moves from Green to Blue so the mean can sit near 0.95×.
 * Gold stays at 5 on Medium. Red, Purple and +1 PACK do not move.
 *
 * Easy   grey 180 → 400. Green 632 → 399. Blue 20 → 33.
 * Medium grey 180 → 400. Green 618 → 375. Blue 22 → 45.
 * Hard   grey 110 → 250. Blue 526 → 386.
 *
 * Easy   green 39.9 · blue 3.3 · grey 40.0 · purple 2.4 · red 7.8 · +1 6.6
 * Medium green 37.5 · blue 4.5 · gold 0.5 · grey 40.0 · purple 1.8 · red 9.6 · +1 6.1
 * Hard   blue 38.6 · gold 1.6 · grey 25.0 · purple 2.6 · red 29.0 · +1 3.2
 */
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    colors: ["green", "blue"],
    blurb: "Green + Blue · frequent small returns",
    weights: { green: 399, blue: 33, gold: 0, grey: 400, purple: 24, red: 78, extra: 66 },
    values: VALUE_TABLES_EASY,
  },
  medium: {
    id: "medium",
    label: "Medium",
    colors: ["green", "blue", "gold"],
    blurb: "Green + Blue + Gold · balanced",
    weights: { green: 375, blue: 45, gold: 5, grey: 400, purple: 18, red: 96, extra: 61 },
    values: VALUE_TABLES,
  },
  hard: {
    id: "hard",
    label: "Hard",
    colors: ["blue", "gold"],
    blurb: "Blue + Gold only · mostly busts, heavy hits",
    weights: { green: 0, blue: 386, gold: 16, grey: 250, purple: 26, red: 290, extra: 32 },
    values: VALUE_TABLES_HARD,
  },
};

export const DEFAULT_DIFFICULTY: Difficulty = "medium";

export type DemoConfig = {
  id: string;
  difficulty: Difficulty;
  colors: readonly StackColor[];
  cardsPerPack: number;
  /** Most packs a round may open, the starting pack included. */
  maxPacks: number;
  weights: Weights;
  values: Record<StackColor, ValueDistribution>;
  purpleFactor: number;
  tiers: readonly TierRule[];
};

export function configFor(difficulty: Difficulty): DemoConfig {
  const mode = DIFFICULTIES[difficulty];
  return {
    id: `${DEMO_CONFIG_ID}/${difficulty}`,
    difficulty,
    colors: mode.colors,
    cardsPerPack: 6,
    maxPacks: MAX_PACKS,
    weights: mode.weights,
    values: mode.values,
    purpleFactor: PURPLE_FACTOR,
    tiers: WIN_TIERS,
  };
}

export const DEMO_CONFIG: DemoConfig = configFor(DEFAULT_DIFFICULTY);

export const STARTING_BALANCE_CREDITS = 1_000;
export const STAKE_PRESETS = [1, 5, 10, 25, 50, 100] as const;
export const DEFAULT_STAKE = 10;
