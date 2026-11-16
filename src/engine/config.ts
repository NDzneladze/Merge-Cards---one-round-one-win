import type { CardKind, Difficulty, StackColor, WinTier } from "./types";

/**
 * DEMO-ONLY placeholders. Every weight, value table and tier below is a
 * prototype knob: NOT a validated RTP, NOT certified, NOT for real money.
 * `npm run simulate` reports what the current knobs produce per difficulty.
 */
export const DEMO_CONFIG_ID = "merge-packs-demo-v0.5";

export const MICRO = 1_000_000n;

export const KIND_ORDER = ["green", "blue", "gold", "purple", "red", "extra"] as const satisfies readonly CardKind[];

export type Weights = Record<CardKind, number>;

/** Hard cap on packs opened in one round, the starting pack included. Prototype safety, not math. */
export const MAX_PACKS = 6;

/** A purple card multiplies the targeted stack by this factor. Boosts compound. */
export const PURPLE_FACTOR = 2;

export type ValueDistribution =
  /** Uniform on an inclusive step grid. */
  | { kind: "uniform"; minMicros: bigint; maxMicros: bigint; stepMicros: bigint }
  /** Explicit denominations with draw weights. */
  | { kind: "weighted"; entries: readonly { valueMicros: bigint; weight: number }[] };

/**
 * Green is small change. 88 % of green cards are ≤ 0.20× (0.10×, 0.12× and
 * 0.13× alone make 72 %); the larger denominations are deliberately rare so
 * a safe round can finish below 1.00×. Mean ≈ 0.16×.
 */
export const GREEN_VALUES: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 100_000n, weight: 30 },
    { valueMicros: 120_000n, weight: 23 },
    { valueMicros: 130_000n, weight: 19 },
    { valueMicros: 150_000n, weight: 9 },
    { valueMicros: 180_000n, weight: 4 },
    { valueMicros: 200_000n, weight: 3 },
    { valueMicros: 250_000n, weight: 3 },
    { valueMicros: 300_000n, weight: 3 },
    { valueMicros: 400_000n, weight: 2 },
    { valueMicros: 500_000n, weight: 2 },
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
 * span, but weighted towards the low end (mean ≈ 1.25×) so six Blue/Gold
 * cards per pack do not make Hard a strictly better pick.
 */
export const BLUE_VALUES_HARD: ValueDistribution = {
  kind: "weighted",
  entries: [
    { valueMicros: 1_000_000n, weight: 46 },
    { valueMicros: 1_050_000n, weight: 14 },
    { valueMicros: 1_100_000n, weight: 12 },
    { valueMicros: 1_200_000n, weight: 9 },
    { valueMicros: 1_500_000n, weight: 8 },
    { valueMicros: 2_000_000n, weight: 6 },
    { valueMicros: 2_500_000n, weight: 3 },
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
 * Per-mode draw weights in per-mille. Purple, Red and +1 PACK exist in every
 * mode. The knobs are set so each mode's placeholder mean sits a little
 * below 1× (≈ 0.93–0.94× at 50k rounds) and Hard is never the better pick:
 * every Hard prize card is worth ≥ 1×, so Hard carries a much heavier Red
 * and a lighter +1. `npm run simulate` prints the current numbers.
 */
export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    colors: ["green", "blue"],
    blurb: "Green + Blue · frequent small returns",
    weights: { green: 835, blue: 20, gold: 0, purple: 25, red: 70, extra: 50 },
    values: VALUE_TABLES,
  },
  medium: {
    id: "medium",
    label: "Medium",
    colors: ["green", "blue", "gold"],
    blurb: "Green + Blue + Gold · balanced",
    weights: { green: 820, blue: 22, gold: 4, purple: 18, red: 88, extra: 48 },
    values: VALUE_TABLES,
  },
  hard: {
    id: "hard",
    label: "Hard",
    colors: ["blue", "gold"],
    blurb: "Blue + Gold only · mostly busts, heavy hits",
    weights: { green: 0, blue: 630, gold: 10, purple: 30, red: 290, extra: 40 },
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
