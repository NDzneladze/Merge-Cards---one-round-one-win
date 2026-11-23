import { COLORS, type Color, type Token } from "./types";

/**
 * DEMO-ONLY placeholders. These weights and values are NOT a validated RTP,
 * are NOT certified, and must not be used for real-money wagering.
 *
 * Non-cap draw weights (sum 100):
 *   red 17, blue 17, green 17, gold 17, grey 18, extra_pack 11, skull 3.
 *
 * At the pack cap, Extra Pack is removed from the pool and the remaining
 * weights are used as-is (denominator 89). Conditional probabilities:
 *   each color 17/89, grey 18/89, skull 3/89, extra pack 0.
 * That redistribution is a prototype convenience, not an approved math model.
 */
export const DEMO_CONFIG_ID = "merge-packs-demo-v0.1";

export const MICRO = 1_000_000n;

/** Level → multiplier in micros. Level 6 is the maximum; there is no level 7. */
export const LEVEL_MICROS: Record<number, bigint> = {
  1: 100_000n,
  2: 250_000n,
  3: 600_000n,
  4: 1_500_000n,
  5: 4_000_000n,
  6: 10_000_000n,
};

export const TOKEN_ORDER = [
  "red",
  "blue",
  "green",
  "gold",
  "grey",
  "extra_pack",
  "skull",
] as const satisfies readonly Token[];

export type Weights = Record<Token, number>;

export const DEMO_WEIGHTS: Weights = {
  red: 17,
  blue: 17,
  green: 17,
  gold: 17,
  grey: 18,
  extra_pack: 11,
  skull: 3,
};

export type DemoConfig = {
  id: string;
  maxOpenedPacks: number;
  cardsPerPack: number;
  maxLevel: number;
  colors: readonly Color[];
  weights: Weights;
};

export const DEMO_CONFIG: DemoConfig = {
  id: DEMO_CONFIG_ID,
  maxOpenedPacks: 6,
  cardsPerPack: 6,
  maxLevel: 6,
  colors: COLORS,
  weights: DEMO_WEIGHTS,
};

export const CAPPED_WEIGHT_DENOMINATOR =
  DEMO_WEIGHTS.red +
  DEMO_WEIGHTS.blue +
  DEMO_WEIGHTS.green +
  DEMO_WEIGHTS.gold +
  DEMO_WEIGHTS.grey +
  DEMO_WEIGHTS.skull;

export const STARTING_BALANCE_CREDITS = 1_000;
export const STAKE_PRESETS = [1, 5, 10, 25, 50, 100] as const;
export const DEFAULT_STAKE = 10;
