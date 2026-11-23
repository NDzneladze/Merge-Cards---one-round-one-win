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

  it("accepts a natural seed for the same difficulty", () => {
    expect(readLaunch("?seed=demo-70&difficulty=hard&at=end")).toMatchObject({
      seed: "demo-70",
      difficulty: "hard",
      at: "end",
    });
  });
});
