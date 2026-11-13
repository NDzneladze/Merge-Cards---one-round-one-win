/** Left-to-right order of the stack compartments on the board. */
export const STACK_COLORS = ["green", "blue", "gold"] as const;

export type StackColor = (typeof STACK_COLORS)[number];

/** Everything a pack can contain. */
export type CardKind = StackColor | "purple" | "red";

export type ValueCard = { kind: "value"; id: string; color: StackColor; valueMicros: bigint };
export type PurpleCard = { kind: "purple"; id: string; factor: number };
export type RedCard = { kind: "red"; id: string };

export type Card = ValueCard | PurpleCard | RedCard;

export type StackState = {
  color: StackColor;
  cards: readonly ValueCard[];
  /** Product of every purple boost that landed on this stack. 1 when none. */
  factor: number;
};

export type WinTier = "none" | "win" | "big" | "huge" | "mega";

export type RoundOutcome = "bust" | "resolved";

export type RoundEvent =
  | { type: "pack_open"; packNo: number; cards: number }
  | { type: "card_reveal"; card: Card; packNo: number; position: number }
  | {
      type: "stack_add";
      cardId: string;
      color: StackColor;
      stackTotalMicros: bigint;
      totalMicros: bigint;
    }
  | {
      type: "boost";
      cardId: string;
      color: StackColor;
      factor: number;
      stackFactor: number;
      stackTotalMicros: bigint;
      totalMicros: bigint;
    }
  | { type: "bust"; cardId: string; lostMicros: bigint }
  | { type: "round_end"; multiplierMicros: bigint; outcome: RoundOutcome; tier: WinTier };

export type ScriptedDraw =
  | { kind: StackColor; /** Multiplier as a plain number, e.g. 0.31. Drawn from the seed when omitted. */ value?: number }
  | { kind: "purple" }
  | { kind: "red" };

export type RoundResult = {
  seed: string;
  stake: number;
  events: readonly RoundEvent[];
  outcome: RoundOutcome;
  /** 1_000_000n === 1.00×. Zero after a red card. */
  multiplierMicros: bigint;
  /** stake credits × multiplier, in credit micros (1 credit = 1_000_000n). */
  payoutMicros: bigint;
  tier: WinTier;
  openedPacks: number;
  /** Final board. Every stack is empty after a red card. */
  stacks: readonly StackState[];
  /** Board value wiped by the red card. Zero on a safe finish. */
  lostMicros: bigint;
  /** The purchased stake is debited once. */
  stakeDebits: 1;
};
