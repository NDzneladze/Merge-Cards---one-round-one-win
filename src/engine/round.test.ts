import { describe, expect, it } from "vitest";
import { CAPPED_WEIGHT_DENOMINATOR, DEMO_CONFIG, DEMO_WEIGHTS } from "./config";
import { FEATURED_SEEDS } from "./featured";
import { drawToken, eligibleWeights, weightTotal } from "./draw";
import { sumLevels } from "./money";
import { createRng } from "./rng";
import { resolveRound } from "./round";
import type { Card, Color, ColorCard, RoundEvent, RoundResult, ScriptedDraw } from "./types";

const grey: ScriptedDraw = { kind: "grey" };
const extra: ScriptedDraw = { kind: "extra_pack" };
const skull: ScriptedDraw = { kind: "skull" };
const color = (name: Color): ScriptedDraw => ({ kind: "color", color: name });

function fill(step: ScriptedDraw, count: number): ScriptedDraw[] {
  return Array.from({ length: count }, () => step);
}

function pack(...steps: ScriptedDraw[]): ScriptedDraw[] {
  if (steps.length !== 6) throw new Error(`pack fixture must contain 6 cards, got ${steps.length}`);
  return steps;
}

function eventsOf(result: RoundResult, type: RoundEvent["type"]): RoundEvent[] {
  return result.events.filter((event) => event.type === type);
}

function transcript(result: RoundResult): string {
  return JSON.stringify(result, (_key, value: unknown) =>
    typeof value === "bigint" ? `${value}n` : value,
  );
}

function assertSingleSettlement(result: RoundResult): void {
  expect(result.stakeDebits).toBe(1);
  expect(eventsOf(result, "round_end")).toHaveLength(1);
  const end = result.events.at(-1);
  expect(end?.type).toBe("round_end");
  if (end?.type === "round_end") {
    expect(end.multiplierMicros).toBe(result.multiplierMicros);
    expect(end.outcome).toBe(result.outcome);
  }
  expect(result.payoutMicros).toBe(BigInt(result.stake) * result.multiplierMicros);
}

function assertChain(result: RoundResult, maxOpenedPacks = DEMO_CONFIG.maxOpenedPacks): void {
  expect(result.openedPacks).toBeGreaterThanOrEqual(1);
  expect(result.openedPacks).toBeLessThanOrEqual(maxOpenedPacks);

  let pending = 1;
  let opened = 0;
  let revealsInPack = 0;
  let skullSeen = false;
  let extras = 0;
  const board = new Map<string, ColorCard>();

  for (const event of result.events) {
    if (skullSeen && event.type !== "round_end") {
      throw new Error(`Event ${event.type} followed a Skull`);
    }
    if (event.type === "pack_open") {
      expect(revealsInPack === 0 || revealsInPack === 6).toBe(true);
      pending -= 1;
      opened += 1;
      revealsInPack = 0;
      expect(opened).toBe(event.packNo);
      expect(opened + pending).toBeLessThanOrEqual(maxOpenedPacks);
    } else if (event.type === "card_reveal") {
      revealsInPack += 1;
      expect(revealsInPack).toBeLessThanOrEqual(6);
      expect(event.position).toBe(revealsInPack - 1);
      if (event.card.kind === "extra_pack") {
        expect(opened + pending).toBeLessThan(maxOpenedPacks);
        pending += 1;
        extras += 1;
        expect(opened + pending).toBeLessThanOrEqual(maxOpenedPacks);
      }
      if (event.card.kind === "color") {
        board.set(event.card.id, event.card);
        expect(event.card.level).toBe(1);
      }
    } else if (event.type === "pack_earned") {
      expect(event.pendingPacks).toBe(pending);
    } else if (event.type === "merge") {
      const [leftId, rightId] = event.removed;
      const left = board.get(leftId);
      const right = board.get(rightId);
      expect(left).toBeTruthy();
      expect(right).toBeTruthy();
      expect(left?.color).toBe(right?.color);
      expect(left?.level).toBe(right?.level);
      expect(left && left.level < 6).toBe(true);
      expect(event.created.level).toBe((left?.level ?? 0) + 1);
      expect(event.created.color).toBe(left?.color);
      board.delete(leftId);
      board.delete(rightId);
      board.set(event.created.id, event.created);
    } else if (event.type === "skull") {
      skullSeen = true;
      pending = 0;
    } else if (event.type === "round_end") {
      if (event.outcome === "loss") {
        expect(result.multiplierMicros).toBe(0n);
        expect(result.survivingBoard).toEqual([]);
      } else {
        expect(sumLevels([...board.values()].map((card) => card.level))).toBe(event.multiplierMicros);
        expect(result.potentialLostMicros).toBe(0n);
      }
    }
  }

  expect(opened).toBe(result.openedPacks);
  if (!skullSeen) {
    expect(pending).toBe(0);
    expect(revealsInPack).toBe(6);
    expect(result.openedPacks).toBe(1 + extras);
    expect(result.outcome).toBe("resolved");
  } else {
    expect(result.outcome).toBe("loss");
    expect(revealsInPack).toBeGreaterThanOrEqual(1);
    expect(revealsInPack).toBeLessThanOrEqual(6);
  }
}

describe("draw weights", () => {
  it("uses the placeholder 100-weight pool and drops Extra Pack at the cap", () => {
    expect(weightTotal(eligibleWeights(true, DEMO_WEIGHTS))).toBe(100);
    expect(weightTotal(eligibleWeights(false, DEMO_WEIGHTS))).toBe(CAPPED_WEIGHT_DENOMINATOR);
    expect(CAPPED_WEIGHT_DENOMINATOR).toBe(89);
    expect(eligibleWeights(false, DEMO_WEIGHTS).map((entry) => entry.token)).not.toContain("extra_pack");
  });

  it("maps rolls onto a stable token order", () => {
    const rolls = [0, 16, 17, 67, 68, 85, 86, 96, 97, 99];
    const expected = ["red", "red", "blue", "gold", "grey", "grey", "extra_pack", "extra_pack", "skull", "skull"];
    rolls.forEach((roll, index) => {
      const rng = { nextUint32: () => 0, nextInt: () => roll };
      expect(drawToken(rng, true, DEMO_WEIGHTS)).toBe(expected[index]);
    });
    const capped = { nextUint32: () => 0, nextInt: () => 86 };
    expect(drawToken(capped, false, DEMO_WEIGHTS)).toBe("skull");
  });

  it("never draws Extra Pack when it is ineligible", () => {
    const rng = createRng("no-extra");
    for (let i = 0; i < 500; i += 1) {
      expect(drawToken(rng, false, DEMO_WEIGHTS)).not.toBe("extra_pack");
    }
  });
});

describe("resolveRound", () => {
  it("reproduces the full transcript from the same seed, config and stake", () => {
    const first = resolveRound({ seed: "alpha", stake: 25 });
    const second = resolveRound({ seed: "alpha", stake: 25 });
    expect(transcript(first)).toBe(transcript(second));
    expect(transcript(resolveRound({ seed: "beta", stake: 25 }))).not.toBe(transcript(first));
  });

  it("resolves four matching L1 cards dealt one at a time into one L3", () => {
    const result = resolveRound({
      seed: "four",
      stake: 10,
      script: [...fill(color("red"), 4), ...fill(grey, 2)],
    });
    expect(result.survivingBoard).toEqual([
      { kind: "color", id: "c0007", color: "red", level: 3 },
    ]);
    expect(result.multiplierMicros).toBe(600_000n);
    expect(eventsOf(result, "merge")).toHaveLength(3);
    assertSingleSettlement(result);
    assertChain(result);
  });

  it("keeps different colors in separate merge lines", () => {
    const result = resolveRound({
      seed: "mix",
      stake: 5,
      script: [color("red"), color("blue"), color("red"), color("blue"), grey, grey],
    });
    const board = [...result.survivingBoard].sort((a, b) => a.color.localeCompare(b.color));
    expect(board.map((card) => [card.color, card.level])).toEqual([
      ["blue", 2],
      ["red", 2],
    ]);
    expect(result.multiplierMicros).toBe(500_000n);
  });

  it("merges a later pack into the persistent board", () => {
    const result = resolveRound({
      seed: "persist",
      stake: 8,
      script: [
        ...pack(color("red"), grey, grey, grey, grey, extra),
        ...pack(color("red"), grey, grey, grey, grey, grey),
      ],
    });
    expect(result.openedPacks).toBe(2);
    expect(result.survivingBoard).toEqual([
      { kind: "color", id: "c0008", color: "red", level: 2 },
    ]);
    expect(result.multiplierMicros).toBe(250_000n);
    expect(result.stakeDebits).toBe(1);
    expect(result.payoutMicros).toBe(2_000_000n);
  });

  it("queues several extra packs from one pack without another debit", () => {
    const result = resolveRound({
      seed: "multi",
      stake: 4,
      script: [
        ...pack(extra, extra, grey, grey, grey, grey),
        ...pack(grey, grey, grey, grey, grey, grey),
        ...pack(grey, grey, grey, grey, grey, grey),
      ],
    });
    expect(result.openedPacks).toBe(3);
    expect(eventsOf(result, "pack_earned").map((event) => event.type === "pack_earned" && event.pendingPacks)).toEqual([
      1, 2,
    ]);
    expect(result.multiplierMicros).toBe(0n);
    expect(result.outcome).toBe("resolved");
    expect(result.stakeDebits).toBe(1);
    assertSingleSettlement(result);
  });

  it("cascades sixteen matching cards into one L5 across a chain", () => {
    const result = resolveRound({
      seed: "l5",
      stake: 2,
      script: [
        ...pack(extra, extra, color("gold"), color("gold"), color("gold"), color("gold")),
        ...fill(color("gold"), 6),
        ...fill(color("gold"), 6),
      ],
    });
    expect(result.openedPacks).toBe(3);
    expect(result.survivingBoard).toHaveLength(1);
    expect(result.survivingBoard[0]).toMatchObject({ color: "gold", level: 5 });
    expect(result.multiplierMicros).toBe(4_000_000n);
  });

  it("ends on the first Skull and does not open another pack", () => {
    const result = resolveRound({
      seed: "skull-first",
      stake: 10,
      script: [skull, color("red"), extra, color("red"), color("red"), color("red")],
    });
    expect(result.outcome).toBe("loss");
    expect(result.multiplierMicros).toBe(0n);
    expect(result.payoutMicros).toBe(0n);
    expect(result.openedPacks).toBe(1);
    expect(eventsOf(result, "card_reveal")).toHaveLength(1);
    expect(eventsOf(result, "pack_earned")).toHaveLength(0);
    expect(eventsOf(result, "merge")).toHaveLength(0);
    const reveal = result.events[1] as Extract<RoundEvent, { type: "card_reveal" }>;
    expect(reveal.card.kind).toBe("skull");
    assertSingleSettlement(result);
  });

  it("lets Skull cancel an Extra Pack revealed earlier in the same pack", () => {
    const result = resolveRound({
      seed: "extra-then-skull",
      stake: 10,
      script: [extra, skull, color("red"), color("red"), color("blue"), grey],
    });
    expect(result.openedPacks).toBe(1);
    expect(eventsOf(result, "pack_earned")).toHaveLength(1);
    expect(result.outcome).toBe("loss");
    expect(result.multiplierMicros).toBe(0n);
    expect(result.events.at(-1)).toMatchObject({ type: "round_end", outcome: "loss", multiplierMicros: 0n });
    expect(result.events.filter((event) => event.type === "pack_open")).toHaveLength(1);
  });

  it("wipes earlier potential when a later pack reveals Skull", () => {
    const built = resolveRound({
      seed: "value-then-stop",
      stake: 20,
      script: [
        ...pack(color("red"), color("red"), color("red"), color("red"), grey, extra),
        ...pack(skull, color("gold"), color("gold"), color("gold"), color("gold"), extra),
      ],
    });
    expect(built.openedPacks).toBe(2);
    expect(built.potentialLostMicros).toBe(600_000n);
    expect(built.multiplierMicros).toBe(0n);
    expect(built.survivingBoard).toEqual([]);
    expect(eventsOf(built, "card_reveal").filter((event) => event.type === "card_reveal" && event.packNo === 2)).toHaveLength(1);
  });

  it("pays 0× on a safe grey board without calling it a Skull loss", () => {
    const result = resolveRound({
      seed: "greys",
      stake: 15,
      script: fill(grey, 6),
    });
    expect(result.outcome).toBe("resolved");
    expect(result.multiplierMicros).toBe(0n);
    expect(result.payoutMicros).toBe(0n);
    expect(eventsOf(result, "skull")).toHaveLength(0);
    expect(result.survivingBoard).toEqual([]);
  });

  it("stops at six opened packs and never shows an unfulfillable Extra Pack", () => {
    const scripted = [
      ...pack(extra, grey, grey, grey, grey, grey),
      ...pack(extra, grey, grey, grey, grey, grey),
      ...pack(extra, grey, grey, grey, grey, grey),
      ...pack(extra, grey, grey, grey, grey, grey),
      ...pack(extra, grey, grey, grey, grey, grey),
      ...pack(grey, grey, grey, grey, grey, grey),
    ];
    const result = resolveRound({ seed: "cap", stake: 10, script: scripted });
    expect(result.openedPacks).toBe(6);
    expect(eventsOf(result, "pack_earned")).toHaveLength(5);
    assertChain(result);

    const flooded = resolveRound({
      seed: "flood",
      stake: 10,
      script: fill(extra, 48),
    });
    expect(flooded.openedPacks).toBeLessThanOrEqual(6);
    assertChain(flooded);
    const revealedExtras = flooded.events.filter(
      (event): event is Extract<RoundEvent, { type: "card_reveal" }> =>
        event.type === "card_reveal" && event.card.kind === "extra_pack",
    );
    expect(revealedExtras.length).toBeLessThanOrEqual(5);

    const blocked = resolveRound({
      seed: "blocked",
      stake: 3,
      config: { ...DEMO_CONFIG, maxOpenedPacks: 1 },
      script: [extra, grey, grey, grey, grey, grey],
    });
    expect(blocked.openedPacks).toBe(1);
    expect(eventsOf(blocked, "pack_earned")).toHaveLength(0);
    const firstCard = blocked.events.find((event) => event.type === "card_reveal") as
      | Extract<RoundEvent, { type: "card_reveal" }>
      | undefined;
    expect(firstCard?.card.kind).not.toBe("extra_pack");
  });

  it("locks the featured example seeds", () => {
    const merge = resolveRound({ seed: FEATURED_SEEDS[0].seed, stake: 10 });
    expect(merge.outcome).toBe("resolved");
    expect(merge.openedPacks).toBe(1);
    expect(merge.multiplierMicros).toBe(600_000n);
    expect(eventsOf(merge, "merge").length).toBeGreaterThan(0);

    const chain = resolveRound({ seed: FEATURED_SEEDS[1].seed, stake: 10 });
    expect(chain.outcome).toBe("resolved");
    expect(chain.openedPacks).toBe(6);
    expect(chain.multiplierMicros).toBe(3_850_000n);

    const skullRound = resolveRound({ seed: FEATURED_SEEDS[2].seed, stake: 10 });
    expect(skullRound.outcome).toBe("loss");
    expect(skullRound.openedPacks).toBe(2);
    expect(skullRound.multiplierMicros).toBe(0n);
    expect(skullRound.potentialLostMicros).toBe(650_000n);
  });

  it("has no negative pack token and debits the stake once on every sampled seed", () => {
    expect(Object.keys(DEMO_WEIGHTS).sort()).toEqual([
      "blue",
      "extra_pack",
      "gold",
      "green",
      "grey",
      "red",
      "skull",
    ]);
    expect(Object.keys(DEMO_WEIGHTS).some((key) => key.includes("minus") || key.startsWith("-"))).toBe(false);
    for (let i = 0; i < 80; i += 1) {
      const result = resolveRound({ seed: `sample-${i}`, stake: 7 });
      assertSingleSettlement(result);
      assertChain(result);
      const cardKinds = result.events.flatMap((event) =>
        event.type === "card_reveal" ? [event.card.kind] : [],
      );
      expect(cardKinds.every((kind) => kind !== ("minus_pack" as Card["kind"]))).toBe(true);
    }
  });
});
