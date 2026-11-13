import type { CardKind, StackColor, WinTier } from "./types";

/**
 * DEMO-ONLY placeholders. These weights, value ranges and tiers are NOT a
 * validated RTP, are NOT certified, and must not be used for real-money play.
 */
export const DEMO_CONFIG_ID = "merge-packs-demo-v0.3";

export const MICRO = 1_000_000n;

export const KIND_ORDER = ["green", "blue", "gold", "purple", "red"] as const satisfies readonly CardKind[];

export type Weights = Record<CardKind, number>;

/** Draw weights per card, sum 100. */
export const DEMO_WEIGHTS: Weights = {
  green: 60,
  blue: 15,
  gold: 4,
  purple: 10,
  red: 11,
};

export type ValueRange = {
  minMicros: bigint;
  maxMicros: bigint;
  stepMicros: bigint;
};

/** Inclusive value ranges per stack color, drawn uniformly on the step grid. */
export const VALUE_RANGES: Record<StackColor, ValueRange> = {
  green: { minMicros: 100_000n, maxMicros: 1_000_000n, stepMicros: 10_000n },
  blue: { minMicros: 1_000_000n, maxMicros: 3_000_000n, stepMicros: 50_000n },
  gold: { minMicros: 5_000_000n, maxMicros: 15_000_000n, stepMicros: 500_000n },
};

/** A purple card multiplies the targeted stack by this factor. Boosts compound. */
export const PURPLE_FACTOR = 2;

export type TierRule = { tier: Exclude<WinTier, "none" | "win">; minMicros: bigint };

/** Highest matching tier wins. Below `big` an ordinary win is shown in the HUD only. */
export const WIN_TIERS: readonly TierRule[] = [
  { tier: "mega", minMicros: 75_000_000n },
  { tier: "huge", minMicros: 40_000_000n },
  { tier: "big", minMicros: 20_000_000n },
];

export type DemoConfig = {
  id: string;
  cardsPerPack: number;
  /** Packs opened per round. The red card can still end the round early. */
  packsPerRound: number;
  weights: Weights;
  ranges: Record<StackColor, ValueRange>;
  purpleFactor: number;
  tiers: readonly TierRule[];
};

export const DEMO_CONFIG: DemoConfig = {
  id: DEMO_CONFIG_ID,
  cardsPerPack: 6,
  packsPerRound: 1,
  weights: DEMO_WEIGHTS,
  ranges: VALUE_RANGES,
  purpleFactor: PURPLE_FACTOR,
  tiers: WIN_TIERS,
};

export const STARTING_BALANCE_CREDITS = 1_000;
export const STAKE_PRESETS = [1, 5, 10, 25, 50, 100] as const;
export const DEFAULT_STAKE = 10;
