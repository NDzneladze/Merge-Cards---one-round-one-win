import { describe, expect, it } from "vitest";
import { resolveRound } from "./engine/round";
import { green27Script } from "./fixtures";
import { appliedFor, readLaunch } from "./launch";
import { buildTimeline } from "./playback/scene";

describe("launch query", () => {
  it("stays idle without a fixture or seed", () => {
    expect(readLaunch("")).toBeNull();
    expect(readLaunch("?at=end")).toBeNull();
  });

  it("builds a 27-green medium board without touching the weight tables", () => {
    const script = green27Script();
    expect(script.filter((card) => card.kind === "green")).toHaveLength(27);
    const launch = readLaunch("?fixture=green27&at=end");
    expect(launch?.difficulty).toBe("medium");
    expect(launch?.at).toBe("end");
    const result = resolveRound({ seed: "fixture-green27", stake: 1, difficulty: "medium", script });
    const green = result.stacks.find((stack) => stack.color === "green");
    expect(green?.cards).toHaveLength(27);
    expect(result.stacks.find((stack) => stack.color === "blue")?.cards.length).toBeGreaterThan(0);
    expect(result.stacks.find((stack) => stack.color === "gold")?.cards.length).toBeGreaterThan(0);
    const steps = buildTimeline(result.events);
    expect(appliedFor(steps, "end")).toBe(steps.length);
    expect(appliedFor(steps, "earn:2")).toBeGreaterThan(appliedFor(steps, "earn:1"));
  });

  it("reads a QA slow-motion factor that never changes the deal", () => {
    expect(readLaunch("?fixture=showcase")?.slow).toBe(1);
    expect(readLaunch("?fixture=showcase&slow=4")?.slow).toBe(4);
    expect(readLaunch("?fixture=showcase&slow=99")?.slow).toBe(12);
    expect(readLaunch("?fixture=showcase&slow=0.2")?.slow).toBe(1);
    expect(readLaunch("?fixture=showcase&slow=fast")?.slow).toBe(1);
    expect(readLaunch("?fixture=showcase&slow=4")?.script).toBe(readLaunch("?fixture=showcase")?.script);
  });

  it("scripts purple onto the bigger physical pile, greys included, even when the other pile is worth more", () => {
    const launch = readLaunch("?fixture=purplecount&at=boost:1");
    const result = resolveRound({ seed: launch!.seed, stake: 1, difficulty: "medium", script: launch!.script });
    const green = result.stacks.find((stack) => stack.color === "green")!;
    const blue = result.stacks.find((stack) => stack.color === "blue")!;
    expect(green.cards.filter((card) => card.kind === "grey")).toHaveLength(2);
    expect(green.cards).toHaveLength(6);
    expect(blue.cards).toHaveLength(4);
    expect(result.events.find((event) => event.type === "boost")).toMatchObject({
      color: "green",
      stackTotalMicros: 600_000n,
    });
    expect(green.factor).toBe(2);
    expect(blue.factor).toBe(1);
    expect(result.multiplierMicros).toBe(12_800_000n);
  });

  it("scripts purple onto a grey-only pile at 0× and keeps the factor for the value card", () => {
    const launch = readLaunch("?fixture=purplegrey");
    const result = resolveRound({ seed: launch!.seed, stake: 1, difficulty: "easy", script: launch!.script });
    expect(result.events.find((event) => event.type === "boost")).toMatchObject({
      color: "blue",
      stackTotalMicros: 0n,
      stackFactor: 2,
    });
    expect(result.stacks.find((stack) => stack.color === "blue")).toMatchObject({ factor: 2, cards: expect.any(Array) });
    expect(result.multiplierMicros).toBe(3_000_000n);
    const steps = buildTimeline(result.events);
    expect(appliedFor(steps, "boost:1")).toBeLessThan(appliedFor(steps, "end"));
  });

  it("scripts the v0.10 showcase: +1 PACK, a grey in a pile, purple, then Stack Bonus on a grey 10th card", () => {
    const launch = readLaunch("?fixture=showcase");
    expect(launch?.difficulty).toBe("medium");
    const result = resolveRound({ seed: launch!.seed, stake: 1, difficulty: "medium", script: launch!.script });
    const green = result.stacks.find((stack) => stack.color === "green")!;
    expect(green.cards.filter((card) => card.kind === "grey")).toHaveLength(2);
    expect(green.factor).toBe(2);
    expect(green.stackBonusFactor).toBe(2);
    const bonus = result.events.find((event) => event.type === "stack_bonus");
    // 3.20× of greens → purple 6.40× → Stack Bonus 12.80×.
    expect(bonus).toMatchObject({ color: "green", count: 10, stackTotalMicros: 12_800_000n });
    expect(result.openedPacks).toBe(3);
    expect(result.multiplierMicros).toBe(18_200_000n);
  });

  it("accepts a natural seed for the same difficulty", () => {
    expect(readLaunch("?seed=demo-70&difficulty=hard&at=end")).toMatchObject({
      seed: "demo-70",
      difficulty: "hard",
      at: "end",
    });
  });
});
