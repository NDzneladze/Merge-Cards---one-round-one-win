import { MICRO } from "../engine/config";
import { formatMultiplier } from "../engine/money";
import { STACK_COLORS, type Card, type Difficulty, type RoundEvent, type RoundResult, type StackColor, type WinTier } from "../engine/types";

/**
 * Presentation timeline. Each engine event expands into one or more scene
 * steps so the UI can show the pack opening, a card ejecting upward, the card
 * travelling into its compartment, a purple boost landing, and so on. Steps
 * never add randomness or change the outcome; they are a deterministic
 * function of the engine's event log.
 */
/** Where a card flies after it ejects: a pile, the arena centre (red), or the booster stack (+1 PACK). */
export type FlightTarget = StackColor | "center" | "boosters";

export type Step =
  | { kind: "pack_enter"; packNo: number; cards: number; pending: number }
  | { kind: "pack_open"; packNo: number }
  | { kind: "eject"; card: Card }
  | { kind: "travel"; card: Card; target: FlightTarget }
  | { kind: "stack"; cardId: string; color: StackColor; stackTotalMicros: bigint; totalMicros: bigint }
  | { kind: "earn"; cardId: string; pending: number; totalPacks: number }
  | {
      kind: "boost";
      cardId: string;
      color: StackColor;
      factor: number;
      stackFactor: number;
      stackTotalMicros: bigint;
      totalMicros: bigint;
    }
  | { kind: "bust_strike"; cardId: string; lostMicros: bigint; cancelledPacks: number }
  | { kind: "wipe" }
  | { kind: "settle"; multiplierMicros: bigint; outcome: "bust" | "resolved"; tier: WinTier };

export function buildTimeline(events: readonly RoundEvent[]): Step[] {
  const steps: Step[] = [];
  for (const event of events) {
    switch (event.type) {
      case "pack_open":
        steps.push({ kind: "pack_enter", packNo: event.packNo, cards: event.cards, pending: event.pending });
        steps.push({ kind: "pack_open", packNo: event.packNo });
        break;
      case "card_reveal": {
        steps.push({ kind: "eject", card: event.card });
        if (event.card.kind === "value") steps.push({ kind: "travel", card: event.card, target: event.card.color });
        else if (event.card.kind === "red") steps.push({ kind: "travel", card: event.card, target: "center" });
        else if (event.card.kind === "extra") steps.push({ kind: "travel", card: event.card, target: "boosters" });
        // Purple travels once the engine has named its target (see `boost`).
        break;
      }
      case "pack_earned":
        steps.push({ kind: "earn", cardId: event.cardId, pending: event.pending, totalPacks: event.totalPacks });
        break;
      case "stack_add":
        steps.push({
          kind: "stack",
          cardId: event.cardId,
          color: event.color,
          stackTotalMicros: event.stackTotalMicros,
          totalMicros: event.totalMicros,
        });
        break;
      case "boost": {
        const eject = steps[steps.length - 1];
        if (eject?.kind === "eject" && eject.card.kind === "purple" && eject.card.id === event.cardId) {
          steps.push({ kind: "travel", card: eject.card, target: event.color });
        }
        steps.push({
          kind: "boost",
          cardId: event.cardId,
          color: event.color,
          factor: event.factor,
          stackFactor: event.stackFactor,
          stackTotalMicros: event.stackTotalMicros,
          totalMicros: event.totalMicros,
        });
        break;
      }
      case "bust":
        steps.push({ kind: "bust_strike", cardId: event.cardId, lostMicros: event.lostMicros, cancelledPacks: event.cancelledPacks });
        steps.push({ kind: "wipe" });
        break;
      case "round_end":
        steps.push({ kind: "settle", multiplierMicros: event.multiplierMicros, outcome: event.outcome, tier: event.tier });
        break;
      default: {
        const never: never = event;
        return never;
      }
    }
  }
  return steps;
}

export type StackCardState = "idle" | "landing" | "dying";

export type StackCard = {
  id: string;
  valueMicros: bigint;
  state: StackCardState;
};

export type StackView = {
  color: StackColor;
  cards: StackCard[];
  factor: number;
  totalMicros: bigint;
  /** Changes whenever a purple lands so the UI can replay the boost flash. */
  boostKey: string | null;
  /** True for the step on which a card landed or a boost hit. */
  hot: boolean;
};

export type Flyer = {
  card: Card;
  phase: "eject" | "travel";
  target: FlightTarget | null;
};

export type PackVisual = "none" | "arriving" | "open" | "spent" | "dead";

/** won: above 1× · even: exactly 1× · returned: below 1× but not zero · no_win: 0× without a red card. */
export type SceneStatus = "idle" | "playing" | "won" | "even" | "returned" | "no_win" | "bust";

export type Burst = {
  id: string;
  text: string;
  tone: "value" | "boost" | "bust" | "extra";
  color?: StackColor;
};

export type Scene = {
  status: SceneStatus;
  difficulty: Difficulty;
  /** Piles on the board, in order. Other colours are hidden. */
  colors: readonly StackColor[];
  packNo: number;
  /** Packs opened so far plus every pack still queued. */
  packsTotal: number;
  /** Packs earned and waiting behind the current one. */
  pendingPacks: number;
  /** Changes whenever a +1 PACK lands so the queue can replay its increment. */
  earnKey: string | null;
  /** Queued packs a red card threw away. */
  cancelledPacks: number;
  cardsInPack: number;
  cardsLeftInPack: number;
  pack: PackVisual;
  flyer: Flyer | null;
  stacks: Record<StackColor, StackView>;
  totalMicros: bigint;
  finalMicros: bigint | null;
  tier: WinTier;
  lostMicros: bigint;
  bustPhase: "none" | "strike" | "wipe" | "dead";
  /** The red card that ended the round, kept on stage after the strike. */
  redCard: Card | null;
  burst: Burst | null;
  caption: string;
};

function emptyStacks(colors: readonly StackColor[]): Record<StackColor, StackView> {
  const out = {} as Record<StackColor, StackView>;
  for (const color of colors) {
    out[color] = { color, cards: [], factor: 1, totalMicros: 0n, boostKey: null, hot: false };
  }
  return out;
}

export function initialScene(difficulty: Difficulty = "medium", colors: readonly StackColor[] = STACK_COLORS): Scene {
  return {
    status: "idle",
    difficulty,
    colors,
    packNo: 0,
    packsTotal: 1,
    pendingPacks: 0,
    earnKey: null,
    cancelledPacks: 0,
    cardsInPack: 6,
    cardsLeftInPack: 6,
    pack: "none",
    flyer: null,
    stacks: emptyStacks(colors),
    totalMicros: 0n,
    finalMicros: null,
    tier: "none",
    lostMicros: 0n,
    bustPhase: "none",
    redCard: null,
    burst: null,
    caption: "Set a demo stake and press Play.",
  };
}

export function labelColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

export function describeCard(card: Card): string {
  if (card.kind === "value") return `${labelColor(card.color)} ${formatMultiplier(card.valueMicros)}`;
  if (card.kind === "purple") return `Purple ×${card.factor}`;
  if (card.kind === "extra") return "+1 PACK";
  return "Red";
}

function settleTransients(stacks: Record<StackColor, StackView>): Record<StackColor, StackView> {
  const next = { ...stacks };
  for (const stack of Object.values(stacks)) {
    const { color } = stack;
    next[color] = {
      ...stack,
      hot: false,
      cards: stack.cards.map((card) => (card.state === "landing" ? { ...card, state: "idle" } : card)),
    };
  }
  return next;
}

export function applyStep(previous: Scene, step: Step): Scene {
  const state: Scene = {
    ...previous,
    stacks: settleTransients(previous.stacks),
    burst: null,
  };

  switch (step.kind) {
    case "pack_enter":
      return {
        ...state,
        status: "playing",
        packNo: step.packNo,
        packsTotal: step.packNo + step.pending,
        pendingPacks: step.pending,
        cardsInPack: step.cards,
        cardsLeftInPack: step.cards,
        pack: "arriving",
        flyer: null,
        caption: step.packNo === 1 ? "Pack arrives" : `Bonus pack ${step.packNo} arrives`,
      };
    case "pack_open":
      return { ...state, pack: "open", caption: step.packNo === 1 ? "Pack opens" : `Pack ${step.packNo} opens · same stacks` };
    case "eject":
      return {
        ...state,
        cardsLeftInPack: Math.max(0, state.cardsLeftInPack - 1),
        flyer: { card: step.card, phase: "eject", target: null },
        caption: describeCard(step.card),
      };
    case "travel": {
      const card = step.card;
      const caption =
        card.kind === "value"
          ? `${describeCard(card)} → ${card.color} stack`
          : card.kind === "purple"
            ? `Purple ×${card.factor} → ${step.target} stack`
            : card.kind === "extra"
              ? "+1 PACK → booster stack"
              : "RED";
      return { ...state, flyer: { card, phase: "travel", target: step.target }, caption };
    }
    case "earn":
      return {
        ...state,
        flyer: null,
        pendingPacks: step.pending,
        packsTotal: step.totalPacks,
        earnKey: step.cardId,
        burst: { id: step.cardId, text: "+1 PACK", tone: "extra" },
        caption: step.pending === 1 ? "+1 PACK · a bonus pack slides in below" : `+1 PACK · ${step.pending} bonus packs waiting below`,
      };
    case "stack": {
      const flyer = state.flyer;
      const valueMicros = flyer?.card.kind === "value" && flyer.card.id === step.cardId ? flyer.card.valueMicros : 0n;
      const stack = state.stacks[step.color];
      return {
        ...state,
        flyer: null,
        stacks: {
          ...state.stacks,
          [step.color]: {
            ...stack,
            hot: true,
            totalMicros: step.stackTotalMicros,
            cards: [...stack.cards, { id: step.cardId, valueMicros, state: "landing" }],
          },
        },
        totalMicros: step.totalMicros,
        burst: { id: step.cardId, text: `+${formatMultiplier(valueMicros)}`, tone: "value", color: step.color },
        caption: `${labelColor(step.color)} stack ${formatMultiplier(step.stackTotalMicros)}`,
      };
    }
    case "boost": {
      const stack = state.stacks[step.color];
      return {
        ...state,
        flyer: null,
        stacks: {
          ...state.stacks,
          [step.color]: {
            ...stack,
            hot: true,
            factor: step.stackFactor,
            totalMicros: step.stackTotalMicros,
            boostKey: step.cardId,
          },
        },
        totalMicros: step.totalMicros,
        burst: { id: step.cardId, text: `×${step.factor} ${labelColor(step.color)}`, tone: "boost", color: step.color },
        caption:
          stack.cards.length === 0
            ? `${labelColor(step.color)} stack ×${step.stackFactor} · waits for cards`
            : `${labelColor(step.color)} stack ×${step.stackFactor} → ${formatMultiplier(step.stackTotalMicros)}`,
      };
    }
    case "bust_strike":
      return {
        ...state,
        status: "bust",
        pack: "dead",
        redCard: state.flyer?.card ?? { kind: "red", id: step.cardId },
        flyer: null,
        lostMicros: step.lostMicros,
        pendingPacks: 0,
        cancelledPacks: step.cancelledPacks,
        bustPhase: "strike",
        burst: { id: step.cardId, text: "RED", tone: "bust" },
        caption:
          step.cancelledPacks > 0
            ? `Red card · round ends now · ${step.cancelledPacks} waiting pack${step.cancelledPacks === 1 ? "" : "s"} cancelled`
            : "Red card · the round ends now",
      };
    case "wipe": {
      const stacks = { ...state.stacks };
      for (const color of state.colors) {
        stacks[color] = {
          ...state.stacks[color],
          hot: false,
          cards: state.stacks[color].cards.map((card) => ({ ...card, state: "dying" })),
        };
      }
      return {
        ...state,
        stacks,
        totalMicros: 0n,
        bustPhase: "wipe",
        caption: state.lostMicros > 0n ? `${formatMultiplier(state.lostMicros)} wiped` : "Nothing to collect",
      };
    }
    case "settle":
      if (step.outcome === "bust") {
        return {
          ...state,
          status: "bust",
          totalMicros: 0n,
          finalMicros: 0n,
          tier: "none",
          bustPhase: "dead",
          caption: "Round over · 0.00×",
        };
      }
      return {
        ...state,
        status:
          step.multiplierMicros > MICRO
            ? "won"
            : step.multiplierMicros === MICRO
              ? "even"
              : step.multiplierMicros > 0n
                ? "returned"
                : "no_win",
        pack: "spent",
        totalMicros: step.multiplierMicros,
        finalMicros: step.multiplierMicros,
        tier: step.tier,
        caption:
          step.multiplierMicros > MICRO
            ? `Round over · win ${formatMultiplier(step.multiplierMicros)}`
            : step.multiplierMicros === MICRO
              ? "Round over · break-even 1.00×"
              : step.multiplierMicros > 0n
                ? `Round over · return ${formatMultiplier(step.multiplierMicros)} · below the stake`
                : "Round over · nothing collected",
      };
    default: {
      const never: never = step;
      return never;
    }
  }
}

export function reduceSteps(steps: readonly Step[], start: Scene = initialScene()): Scene {
  return steps.reduce(applyStep, start);
}

export function sceneFor(result: Pick<RoundResult, "difficulty" | "colors">): Scene {
  return initialScene(result.difficulty, result.colors);
}

export function reduceEvents(events: readonly RoundEvent[], start: Scene = initialScene()): Scene {
  return reduceSteps(buildTimeline(events), start);
}

export function reduceResult(result: RoundResult, upto?: number): Scene {
  const steps = buildTimeline(result.events);
  return reduceSteps(upto === undefined ? steps : steps.slice(0, upto), sceneFor(result));
}

export function liveCardIds(scene: Scene): string[] {
  return scene.colors
    .flatMap((color) => scene.stacks[color].cards)
    .filter((card) => card.state !== "dying")
    .map((card) => card.id)
    .sort();
}
