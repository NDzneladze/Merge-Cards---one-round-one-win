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
});

describe("scene", () => {
  it("folds the timeline to the engine settlement for wins, empty boards and busts", () => {
    const cases = [
      resolveRound({ seed: "play-a", stake: 10 }),
      resolveRound({ seed: "play-b", stake: 10, script: [g(0.5), au(5), purple, red] }),
      resolveRound({ seed: "demo-19", stake: 10 }),
      resolveRound({ seed: "demo-335", stake: 10 }),
      resolveRound({ seed: "demo-22", stake: 10 }),
    ];
    for (const result of cases) {
      const scene = reduceEvents(result.events);
      expect(scene.finalMicros).toBe(result.multiplierMicros);
      expect(scene.tier).toBe(result.tier);
      expect(scene.flyer).toBeNull();
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

  it("changes only timing when playback speed changes", () => {
    const result = resolveRound({ seed: "speed", stake: 9 });
    const again = resolveRound({ seed: "speed", stake: 9 });
    expect(reduceEvents(result.events)).toEqual(reduceEvents(again.events));
    expect(buildTimeline(again.events)).toEqual(buildTimeline(result.events));
    expect(delayFor("boost", "1x")).toBeGreaterThan(delayFor("boost", "2x"));
    expect(delayFor("eject", "2x")).toBeGreaterThan(0);
    expect(delayFor("bust_strike", "instant")).toBe(0);
  });
});
