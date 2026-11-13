import { levelMicros, sumLevels } from "../engine/money";
import { COLORS, type Card, type Color, type ColorCard, type RoundEvent } from "../engine/types";

/**
 * Presentation timeline. Each engine event expands into one or more scene
 * steps so the UI can show a pack arriving, a card ejecting, a card landing,
 * a merge collapsing, and so on. Steps never add randomness or change the
 * outcome; they are a deterministic function of the engine's event log.
 */
export type Step =
  | { kind: "pack_enter"; packNo: number }
  | { kind: "pack_open"; packNo: number }
  | { kind: "eject"; card: Card; packNo: number; position: number }
  | { kind: "land"; card: Card }
  | { kind: "merge_collapse"; removed: [string, string]; created: ColorCard }
  | { kind: "merge_pop"; removed: [string, string]; created: ColorCard }
  | { kind: "pack_earned"; pendingPacks: number }
  | { kind: "skull_strike"; cardId: string }
  | { kind: "wipe" }
  | { kind: "settle"; multiplierMicros: bigint; outcome: "loss" | "resolved" };

export function buildTimeline(events: readonly RoundEvent[]): Step[] {
  const steps: Step[] = [];
  for (const event of events) {
    switch (event.type) {
      case "pack_open":
        steps.push({ kind: "pack_enter", packNo: event.packNo });
        steps.push({ kind: "pack_open", packNo: event.packNo });
        break;
      case "card_reveal":
        steps.push({ kind: "eject", card: event.card, packNo: event.packNo, position: event.position });
        if (event.card.kind !== "skull") steps.push({ kind: "land", card: event.card });
        break;
      case "merge":
        steps.push({ kind: "merge_collapse", removed: event.removed, created: event.created });
        steps.push({ kind: "merge_pop", removed: event.removed, created: event.created });
        break;
      case "pack_earned":
        steps.push({ kind: "pack_earned", pendingPacks: event.pendingPacks });
        break;
      case "skull":
        steps.push({ kind: "skull_strike", cardId: event.cardId });
        steps.push({ kind: "wipe" });
        break;
      case "round_end":
        steps.push({ kind: "settle", multiplierMicros: event.multiplierMicros, outcome: event.outcome });
        break;
      default: {
        const never: never = event;
        return never;
      }
    }
  }
  return steps;
}

export type LaneCardState = "idle" | "landing" | "collapsing" | "born" | "dying";

export type LaneCard = {
  id: string;
  color: Color;
  level: number;
  state: LaneCardState;
};

export type FlyerTarget = "lane" | "queue" | "discard" | "center";

export type Flyer = {
  card: Card;
  phase: "eject" | "land";
  target: FlyerTarget;
  lane: Color | null;
};

export type PackVisual = "none" | "arriving" | "open" | "spent" | "dead";

export type SceneStatus = "idle" | "playing" | "won" | "no_win" | "skull";

export type Burst = {
  id: string;
  text: string;
  tone: "merge" | "extra" | "grey" | "skull";
};

export type Scene = {
  status: SceneStatus;
  packNo: number;
  openedPacks: number;
  pendingPacks: number;
  cardsLeftInPack: number;
  pack: PackVisual;
  flyer: Flyer | null;
  lanes: Record<Color, LaneCard[]>;
  discarded: number;
  potentialMicros: bigint;
  finalMicros: bigint | null;
  skullPhase: "none" | "strike" | "wipe" | "dead";
  burst: Burst | null;
  caption: string;
};

function emptyLanes(): Record<Color, LaneCard[]> {
  return { red: [], blue: [], green: [], gold: [] };
}

export function initialScene(): Scene {
  return {
    status: "idle",
    packNo: 0,
    openedPacks: 0,
    pendingPacks: 1,
    cardsLeftInPack: 6,
    pack: "none",
    flyer: null,
    lanes: emptyLanes(),
    discarded: 0,
    potentialMicros: 0n,
    finalMicros: null,
    skullPhase: "none",
    burst: null,
    caption: "Set a demo stake and press Play.",
  };
}

export function labelColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function formatValue(level: number): string {
  const micros = levelMicros(level);
  const whole = micros / 1_000_000n;
  const cents = (micros % 1_000_000n) / 10_000n;
  return `${whole}.${cents.toString().padStart(2, "0")}×`;
}

function liveCards(lanes: Record<Color, LaneCard[]>): LaneCard[] {
  return COLORS.flatMap((color) => lanes[color]).filter((card) => card.state !== "dying");
}

function potentialOf(lanes: Record<Color, LaneCard[]>): bigint {
  return sumLevels(liveCards(lanes).map((card) => card.level));
}

function settleTransients(lanes: Record<Color, LaneCard[]>): Record<Color, LaneCard[]> {
  const next = emptyLanes();
  for (const color of COLORS) {
    next[color] = lanes[color].map((card) =>
      card.state === "landing" || card.state === "born" ? { ...card, state: "idle" } : card,
    );
  }
  return next;
}

function mapLane(
  lanes: Record<Color, LaneCard[]>,
  color: Color,
  fn: (cards: LaneCard[]) => LaneCard[],
): Record<Color, LaneCard[]> {
  return { ...lanes, [color]: fn(lanes[color]) };
}

function laneOf(lanes: Record<Color, LaneCard[]>, id: string): Color | null {
  for (const color of COLORS) {
    if (lanes[color].some((card) => card.id === id)) return color;
  }
  return null;
}

export function applyStep(previous: Scene, step: Step): Scene {
  const state: Scene = {
    ...previous,
    lanes: settleTransients(previous.lanes),
    burst: null,
  };

  switch (step.kind) {
    case "pack_enter":
      return {
        ...state,
        status: "playing",
        packNo: step.packNo,
        openedPacks: step.packNo,
        pendingPacks: Math.max(0, state.pendingPacks - 1),
        cardsLeftInPack: 6,
        pack: "arriving",
        flyer: null,
        caption: step.packNo === 1 ? "Pack 1 arrives" : `Pack ${step.packNo} joins the same round`,
      };
    case "pack_open":
      return { ...state, pack: "open", caption: `Pack ${step.packNo} opens` };
    case "eject": {
      const card = step.card;
      const target: FlyerTarget =
        card.kind === "color" ? "lane" : card.kind === "extra_pack" ? "queue" : card.kind === "grey" ? "discard" : "center";
      const caption =
        card.kind === "color"
          ? `${labelColor(card.color)} L${card.level} flies to its lane`
          : card.kind === "grey"
            ? "Grey · 0× · no merge"
            : card.kind === "extra_pack"
              ? "+1 PACK"
              : "SKULL";
      return {
        ...state,
        cardsLeftInPack: Math.max(0, state.cardsLeftInPack - 1),
        flyer: { card, phase: "eject", target, lane: card.kind === "color" ? card.color : null },
        caption,
      };
    }
    case "land": {
      const card = step.card;
      if (card.kind === "color") {
        const lanes = mapLane(state.lanes, card.color, (cards) => [
          ...cards,
          { id: card.id, color: card.color, level: card.level, state: "landing" },
        ]);
        return {
          ...state,
          lanes,
          flyer: null,
          potentialMicros: potentialOf(lanes),
          caption: `${labelColor(card.color)} L${card.level} joins the ${card.color} stack`,
        };
      }
      if (card.kind === "grey") {
        return {
          ...state,
          flyer: null,
          discarded: state.discarded + 1,
          burst: { id: card.id, text: "0×", tone: "grey" },
          caption: "Grey card · nothing to merge",
        };
      }
      if (card.kind === "extra_pack") {
        return { ...state, flyer: null, caption: "Extra pack earned" };
      }
      return { ...state, flyer: null };
    }
    case "merge_collapse": {
      const [a, b] = step.removed;
      const color = laneOf(state.lanes, a) ?? laneOf(state.lanes, b) ?? step.created.color;
      const lanes = mapLane(state.lanes, color, (cards) =>
        cards.map((card) => (card.id === a || card.id === b ? { ...card, state: "collapsing" } : card)),
      );
      return {
        ...state,
        lanes,
        caption: `Two ${color} L${step.created.level - 1} cards merge`,
      };
    }
    case "merge_pop": {
      const [a, b] = step.removed;
      const color = step.created.color;
      const lanes = mapLane(state.lanes, color, (cards) => [
        ...cards.filter((card) => card.id !== a && card.id !== b),
        { id: step.created.id, color, level: step.created.level, state: "born" },
      ]);
      return {
        ...state,
        lanes,
        potentialMicros: potentialOf(lanes),
        burst: {
          id: step.created.id,
          text: `L${step.created.level} · ${formatValue(step.created.level)}`,
          tone: "merge",
        },
        caption: `${labelColor(color)} upgrades to L${step.created.level}`,
      };
    }
    case "pack_earned":
      return {
        ...state,
        pendingPacks: step.pendingPacks,
        burst: { id: `extra-${state.packNo}-${step.pendingPacks}`, text: "+1 PACK", tone: "extra" },
        caption: `+1 PACK · ${step.pendingPacks} waiting · same bet`,
      };
    case "skull_strike":
      return {
        ...state,
        status: "skull",
        pack: "dead",
        flyer: null,
        pendingPacks: 0,
        skullPhase: "strike",
        burst: { id: step.cardId, text: "SKULL", tone: "skull" },
        caption: "Skull · the round ends now",
      };
    case "wipe": {
      const lanes = emptyLanes();
      for (const color of COLORS) {
        lanes[color] = state.lanes[color].map((card) => ({ ...card, state: "dying" }));
      }
      return {
        ...state,
        lanes,
        potentialMicros: 0n,
        skullPhase: "wipe",
        caption: "Every pending pack and every card is wiped",
      };
    }
    case "settle":
      if (step.outcome === "loss") {
        return {
          ...state,
          status: "skull",
          pendingPacks: 0,
          potentialMicros: 0n,
          finalMicros: 0n,
          skullPhase: "dead",
          caption: "SKULL · 0×",
        };
      }
      return {
        ...state,
        status: step.multiplierMicros > 0n ? "won" : "no_win",
        pack: "spent",
        potentialMicros: step.multiplierMicros,
        finalMicros: step.multiplierMicros,
        caption: step.multiplierMicros > 0n ? "One final win" : "No win · 0×",
      };
    default: {
      const never: never = step;
      return never;
    }
  }
}

export function reduceSteps(steps: readonly Step[]): Scene {
  return steps.reduce(applyStep, initialScene());
}

export function reduceEvents(events: readonly RoundEvent[]): Scene {
  return reduceSteps(buildTimeline(events));
}

export function survivingIds(scene: Scene): string[] {
  return liveCards(scene.lanes)
    .map((card) => card.id)
    .sort();
}
