import { sumLevels } from "../engine/money";
import type { Card, ColorCard, RoundEvent } from "../engine/types";

export type ViewStatus = "playing" | "won" | "no_win" | "skull";

export type ViewState = {
  status: ViewStatus;
  packNo: number;
  pendingPacks: number;
  openedPacks: number;
  potentialMicros: bigint;
  finalMicros: bigint | null;
  board: ColorCard[];
  revealed: Card[];
  hotIds: string[];
  wiped: boolean;
  caption: string;
};

export function initialPlayState(): ViewState {
  return {
    status: "playing",
    packNo: 0,
    pendingPacks: 1,
    openedPacks: 0,
    potentialMicros: 0n,
    finalMicros: null,
    board: [],
    revealed: [],
    hotIds: [],
    wiped: false,
    caption: "Opening the pack",
  };
}

function withPotential(board: ColorCard[]): bigint {
  return sumLevels(board.map((card) => card.level));
}

export function applyEvent(state: ViewState, event: RoundEvent): ViewState {
  switch (event.type) {
    case "pack_open":
      return {
        ...state,
        packNo: event.packNo,
        openedPacks: event.packNo,
        pendingPacks: Math.max(0, state.pendingPacks - 1),
        revealed: [],
        hotIds: [],
        caption: `Pack ${event.packNo} opens`,
      };
    case "card_reveal": {
      const card = event.card;
      const board = card.kind === "color" ? [...state.board, card] : state.board;
      const caption =
        card.kind === "color"
          ? `${labelColor(card.color)} L${card.level}`
          : card.kind === "grey"
            ? "Grey · no value"
            : card.kind === "extra_pack"
              ? "+1 PACK"
              : "Skull";
      return {
        ...state,
        board,
        potentialMicros: card.kind === "color" ? withPotential(board) : state.potentialMicros,
        revealed: [...state.revealed, card],
        hotIds: card.kind === "color" ? [card.id] : [],
        caption,
      };
    }
    case "merge": {
      const board = state.board.filter(
        (card) => card.id !== event.removed[0] && card.id !== event.removed[1],
      );
      board.push(event.created);
      return {
        ...state,
        board,
        potentialMicros: withPotential(board),
        hotIds: [event.created.id],
        caption: `${labelColor(event.created.color)} merges into L${event.created.level}`,
      };
    }
    case "pack_earned":
      return {
        ...state,
        pendingPacks: event.pendingPacks,
        caption: `+1 PACK · ${event.pendingPacks} waiting`,
      };
    case "skull":
      return {
        ...state,
        status: "skull",
        pendingPacks: 0,
        potentialMicros: 0n,
        wiped: true,
        hotIds: [event.cardId],
        caption: "Skull ends the round",
      };
    case "round_end": {
      if (event.outcome === "loss") {
        return {
          ...state,
          status: "skull",
          pendingPacks: 0,
          potentialMicros: 0n,
          finalMicros: 0n,
          wiped: true,
          caption: "SKULL · 0×",
        };
      }
      const won = event.multiplierMicros > 0n;
      return {
        ...state,
        status: won ? "won" : "no_win",
        potentialMicros: event.multiplierMicros,
        finalMicros: event.multiplierMicros,
        caption: won ? "Final win" : "No win",
      };
    }
    default: {
      const never: never = event;
      return never;
    }
  }
}

export function reduceEvents(events: readonly RoundEvent[]): ViewState {
  return events.reduce(applyEvent, initialPlayState());
}

export function labelColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}
