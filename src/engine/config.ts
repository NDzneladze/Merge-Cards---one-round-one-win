import type { CardKind, Difficulty, StackColor, WinTier } from "./types";

/**
 * DEMO-ONLY placeholders. Every weight, value table and tier below is a
 * prototype knob: NOT a validated RTP, NOT certified, NOT for real money.
 * `npm run simulate` reports what the current knobs produce per difficulty.
 */
export const DEMO_CONFIG_ID = "merge-packs-demo-v0.11";

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
 * Cards in ONE pile that unlock Stack Bonus once per round. Green, Blue, Gold
 * and Grey 0× cards all count; Purple, Red and +1 PACK never do.
 * The 10th card triggers it. The 11th, 20th and 30th do not trigger again.
 * Prototype rule, not an approved production bonus.
 */
export const FULL_STACK_COUNT = 10;

/** Applied once, as `(fullStack ? FULL_STACK_FACTOR : 1)`, on top of purple. */
export const FULL_STACK_FACTOR = 2;

export type ValueDistribution =
  /** Uniform on an inclusive step grid. */
  | { kind: "uniform"; minMicros: bigint; maxMicros: bigint; stepMicros: bigint }
  /** Explicit denominations with draw weights. */
  | { kind: "weighted"; entries: readonly { valueMicros: bigint; weight: number }[] };

/**
 * Green on Easy. Same 0.10×–1.00× denominations as v0.10, shifted toward the
 * small end so the mode mean can sit near 0.95× after Grey counts for Purple.
 * 93% are ≤ 0.20×. Mean 0.1482×. The 0.75× and 1.00× cards stay in the table.
 */
export const GREEN_VALUES_EASY: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 100_000n, weight: 36 },
    { valueMicros: 120_000n, weight: 23 },
    { valueMicros: 130_000n, weight: 19 },
    { valueMicros: 150_000n, weight: 9 },
    { valueMicros: 180_000n, weight: 3 },
    { valueMicros: 200_000n, weight: 3 },
    { valueMicros: 250_000n, weight: 1 },
    { valueMicros: 300_000n, weight: 2 },
    { valueMicros: 400_000n, weight: 1 },
    { valueMicros: 500_000n, weight: 1 },
    { valueMicros: 750_000n, weight: 1 },
    { valueMicros: 1_000_000n, weight: 1 },
  ],
};

/**
 * Green on Medium. A smaller shift than Easy: Medium already has Gold, so the
 * same Easy table would push it under the band. 89% are ≤ 0.20×. Mean 0.157×.
 */
export const GREEN_VALUES: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 100_000n, weight: 31 },
    { valueMicros: 120_000n, weight: 23 },
    { valueMicros: 130_000n, weight: 19 },
    { valueMicros: 150_000n, weight: 9 },
    { valueMicros: 180_000n, weight: 4 },
    { valueMicros: 200_000n, weight: 3 },
    { valueMicros: 250_000n, weight: 3 },
    { valueMicros: 300_000n, weight: 3 },
    { valueMicros: 400_000n, weight: 2 },
    { valueMicros: 500_000n, weight: 1 },
    { valueMicros: 750_000n, weight: 1 },
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
 * Blue on Hard, where every prize card is worth ≥ 1×: the same 1.00× – 3.00×
 * span, weighted a little further toward the low end than v0.10 (mean 1.186×,
 * was 1.222×). The 3.00× card keeps its weight, so the top of the band is still dealt.
 */
export const BLUE_VALUES_HARD: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 1_000_000n, weight: 48 },
    { valueMicros: 1_050_000n, weight: 14 },
    { valueMicros: 1_100_000n, weight: 12 },
    { valueMicros: 1_200_000n, weight: 11 },
    { valueMicros: 1_500_000n, weight: 7 },
    { valueMicros: 2_000_000n, weight: 4 },
    { valueMicros: 2_500_000n, weight: 2 },
    { valueMicros: 3_000_000n, weight: 2 },
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
 * v0.11 keeps the v0.10 weights exactly, including every Red weight. The
 * rebalance is in the denomination tables: Easy green, Medium green, and
 * Hard blue. Grey is still its own weight, never a copy of green.
 *
 * Hard's red weight stays 29.0%. It was not raised to pull the mean down.
 *
 * Easy   green 72.4 · blue 2.0 · grey 8.8 · purple 2.4 · red 7.8 · +1 6.6
 * Medium green 70.4 · blue 2.2 · gold 0.5 · grey 9.4 · purple 1.8 · red 9.6 · +1 6.1
 * Hard   blue 58.6 · gold 1.6 · grey 5.0 · purple 2.6 · red 29.0 · +1 3.2
 */
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    colors: ["green", "blue"],
    blurb: "Green + Blue · frequent small returns",
    weights: { green: 724, blue: 20, gold: 0, grey: 88, purple: 24, red: 78, extra: 66 },
    values: VALUE_TABLES_EASY,
  },
  medium: {
    id: "medium",
    label: "Medium",
    colors: ["green", "blue", "gold"],
    blurb: "Green + Blue + Gold · balanced",
    weights: { green: 704, blue: 22, gold: 5, grey: 94, purple: 18, red: 96, extra: 61 },
    values: VALUE_TABLES,
  },
  hard: {
    id: "hard",
    label: "Hard",
    colors: ["blue", "gold"],
    blurb: "Blue + Gold only · mostly busts, heavy hits",
    weights: { green: 0, blue: 586, gold: 16, grey: 50, purple: 26, red: 290, extra: 32 },
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
