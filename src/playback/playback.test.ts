import { describe, expect, it } from "vitest";
import { resolveRound } from "../engine/round";
import type { ScriptedDraw } from "../engine/types";
import { applyStep, buildTimeline, initialScene, liveCardIds, reduceEvents, reduceSteps } from "./scene";
import { delayFor } from "./timing";

const g = (value: number): ScriptedDraw => ({ kind: "green", value });
const b = (value: number): ScriptedDraw => ({ kind: "blue", value });
const au = (value: number): ScriptedDraw => ({ kind: "gold", value });
const purple: ScriptedDraw = { kind: "purple" };
const red: ScriptedDraw = { kind: "red" };
const extra: ScriptedDraw = { kind: "extra" };

describe("timeline", () => {
  it("expands each engine event into presentation steps in order", () => {
    const result = resolveRound({ seed: "tl", stake: 1, script: [g(0.3), purple, b(1.5), red, g(0.1), g(0.1)] });
    const kinds = buildTimeline(result.events).map((step) => step.kind);
    expect(kinds).toEqual([
      "pack_enter",
      "pack_open",
      "eject",
      "travel",
      "stack",
      "eject",
      "travel",
      "boost",
      "eject",
      "travel",
      "stack",
      "eject",
      "travel",
      "bust_strike",
      "wipe",
      "settle",
    ]);
  });

  it("sends the purple card to the stack the engine chose", () => {
    const result = resolveRound({ seed: "pt", stake: 1, script: [g(0.3), b(2), b(1), purple, g(0.1), g(0.1)] });
    const travel = buildTimeline(result.events).filter((step) => step.kind === "travel");
    expect(travel[3]).toMatchObject({ kind: "travel", target: "blue" });
    expect(travel[3]?.kind === "travel" && travel[3].card.kind).toBe("purple");
  });

  it("sends a +1 PACK to the queue, then brings in the next pack after the last card", () => {
    const result = resolveRound({ seed: "tq", stake: 1, script: [g(0.3), extra, g(0.1), g(0.1), g(0.1), g(0.1), g(0.2), g(0.2), g(0.2), g(0.2), g(0.2), g(0.2)] });
    const steps = buildTimeline(result.events);
    const kinds = steps.map((step) => step.kind);
    expect(kinds.slice(0, 9)).toEqual(["pack_enter", "pack_open", "eject", "travel", "stack", "eject", "travel", "earn", "eject"]);
    expect(steps[6]).toMatchObject({ kind: "travel", target: "queue" });
    expect(steps[7]).toMatchObject({ kind: "earn", pending: 1, totalPacks: 2 });
    expect(kinds.filter((kind) => kind === "pack_enter")).toHaveLength(2);
    const second = steps.findIndex((step, index) => step.kind === "pack_enter" && index > 0);
    expect(steps[second]).toMatchObject({ kind: "pack_enter", packNo: 2, pending: 0 });
    expect(kinds[second - 1]).toBe("stack");
    expect(kinds.at(-1)).toBe("settle");
  });
});

describe("scene", () => {
  it("folds the timeline to the engine settlement for wins, empty boards and busts", () => {
    const cases = [
      resolveRound({ seed: "play-a", stake: 10 }),
      resolveRound({ seed: "play-b", stake: 10, script: [g(0.5), au(5), purple, red] }),
      resolveRound({ seed: "demo-283", stake: 10 }),
      resolveRound({ seed: "demo-144", stake: 10 }),
      resolveRound({ seed: "demo-547", stake: 10 }),
      resolveRound({ seed: "demo-46", stake: 10 }),
    ];
    for (const result of cases) {
      const scene = reduceEvents(result.events);
      expect(scene.finalMicros).toBe(result.multiplierMicros);
      expect(scene.tier).toBe(result.tier);
      expect(scene.flyer).toBeNull();
      expect(scene.packNo).toBe(result.openedPacks);
      expect(scene.pendingPacks).toBe(0);
      expect(scene.cancelledPacks).toBe(result.cancelledPacks);
      if (result.outcome === "bust") {
        expect(scene.status).toBe("bust");
        expect(scene.totalMicros).toBe(0n);
        expect(scene.bustPhase).toBe("dead");
        expect(scene.redCard?.kind).toBe("red");
        expect(liveCardIds(scene)).toEqual([]);
      } else {
        expect(scene.status).toBe(result.multiplierMicros > 0n ? "won" : "no_win");
        expect(liveCardIds(scene)).toEqual(result.stacks.flatMap((stack) => stack.cards.map((card) => card.id)).sort());
        for (const stack of result.stacks) {
          expect(scene.stacks[stack.color].factor).toBe(stack.factor);
        }
      }
    }
  });

  it("shows a card ejecting, travelling, and landing on its stack", () => {
    const result = resolveRound({ seed: "lane", stake: 1, script: [g(0.31), b(1.5), g(0.2), g(0.1), g(0.1), g(0.1)] });
    const steps = buildTimeline(result.events);
    const at = (index: number) => steps.slice(0, index + 1).reduce(applyStep, initialScene());

    expect(at(0).pack).toBe("arriving");
    expect(at(1).pack).toBe("open");

    const eject = at(2);
    expect(eject.flyer).toMatchObject({ phase: "eject", target: null });
    expect(eject.cardsLeftInPack).toBe(5);
    expect(eject.stacks.green.cards).toHaveLength(0);

    const travel = at(3);
    expect(travel.flyer).toMatchObject({ phase: "travel", target: "green" });

    const landed = at(4);
    expect(landed.flyer).toBeNull();
    expect(landed.stacks.green.cards).toHaveLength(1);
    expect(landed.stacks.green.cards[0]).toMatchObject({ valueMicros: 310_000n, state: "landing" });
    expect(landed.stacks.green.hot).toBe(true);
    expect(landed.totalMicros).toBe(310_000n);
    expect(landed.burst).toMatchObject({ tone: "value", text: "+0.31×" });

    const next = at(5);
    expect(next.stacks.green.cards[0]?.state).toBe("idle");
    expect(next.stacks.green.hot).toBe(false);
    expect(next.flyer?.card.kind).toBe("value");
  });

  it("lands the purple card on the chosen stack and shows the boost", () => {
    const result = resolveRound({ seed: "boost", stake: 1, script: [g(0.5), g(0.25), b(2), purple, g(0.1), g(0.1)] });
    const steps = buildTimeline(result.events);
    const boostIndex = steps.findIndex((step) => step.kind === "boost");
    const travelling = reduceSteps(steps.slice(0, boostIndex));
    expect(travelling.flyer).toMatchObject({ phase: "travel", target: "green" });
    expect(travelling.flyer?.card.kind).toBe("purple");

    const boosted = reduceSteps(steps.slice(0, boostIndex + 1));
    expect(boosted.flyer).toBeNull();
    expect(boosted.stacks.green.factor).toBe(2);
    expect(boosted.stacks.green.boostKey).toBe(boosted.burst?.id);
    expect(boosted.stacks.green.totalMicros).toBe(1_500_000n);
    expect(boosted.totalMicros).toBe(3_500_000n);
    expect(boosted.burst).toMatchObject({ tone: "boost", text: "×2 Green" });
    expect(boosted.stacks.blue.factor).toBe(1);
  });

  it("lets the red card strike, wipe the stacks, and leave a dead board", () => {
    const result = resolveRound({ seed: "wipe", stake: 1, script: [g(0.5), au(5), b(1), red] });
    const steps = buildTimeline(result.events);
    const strikeIndex = steps.findIndex((step) => step.kind === "bust_strike");
    const travelling = reduceSteps(steps.slice(0, strikeIndex));
    expect(travelling.flyer).toMatchObject({ phase: "travel", target: "center" });

    const strike = reduceSteps(steps.slice(0, strikeIndex + 1));
    expect(strike.status).toBe("bust");
    expect(strike.pack).toBe("dead");
    expect(strike.redCard?.kind).toBe("red");
    expect(strike.lostMicros).toBe(6_500_000n);
    expect(strike.stacks.green.cards[0]?.state).toBe("idle");

    const wiped = reduceSteps(steps.slice(0, strikeIndex + 2));
    expect(wiped.stacks.green.cards.every((card) => card.state === "dying")).toBe(true);
    expect(wiped.stacks.gold.cards.every((card) => card.state === "dying")).toBe(true);
    expect(wiped.totalMicros).toBe(0n);
    expect(liveCardIds(wiped)).toEqual([]);

    const settled = reduceSteps(steps);
    expect(settled.finalMicros).toBe(0n);
    expect(settled.bustPhase).toBe("dead");
  });

  it("carries the stacks and a boost into the bonus pack and counts the queue", () => {
    const result = resolveRound({
      seed: "carry",
      stake: 1,
      script: [b(2), purple, extra, extra, g(0.5), g(0.5), b(1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), ...Array.from({ length: 6 }, () => g(0.2))],
    });
    const steps = buildTimeline(result.events);
    const earnIndexes = steps.map((step, index) => (step.kind === "earn" ? index : -1)).filter((index) => index >= 0);
    const firstEarn = reduceSteps(steps.slice(0, earnIndexes[0]! + 1));
    expect(firstEarn.pendingPacks).toBe(1);
    expect(firstEarn.packsTotal).toBe(2);
    expect(firstEarn.earnKey).toBe(firstEarn.burst?.id);
    expect(firstEarn.burst).toMatchObject({ tone: "extra", text: "+1 PACK" });
    expect(firstEarn.caption).toMatch(/one more pack queued/);
    const secondEarn = reduceSteps(steps.slice(0, earnIndexes[1]! + 1));
    expect(secondEarn.pendingPacks).toBe(2);
    expect(secondEarn.packsTotal).toBe(3);

    const secondEnter = steps.findIndex((step) => step.kind === "pack_enter" && step.packNo === 2);
    const entering = reduceSteps(steps.slice(0, secondEnter + 1));
    expect(entering.pack).toBe("arriving");
    expect(entering.packNo).toBe(2);
    expect(entering.pendingPacks).toBe(1);
    expect(entering.packsTotal).toBe(3);
    expect(entering.stacks.blue.cards).toHaveLength(1);
    expect(entering.stacks.blue.factor).toBe(2);
    expect(entering.stacks.green.cards).toHaveLength(2);
    expect(entering.totalMicros).toBe(5_000_000n);

    const landedBlue = reduceSteps(steps.slice(0, steps.findIndex((step, index) => index > secondEnter && step.kind === "stack") + 1));
    expect(landedBlue.stacks.blue.cards).toHaveLength(2);
    expect(landedBlue.stacks.blue.totalMicros).toBe(6_000_000n);
    expect(landedBlue.stacks.blue.factor).toBe(2);

    const settled = reduceSteps(steps);
    expect(settled.packNo).toBe(3);
    expect(settled.pendingPacks).toBe(0);
    expect(settled.status).toBe("won");
    expect(settled.finalMicros).toBe(result.multiplierMicros);
    expect(liveCardIds(settled)).toHaveLength(15);
  });

  it("cancels the queued packs when red strikes", () => {
    const result = resolveRound({ seed: "cancel", stake: 1, script: [extra, g(0.5), extra, red] });
    const steps = buildTimeline(result.events);
    const strike = reduceSteps(steps.slice(0, steps.findIndex((step) => step.kind === "bust_strike") + 1));
    expect(strike.pendingPacks).toBe(0);
    expect(strike.cancelledPacks).toBe(2);
    expect(strike.caption).toMatch(/2 queued packs cancelled/);
    const settled = reduceSteps(steps);
    expect(settled.status).toBe("bust");
    expect(settled.packNo).toBe(1);
    expect(settled.cancelledPacks).toBe(2);
  });

  it("changes only timing when playback speed changes", () => {
    const result = resolveRound({ seed: "speed", stake: 9 });
    const again = resolveRound({ seed: "speed", stake: 9 });
    expect(reduceEvents(result.events)).toEqual(reduceEvents(again.events));
    expect(buildTimeline(again.events)).toEqual(buildTimeline(result.events));
    expect(delayFor("boost", "1x")).toBeGreaterThan(delayFor("boost", "2x"));
    expect(delayFor("eject", "2x")).toBeGreaterThan(0);
    expect(delayFor("bust_strike", "instant")).toBe(0);
    expect(delayFor("earn", "instant")).toBe(0);
  });

  it("keeps a safe one-pack round around four to five seconds at 1×", () => {
    const result = resolveRound({ seed: "pace", stake: 1, script: [g(0.3), b(1), g(0.3), g(0.3), b(1), g(0.3)] });
    const ms = buildTimeline(result.events).reduce((sum, step) => sum + delayFor(step.kind, "1x"), 0);
    expect(ms).toBeGreaterThanOrEqual(3_000);
    expect(ms).toBeLessThanOrEqual(5_500);
  });
});
