import { describe, expect, it } from "vitest";
import { FIXTURES } from "../fixtures";
import { resolveRound } from "../engine/round";
import type { ScriptedDraw } from "../engine/types";
import { applyStep, buildTimeline, initialScene, liveCardIds, reduceEvents, reduceSteps } from "./scene";
import { delayFor, holdBefore, LEGACY_1X_MS, PLAYBACK_SCALE, roundDuration } from "./timing";

const g = (value: number): ScriptedDraw => ({ kind: "green", value });
const b = (value: number): ScriptedDraw => ({ kind: "blue", value });
const au = (value: number): ScriptedDraw => ({ kind: "gold", value });
const purple: ScriptedDraw = { kind: "purple" };
const red: ScriptedDraw = { kind: "red" };
const extra: ScriptedDraw = { kind: "extra" };
const greyTo = (target: "green" | "blue" | "gold"): ScriptedDraw => ({ kind: "grey", target });

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

  it("sends a +1 PACK under the pack, then brings in the waiting pack after the last card", () => {
    const result = resolveRound({ seed: "tq", stake: 1, script: [g(0.3), extra, g(0.1), g(0.1), g(0.1), g(0.1), g(0.2), g(0.2), g(0.2), g(0.2), g(0.2), g(0.2)] });
    const steps = buildTimeline(result.events);
    const kinds = steps.map((step) => step.kind);
    expect(kinds.slice(0, 9)).toEqual(["pack_enter", "pack_open", "eject", "travel", "stack", "eject", "tuck", "earn", "eject"]);
    expect(steps[6]).toMatchObject({ kind: "tuck", card: { kind: "extra" } });
    // The tuck is the one slow flight: long enough to see the card go under the pack.
    expect(delayFor("tuck")).toBeGreaterThanOrEqual(2.5 * delayFor("travel"));
    const tucking = reduceSteps(steps.slice(0, 7));
    expect(tucking.flyer).toMatchObject({ phase: "travel", target: "boosters" });
    expect(tucking.pendingPacks).toBe(0);
    expect(tucking.caption).toMatch(/under the pack/);
    expect(steps[7]).toMatchObject({ kind: "earn", pending: 1, totalPacks: 2 });
    expect(kinds.filter((kind) => kind === "pack_enter")).toHaveLength(2);
    const second = steps.findIndex((step, index) => step.kind === "pack_enter" && index > 0);
    expect(steps[second]).toMatchObject({ kind: "pack_enter", packNo: 2, pending: 0 });
    expect(kinds[second - 1]).toBe("stack");
    expect(kinds.at(-1)).toBe("settle");
  });
});

describe("scene", () => {
  it("starts with only the difficulty's piles", () => {
    expect(Object.keys(initialScene("easy", ["green", "blue"]).stacks)).toEqual(["green", "blue"]);
    expect(Object.keys(initialScene("hard", ["blue", "gold"]).stacks)).toEqual(["blue", "gold"]);
    expect(initialScene().difficulty).toBe("medium");
    const hard = resolveRound({ seed: "h", stake: 1, difficulty: "hard", script: [b(1), au(5), b(1), b(1), b(1), b(1)] });
    const scene = reduceEvents(hard.events, initialScene("hard", hard.colors));
    expect(scene.stacks.blue?.cards).toHaveLength(5);
    expect(scene.stacks.gold?.cards).toHaveLength(1);
    expect(scene.stacks.green).toBeUndefined();
  });

  it("folds the timeline to the engine settlement for wins, empty boards and busts", () => {
    const cases = [
      resolveRound({ seed: "play-a", stake: 10 }),
      resolveRound({ seed: "play-b", stake: 10, script: [g(0.5), au(5), purple, red] }),
      resolveRound({ seed: "demo-1725", stake: 10, difficulty: "medium" }),
      resolveRound({ seed: "demo-105", stake: 10, difficulty: "medium" }),
      resolveRound({ seed: "demo-6", stake: 10, difficulty: "easy" }),
      resolveRound({ seed: "demo-10", stake: 10, difficulty: "hard" }),
      resolveRound({ seed: "demo-441", stake: 10, difficulty: "medium" }),
      resolveRound({ seed: "even", stake: 1, script: [g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.5)] }),
    ];
    for (const result of cases) {
      const scene = reduceEvents(result.events, initialScene(result.difficulty, result.colors));
      expect(scene.difficulty).toBe(result.difficulty);
      expect(scene.colors).toEqual(result.colors);
      expect(Object.keys(scene.stacks).sort()).toEqual([...result.colors].sort());
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
        expect(scene.redCard).toBeNull();
        expect(scene.flyer).toBeNull();
        expect(scene.caption).toMatch(/bust 0\.00×/);
        expect(liveCardIds(scene)).toEqual([]);
      } else {
        const expected = result.tier === "return" ? "returned" : result.tier === "even" ? "even" : result.multiplierMicros > 0n ? "won" : "no_win";
        expect(scene.status).toBe(expected);
        if (result.tier === "return") expect(scene.caption).toMatch(/return .* below the stake/);
        if (result.tier === "even") expect(scene.caption).toMatch(/break-even/);
        if (result.tier === "win") expect(scene.caption).toMatch(/win/);
        if (result.multiplierMicros === 0n) expect(scene.caption).toMatch(/no win/);
        expect(liveCardIds(scene)).toEqual(result.stacks.flatMap((stack) => stack.cards.map((card) => card.id)).sort());
        for (const stack of result.stacks) {
          expect(scene.stacks[stack.color].factor).toBe(stack.factor);
          expect(scene.stacks[stack.color].stackBonusFactor).toBe(stack.stackBonusFactor);
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
    expect(wiped.redCard?.kind).toBe("red");
    expect(wiped.bustPhase).toBe("wipe");
    expect(liveCardIds(wiped)).toEqual([]);

    const settled = reduceSteps(steps);
    expect(settled.finalMicros).toBe(0n);
    expect(settled.bustPhase).toBe("dead");
    expect(settled.redCard).toBeNull();
    expect(settled.flyer).toBeNull();
    expect(settled.pack).toBe("dead");
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
    expect(firstEarn.caption).toMatch(/a bonus pack tucks in under the pack/);
    const secondEarn = reduceSteps(steps.slice(0, earnIndexes[1]! + 1));
    expect(secondEarn.pendingPacks).toBe(2);
    expect(secondEarn.packsTotal).toBe(3);
    expect(secondEarn.caption).toMatch(/2 bonus packs stacked under the pack/);

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
    expect(strike.caption).toMatch(/2 waiting packs cancelled/);
    const settled = reduceSteps(steps);
    expect(settled.status).toBe("bust");
    expect(settled.packNo).toBe(1);
    expect(settled.cancelledPacks).toBe(2);
  });

  it("plays at the former 2× tempo and has no speed argument that could change the deal", () => {
    const result = resolveRound({ seed: "speed", stake: 9 });
    const again = resolveRound({ seed: "speed", stake: 9 });
    expect(reduceEvents(result.events)).toEqual(reduceEvents(again.events));
    expect(buildTimeline(again.events)).toEqual(buildTimeline(result.events));
    expect(PLAYBACK_SCALE).toBe(0.5);
    expect(delayFor.length).toBe(1);
    for (const kind of Object.keys(LEGACY_1X_MS) as (keyof typeof LEGACY_1X_MS)[]) {
      expect(delayFor(kind)).toBe(Math.round(LEGACY_1X_MS[kind] * PLAYBACK_SCALE));
      expect(delayFor(kind)).toBeGreaterThan(0);
      expect(delayFor(kind)).toBeLessThan(LEGACY_1X_MS[kind]);
    }
  });

  it("keeps a one-pack round at half the old 1× window, which is the former 2× pace", () => {
    const result = resolveRound({ seed: "pace", stake: 1, script: [g(0.3), b(1), g(0.3), g(0.3), b(1), g(0.3)] });
    const steps = buildTimeline(result.events);
    const ms = steps.reduce((sum, step) => sum + delayFor(step.kind), 0);
    expect(roundDuration(steps)).toBe(ms - delayFor("settle"));
    const legacy = steps.reduce((sum, step) => sum + LEGACY_1X_MS[step.kind], 0);
    expect(legacy).toBeGreaterThanOrEqual(3_000);
    expect(legacy).toBeLessThanOrEqual(5_000);
    expect(ms).toBeGreaterThanOrEqual(1_500);
    expect(ms).toBeLessThanOrEqual(2_500);
    expect(ms).toBe(Math.round(legacy * PLAYBACK_SCALE));
    // The handoff onto a pile is shorter than the flight, so the next launch overlaps the tuck.
    expect(delayFor("stack")).toBeLessThan(delayFor("eject"));
    expect(delayFor("eject") + delayFor("travel")).toBeLessThanOrEqual(250);
  });

  it("reveals a grey card, flies it to the pile the engine chose, and keeps it there at 0×", () => {
    const result = resolveRound({ seed: "grey-play", stake: 1, script: [g(0.4), b(1), greyTo("blue"), g(0.1), g(0.1), g(0.1)] });
    const steps = buildTimeline(result.events);
    const travelIndex = steps.findIndex((step) => step.kind === "travel" && step.card.kind === "grey");
    expect(steps[travelIndex - 1]).toMatchObject({ kind: "eject", card: { kind: "grey" } });
    expect(steps[travelIndex + 1]).toMatchObject({ kind: "grey", color: "blue", count: 2, stackTotalMicros: 1_000_000n });

    const travelling = reduceSteps(steps.slice(0, travelIndex + 1));
    expect(travelling.flyer).toMatchObject({ phase: "travel", target: "blue" });
    expect(travelling.flyer?.card.kind).toBe("grey");
    expect(travelling.caption).toMatch(/Empty 0× → blue stack/);
    expect(travelling.stacks.blue.cards).toHaveLength(1);

    const landed = reduceSteps(steps.slice(0, travelIndex + 2));
    expect(landed.flyer).toBeNull();
    expect(landed.burst).toMatchObject({ tone: "grey", text: "0×", color: "blue" });
    expect(landed.stacks.blue.cards.map((card) => card.kind)).toEqual(["value", "grey"]);
    expect(landed.stacks.blue.cards[1]).toMatchObject({ id: "c0003", valueMicros: 0n, state: "landing" });
    expect(landed.stacks.blue.hot).toBe(true);
    // 0×: neither the pile total nor the board total moves.
    expect(landed.stacks.blue.totalMicros).toBe(1_000_000n);
    expect(landed.totalMicros).toBe(travelling.totalMicros);
    expect(landed.caption).toMatch(/joins the blue stack · 2\/10/);
    expect(landed.stacks.green.cards).toHaveLength(1);

    const settled = reduceSteps(steps);
    expect(settled.flyer).toBeNull();
    expect(liveCardIds(settled)).toHaveLength(6);
    expect(settled.stacks.blue.cards).toHaveLength(2);
    expect(settled.status).toBe("won");
  });

  it("lands Stack Bonus on a grey 10th card and compounds it with purple", () => {
    const result = resolveRound({
      seed: "sb-play",
      stake: 1,
      script: [extra, g(0.5), g(0.4), greyTo("green"), g(0.3), g(0.5), g(0.4), g(0.3), g(0.4), g(0.4), purple, greyTo("green")],
    });
    const steps = buildTimeline(result.events);
    const bonusIndex = steps.findIndex((step) => step.kind === "stack_bonus");
    expect(steps[bonusIndex - 1]).toMatchObject({ kind: "grey", color: "green", count: 10 });
    const before = reduceSteps(steps.slice(0, bonusIndex));
    // 3.20× of greens, purple ×2 = 6.40×. The grey has landed and the bonus has not.
    expect(before.stacks.green.cards).toHaveLength(10);
    expect(before.stacks.green.cards.filter((card) => card.kind === "grey")).toHaveLength(2);
    expect(before.stacks.green).toMatchObject({ factor: 2, stackBonusFactor: 1, bonusHot: false, totalMicros: 6_400_000n });
    const bonus = reduceSteps(steps.slice(0, bonusIndex + 1));
    expect(bonus.stacks.green).toMatchObject({ stackBonusFactor: 2, bonusHot: true, preBonusMicros: 6_400_000n, totalMicros: 12_800_000n });
    expect(bonus.totalMicros).toBe(12_800_000n);
    expect(bonus.burst).toMatchObject({ tone: "stack", text: "STACK BONUS ×2", color: "green" });
    expect(bonus.caption).toMatch(/Green stack bonus ×2 · 6\.40× → 12\.80×/);
    // The ribbon belongs to that one step. The bonus itself stays.
    const after = reduceSteps(steps.slice(0, bonusIndex + 2));
    expect(after.stacks.green).toMatchObject({ stackBonusFactor: 2, bonusHot: false, totalMicros: 12_800_000n });
    expect(reduceSteps(steps).finalMicros).toBe(12_800_000n);
  });

  it("shows each step for its own delay, so a flight is never cut by its landing", () => {
    const result = resolveRound({ seed: "hold", stake: 1, script: [g(0.3), extra, g(0.1), g(0.1), g(0.1), g(0.1), ...Array.from({ length: 6 }, () => g(0.2))] });
    const steps = buildTimeline(result.events);
    expect(holdBefore(steps, 0)).toBe(0);
    for (let applied = 1; applied < steps.length; applied += 1) {
      expect(holdBefore(steps, applied)).toBe(delayFor(steps[applied - 1]!.kind));
    }
    const travel = steps.findIndex((step) => step.kind === "travel");
    // The step after a flight is the landing. It waits for the whole flight.
    expect(steps[travel + 1]?.kind).toBe("stack");
    expect(holdBefore(steps, travel + 1)).toBe(delayFor("travel"));
    const tuck = steps.findIndex((step) => step.kind === "tuck");
    expect(steps[tuck + 1]?.kind).toBe("earn");
    expect(holdBefore(steps, tuck + 1)).toBe(delayFor("tuck"));
    expect(roundDuration(steps)).toBe(steps.slice(0, -1).reduce((sum, step) => sum + delayFor(step.kind), 0));
  });

  it("unlocks Stack Bonus once on the 10th card and keeps it for the next card", () => {
    const result = resolveRound({
      seed: "fs-play",
      stake: 1,
      script: [extra, g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.1), g(0.2)],
    });
    const steps = buildTimeline(result.events);
    const sealIndex = steps.findIndex((step) => step.kind === "stack_bonus");
    expect(sealIndex).toBeGreaterThan(0);
    expect(steps.filter((step) => step.kind === "stack_bonus")).toHaveLength(1);
    const before = reduceSteps(steps.slice(0, sealIndex));
    expect(before.stacks.green.cards).toHaveLength(10);
    expect(before.stacks.green.stackBonusFactor).toBe(1);
    // The 10th card has landed at its own value. The doubling is the next step.
    expect(before.stacks.green.totalMicros).toBe(1_000_000n);
    const sealed = reduceSteps(steps.slice(0, sealIndex + 1));
    expect(sealed.stacks.green.stackBonusFactor).toBe(2);
    expect(sealed.stacks.green.stackBonusKey).toBe(sealed.burst?.id.replace(/-stack$/, ""));
    expect(sealed.burst).toMatchObject({ tone: "stack", text: "STACK BONUS ×2", color: "green" });
    expect(sealed.stacks.green.preBonusMicros).toBe(1_000_000n);
    expect(sealed.stacks.green.totalMicros).toBe(2_000_000n);
    expect(delayFor("stack_bonus")).toBeGreaterThanOrEqual(600);
    const settled = reduceSteps(steps);
    expect(settled.stacks.green.stackBonusFactor).toBe(2);
    expect(settled.stacks.green.cards).toHaveLength(11);
    expect(settled.finalMicros).toBe(2_400_000n);
    expect(settled.flyer).toBeNull();
  });

  it("reads a grey 20th card as an empty card, then upgrades Stack ×2 to Super Stack ×4", () => {
    const result = resolveRound({
      seed: FIXTURES.stack20grey.seed,
      stake: 1,
      difficulty: "easy",
      script: FIXTURES.stack20grey.script,
    });
    const steps = buildTimeline(result.events);
    const awards = steps.flatMap((step, index) => (step.kind === "stack_bonus" ? [index] : []));
    expect(awards).toHaveLength(2);
    const tenth = reduceSteps(steps.slice(0, awards[0]!));
    expect(tenth.caption).toMatch(/Empty 0× → 10\/10 · Stack ×2/);
    expect(tenth.stacks.green.totalMicros).toBe(6_400_000n);
    const timesTwo = reduceSteps(steps.slice(0, awards[0]! + 1));
    expect(timesTwo.burst).toMatchObject({ text: "STACK BONUS ×2", tone: "stack" });
    expect(timesTwo.stacks.green).toMatchObject({ stackBonusFactor: 2, bonusFromFactor: 1, totalMicros: 12_800_000n });
    const twentieth = reduceSteps(steps.slice(0, awards[1]!));
    expect(twentieth.caption).toMatch(/Empty 0× → 20\/20 · Stack ×4/);
    expect(twentieth.burst?.text).toBe("0×");
    expect(twentieth.stacks.green.stackBonusFactor).toBe(2);
    const timesFour = reduceSteps(steps.slice(0, awards[1]! + 1));
    expect(timesFour.burst).toMatchObject({ text: "SUPER STACK ×4", tone: "stack", color: "green" });
    expect(timesFour.caption).toMatch(/super stack ×4 · 12\.80× → 25\.60×/);
    expect(timesFour.stacks.green).toMatchObject({ stackBonusFactor: 4, bonusFromFactor: 2, preBonusMicros: 12_800_000n, totalMicros: 25_600_000n });
    expect(reduceSteps(steps).finalMicros).toBe(25_600_000n);
  });
});
