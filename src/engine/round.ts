import type { DemoConfig } from "./config";
import { DEMO_CONFIG } from "./config";
import { drawToken } from "./draw";
import { resolveMerges } from "./merge";
import { payoutMicros, sumLevels } from "./money";
import { createRng } from "./rng";
import type { Card, ColorCard, RoundEvent, RoundResult, ScriptedDraw, Token } from "./types";

export type ResolveInput = {
  seed: string;
  stake: number;
  config?: DemoConfig;
  /**
   * Test/demo override. Production play leaves this empty and draws from the
   * seeded RNG. An Extra Pack step that cannot be honored is discarded and
   * replaced by a legal seeded draw — a dead +1 is never emitted.
   */
  script?: readonly ScriptedDraw[];
};

function scriptToken(step: ScriptedDraw): Token {
  if (step.kind === "color") return step.color;
  return step.kind;
}

function cardFromToken(token: Token, id: string): Card {
  if (token === "grey") return { kind: "grey", id };
  if (token === "extra_pack") return { kind: "extra_pack", id };
  if (token === "skull") return { kind: "skull", id };
  return { kind: "color", id, color: token, level: 1 };
}

/**
 * Pure round resolver. No timers, DOM, or Math.random.
 * One call debits the stake once and emits exactly one terminal `round_end`.
 */
export function resolveRound(input: ResolveInput): RoundResult {
  const config = input.config ?? DEMO_CONFIG;
  if (config.cardsPerPack !== 6) {
    throw new Error("v0.1 packs contain exactly six cards");
  }
  if (config.maxOpenedPacks < 1) {
    throw new Error("maxOpenedPacks must be at least 1");
  }

  const rng = createRng(input.seed);
  const script = [...(input.script ?? [])];
  let serial = 1;
  const nextId = (): string => {
    const id = `c${String(serial).padStart(4, "0")}`;
    serial += 1;
    return id;
  };

  const events: RoundEvent[] = [];
  let pending = 1;
  let opened = 0;
  let board: ColorCard[] = [];
  let outcome: RoundResult["outcome"] = "resolved";
  let multiplierMicros = 0n;
  let potentialLostMicros = 0n;
  let ended = false;

  const drawCard = (): Card => {
    const allowExtra = opened + pending < config.maxOpenedPacks;
    let token: Token;
    const scripted = script.shift();
    if (scripted && !(scripted.kind === "extra_pack" && !allowExtra)) {
      token = scriptToken(scripted);
    } else {
      token = drawToken(rng, allowExtra, config.weights);
    }
    if (token === "extra_pack" && !allowExtra) {
      throw new Error("Refusing to reveal an Extra Pack that cannot be honored");
    }
    return cardFromToken(token, nextId());
  };

  while (pending > 0 && !ended) {
    pending -= 1;
    opened += 1;
    if (opened > config.maxOpenedPacks || opened + pending > config.maxOpenedPacks) {
      throw new Error("Pack cap exceeded");
    }
    events.push({ type: "pack_open", packNo: opened });

    for (let position = 0; position < config.cardsPerPack; position += 1) {
      const card = drawCard();
      events.push({ type: "card_reveal", card, packNo: opened, position });

      if (card.kind === "skull") {
        potentialLostMicros = sumLevels(board.map((entry) => entry.level));
        pending = 0;
        board = [];
        outcome = "loss";
        multiplierMicros = 0n;
        events.push({ type: "skull", cardId: card.id });
        events.push({ type: "round_end", multiplierMicros: 0n, outcome: "loss" });
        ended = true;
        break;
      }

      if (card.kind === "extra_pack") {
        pending += 1;
        if (opened + pending > config.maxOpenedPacks) {
          throw new Error("Extra Pack pushed the round past the cap");
        }
        events.push({ type: "pack_earned", pendingPacks: pending });
        continue;
      }

      if (card.kind === "grey") continue;

      board = [...board, card];
      const merged = resolveMerges(board, config.maxLevel, nextId);
      board = merged.board;
      for (const step of merged.merges) {
        events.push({ type: "merge", removed: step.removed, created: step.created });
      }
    }
  }

  if (!ended) {
    multiplierMicros = sumLevels(board.map((entry) => entry.level));
    events.push({
      type: "round_end",
      multiplierMicros,
      outcome: "resolved",
    });
  }

  return {
    seed: input.seed,
    stake: input.stake,
    events,
    outcome,
    multiplierMicros,
    payoutMicros: payoutMicros(input.stake, multiplierMicros),
    openedPacks: opened,
    survivingBoard: board,
    potentialLostMicros,
    stakeDebits: 1,
  };
}
