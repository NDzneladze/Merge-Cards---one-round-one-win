import { describe, expect, it } from "vitest";
import { resolveRound } from "../engine/round";
import type { ScriptedDraw } from "../engine/types";
import { applyStep, buildTimeline, initialScene, reduceEvents, reduceSteps, survivingIds } from "./scene";
import { delayFor } from "./timing";

const red: ScriptedDraw = { kind: "color", color: "red" };
const blue: ScriptedDraw = { kind: "color", color: "blue" };
const extra: ScriptedDraw = { kind: "extra_pack" };
const skull: ScriptedDraw = { kind: "skull" };
const grey: ScriptedDraw = { kind: "grey" };

describe("timeline", () => {
  it("expands each engine event into presentation steps in order", () => {
    const result = resolveRound({ seed: "tl", stake: 1, script: [red, red, grey, extra, skull, grey] });
    const kinds = buildTimeline(result.events).map((step) => step.kind);
    expect(kinds).toEqual([
      "pack_enter",
      "pack_open",
      "eject",
      "travel",
      "land",
      "eject",
      "travel",
      "land",
      "merge_collapse",
      "merge_pop",
      "eject",
      "travel",
      "land",
      "eject",
      "travel",
      "land",
      "pack_earned",
      "eject",
      "skull_strike",
      "wipe",
      "settle",
    ]);
  });

  it("never emits a step after the skull settles", () => {
    const result = resolveRound({ seed: "tl-skull", stake: 1, script: [extra, skull] });
    const kinds = buildTimeline(result.events).map((step) => step.kind);
    expect(kinds.at(-1)).toBe("settle");
    expect(kinds.filter((kind) => kind === "pack_enter")).toHaveLength(1);
  });
});

describe("scene", () => {
  it("folds the timeline to the engine settlement for wins, empty boards and skulls", () => {
    const cases = [
      resolveRound({ seed: "play-a", stake: 10 }),
      resolveRound({ seed: "play-b", stake: 10, script: [red, red, red, red, grey, extra, skull] }),
      resolveRound({ seed: "play-c", stake: 10, script: [grey, grey, grey, grey, grey, grey] }),
      resolveRound({ seed: "demo-7", stake: 10 }),
    ];
    for (const result of cases) {
      const scene = reduceEvents(result.events);
      expect(scene.finalMicros).toBe(result.multiplierMicros);
      expect(scene.flyer).toBeNull();
      expect(scene.openedPacks).toBe(result.openedPacks);
      if (result.outcome === "loss") {
        expect(scene.status).toBe("skull");
        expect(scene.potentialMicros).toBe(0n);
        expect(scene.skullPhase).toBe("dead");
        expect(scene.pendingPacks).toBe(0);
        expect(survivingIds(scene)).toEqual([]);
      } else if (result.multiplierMicros === 0n) {
        expect(scene.status).toBe("no_win");
        expect(survivingIds(scene)).toEqual([]);
      } else {
        expect(scene.status).toBe("won");
        expect(survivingIds(scene)).toEqual(result.survivingBoard.map((card) => card.id).sort());
        expect(scene.pendingPacks).toBe(0);
      }
    }
  });

  it("shows a card leaving the pack, landing in its lane, then merging", () => {
    const result = resolveRound({ seed: "lane", stake: 1, script: [red, blue, red, grey, grey, grey] });
    const steps = buildTimeline(result.events);
    let scene = initialScene();
    const at = (index: number) => {
      scene = steps.slice(0, index + 1).reduce(applyStep, initialScene());
      return scene;
    };

    at(0);
    expect(scene.pack).toBe("arriving");
    expect(scene.pendingPacks).toBe(0);
    at(1);
    expect(scene.pack).toBe("open");

    at(2);
    expect(scene.flyer).toMatchObject({ phase: "eject", target: "lane", lane: "red" });
    expect(scene.cardsLeftInPack).toBe(5);
    expect(scene.lanes.red).toHaveLength(0);

    at(3);
    expect(scene.flyer).toMatchObject({ phase: "land", target: "lane", lane: "red" });
    expect(scene.lanes.red).toHaveLength(0);

    at(4);
    expect(scene.flyer).toBeNull();
    expect(scene.lanes.red).toHaveLength(1);
    expect(scene.lanes.red[0]?.state).toBe("landing");
    expect(scene.potentialMicros).toBe(100_000n);

    at(5);
    expect(scene.lanes.red[0]?.state).toBe("idle");
    expect(scene.flyer).toMatchObject({ phase: "eject", lane: "blue" });

    at(10);
    expect(scene.lanes.red).toHaveLength(2);
    at(11);
    expect(scene.lanes.red.map((card) => card.state)).toEqual(["collapsing", "collapsing"]);
    at(12);
    expect(scene.lanes.red).toHaveLength(1);
    expect(scene.lanes.red[0]).toMatchObject({ level: 2, state: "born" });
    expect(scene.burst?.tone).toBe("merge");
    expect(scene.potentialMicros).toBe(350_000n);
  });

  it("flags the extra pack moment and brings the next pack in without a new bet", () => {
    const result = resolveRound({
      seed: "chain",
      stake: 1,
      script: [extra, grey, grey, grey, grey, grey, grey, grey, grey, grey, grey, grey],
    });
    const steps = buildTimeline(result.events);
    const earnedIndex = steps.findIndex((step) => step.kind === "pack_earned");
    const afterEarned = reduceSteps(steps.slice(0, earnedIndex + 1));
    expect(afterEarned.pendingPacks).toBe(1);
    expect(afterEarned.burst).toMatchObject({ tone: "extra", text: "+1 PACK" });
    const landed = reduceSteps(steps.slice(0, earnedIndex));
    expect(landed.flyer).toBeNull();
    const travel = reduceSteps(steps.slice(0, earnedIndex - 1));
    expect(travel.flyer).toMatchObject({ phase: "land", target: "queue" });
    const eject = reduceSteps(steps.slice(0, earnedIndex - 2));
    expect(eject.flyer).toMatchObject({ phase: "eject", target: "queue" });

    const secondEnter = steps.findIndex((step) => step.kind === "pack_enter" && step.packNo === 2);
    const scene = reduceSteps(steps.slice(0, secondEnter + 1));
    expect(scene.packNo).toBe(2);
    expect(scene.pendingPacks).toBe(0);
    expect(scene.cardsLeftInPack).toBe(6);
  });

  it("lets the skull strike, wipe the lanes, and leave a dead board", () => {
    const result = resolveRound({ seed: "wipe", stake: 1, script: [red, red, extra, blue, skull] });
    const steps = buildTimeline(result.events);
    const strikeIndex = steps.findIndex((step) => step.kind === "skull_strike");
    const strike = reduceSteps(steps.slice(0, strikeIndex + 1));
    expect(strike.status).toBe("skull");
    expect(strike.pendingPacks).toBe(0);
    expect(strike.pack).toBe("dead");
    expect(strike.lanes.red[0]?.state).toBe("idle");
    expect(strike.lanes.blue[0]?.state).toBe("idle");

    const wiped = reduceSteps(steps.slice(0, strikeIndex + 2));
    expect(wiped.lanes.red.every((card) => card.state === "dying")).toBe(true);
    expect(wiped.lanes.blue.every((card) => card.state === "dying")).toBe(true);
    expect(wiped.potentialMicros).toBe(0n);
    expect(survivingIds(wiped)).toEqual([]);

    const settled = reduceSteps(steps);
    expect(settled.finalMicros).toBe(0n);
    expect(settled.skullPhase).toBe("dead");
  });

  it("changes only timing when playback speed changes", () => {
    const result = resolveRound({ seed: "speed", stake: 9, script: [red, red, grey, grey, grey, grey] });
    const atOne = reduceEvents(result.events);
    const atInstant = reduceEvents(result.events);
    expect(atOne).toEqual(atInstant);
    expect(delayFor("merge_pop", "1x")).toBeGreaterThan(delayFor("merge_pop", "2x"));
    expect(delayFor("eject", "2x")).toBeGreaterThan(0);
    expect(delayFor("skull_strike", "instant")).toBe(0);
    const again = resolveRound({ seed: "speed", stake: 9, script: [red, red, grey, grey, grey, grey] });
    expect(again.payoutMicros).toBe(result.payoutMicros);
    expect(buildTimeline(again.events)).toEqual(buildTimeline(result.events));
  });
});
