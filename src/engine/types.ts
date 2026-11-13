export const COLORS = ["red", "blue", "green", "gold"] as const;

export type Color = (typeof COLORS)[number];

export type Token = Color | "grey" | "extra_pack" | "skull";

export type Card =
  | { kind: "color"; id: string; color: Color; level: number }
  | { kind: "grey"; id: string }
  | { kind: "extra_pack"; id: string }
  | { kind: "skull"; id: string };

export type ColorCard = Extract<Card, { kind: "color" }>;

export type RoundEvent =
  | { type: "pack_open"; packNo: number }
  | { type: "card_reveal"; card: Card; packNo: number; position: number }
  | { type: "merge"; removed: [string, string]; created: ColorCard }
  | { type: "pack_earned"; pendingPacks: number }
  | { type: "skull"; cardId: string }
  | { type: "round_end"; multiplierMicros: bigint; outcome: "loss" | "resolved" };

export type RoundOutcome = "loss" | "resolved";

export type ScriptedDraw =
  | { kind: "grey" }
  | { kind: "extra_pack" }
  | { kind: "skull" }
  | { kind: "color"; color: Color };

export type RoundResult = {
  seed: string;
  stake: number;
  events: readonly RoundEvent[];
  outcome: RoundOutcome;
  /** 1_000_000n === 1.00×. Zero when a Skull ends the round. */
  multiplierMicros: bigint;
  /** stake credits × multiplier, in credit micros (1 credit = 1_000_000n). */
  payoutMicros: bigint;
  openedPacks: number;
  /** Prize cards that survive a safe finish. Empty after Skull. */
  survivingBoard: readonly ColorCard[];
  /** Board value wiped by Skull. Zero on a safe finish. */
  potentialLostMicros: bigint;
  /** The purchased stake is debited once. Extra packs never debit again. */
  stakeDebits: 1;
};
