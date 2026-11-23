/** Left-to-right order of the card piles on the board. A difficulty uses a subset. */
export const STACK_COLORS = ["green", "blue", "gold"] as const;

export type StackColor = (typeof STACK_COLORS)[number];

export type Difficulty = "easy" | "medium" | "hard";

/** Everything a pack can contain. `grey` is a safe blank: 0×, not a prize pile. */
export type CardKind = StackColor | "grey" | "purple" | "red" | "extra";

export type ValueCard = { kind: "value"; id: string; color: StackColor; valueMicros: bigint };
export type PurpleCard = { kind: "purple"; id: string; factor: number };
export type RedCard = { kind: "red"; id: string };
/** +1 PACK. Queues one more pack of the same round at no extra cost. */
export type ExtraPackCard = { kind: "extra"; id: string };
/** Safe blank. Occupies one of the six slots and pays nothing. */
export type GreyCard = { kind: "grey"; id: string };

export type Card = ValueCard | PurpleCard | RedCard | ExtraPackCard | GreyCard;

/** Every card that physically sits in a pile. Grey is in the pile at 0×. */
export type PileCard = ValueCard | GreyCard;

export type StackState = {
  color: StackColor;
  /** Value cards and grey cards, in landing order. Purple, red and +1 PACK never join. */
  cards: readonly PileCard[];
  /** Product of every purple boost that landed on this stack. 1 when none. Equals 2^purpleCount. */
  factor: number;
  /**
   * True after this pile has collected `FULL_STACK_COUNT` cards once, grey included.
   * Multiplies the pile by `FULL_STACK_FACTOR`. Never set twice, and cleared
   * when a red card wipes the board.
   */
  fullStack: boolean;
};

/**
 * none: 0× (red card, or nothing collected) · return: below 1× (gross payout
 * is a net loss) · even: exactly 1× · win: above 1× · big/huge/mega: the
 * celebrated tiers from `WIN_TIERS`.
 */
export type WinTier = "none" | "return" | "even" | "win" | "big" | "huge" | "mega";

export type RoundOutcome = "bust" | "resolved";

export type RoundEvent =
  | {
      type: "pack_open";
      packNo: number;
      cards: number;
      /** Packs already earned and still waiting behind this one. */
      pending: number;
    }
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
  | {
      type: "full_stack";
      cardId: string;
      color: StackColor;
      /** Physical cards in the pile when it first reached the threshold, Grey included. Always the threshold. */
      count: number;
      /** The one-shot pile multiplier. 2 in the prototype. */
      factor: number;
      stackTotalMicros: bigint;
      totalMicros: bigint;
    }
  | {
      type: "pack_earned";
      cardId: string;
      /** Packs waiting after this award, the current pack excluded. */
      pending: number;
      /** Packs opened so far plus every pack waiting. */
      totalPacks: number;
    }
  | {
      /** A grey 0× card joined a pile. It adds nothing to the sum and counts toward Stack Bonus. */
      type: "grey";
      cardId: string;
      color: StackColor;
      /** Cards in that pile after the grey landed, grey included. */
      count: number;
      stackTotalMicros: bigint;
      totalMicros: bigint;
    }
  | { type: "bust"; cardId: string; lostMicros: bigint; cancelledPacks: number }
  | { type: "round_end"; multiplierMicros: bigint; outcome: RoundOutcome; tier: WinTier };

export type ScriptedDraw =
  | { kind: StackColor; /** Multiplier as a plain number, e.g. 0.31. Drawn from the seed when omitted. */ value?: number }
  | { kind: "purple" }
  | { kind: "red" }
  | { kind: "extra" }
  | { kind: "grey"; /** Pile the grey joins. Drawn from the seed's routing stream when omitted. */ target?: StackColor };

export type RoundResult = {
  seed: string;
  stake: number;
  difficulty: Difficulty;
  /** Prize colours in play, in board order. */
  colors: readonly StackColor[];
  events: readonly RoundEvent[];
  outcome: RoundOutcome;
  /** 1_000_000n === 1.00×. Zero after a red card. */
  multiplierMicros: bigint;
  /** Gross return: stake credits × multiplier, in credit micros (1 credit = 1_000_000n). */
  payoutMicros: bigint;
  /** Gross return minus the stake. Negative on a bust or a sub-1× return. */
  netMicros: bigint;
  tier: WinTier;
  openedPacks: number;
  /** +1 PACK cards revealed, including any later cancelled by a red card. */
  earnedPacks: number;
  /** Packs still queued when the red card hit. Zero on a safe finish. */
  cancelledPacks: number;
  /** Final board, eligible colours only, in board order. Every stack is empty after a red card. */
  stacks: readonly StackState[];
  /** Board value wiped by the red card. Zero on a safe finish. */
  lostMicros: bigint;
  /** Safe blank cards revealed. They pay 0× and join a pile. */
  greyCards: number;
  /** Piles that unlocked Full Stack and still paid. Zero after a red card. */
  fullStackPiles: number;
  /** The purchased stake is debited once. */
  stakeDebits: 1;
};
