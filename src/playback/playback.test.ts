import { describe, expect, it } from "vitest";
import { resolveRound } from "../engine/round";
import type { ScriptedDraw } from "../engine/types";
import { reduceEvents } from "./reduce";
import { delayFor } from "./timing";

const red: ScriptedDraw = { kind: "color", color: "red" };
const extra: ScriptedDraw = { kind: "extra_pack" };
const skull: ScriptedDraw = { kind: "skull" };
const grey: ScriptedDraw = { kind: "grey" };

describe("playback", () => {
  it("folds the event log to the engine settlement for wins, empty boards and skulls", () => {
    const cases = [
      resolveRound({ seed: "play-a", stake: 10 }),
      resolveRound({
        seed: "play-b",
        stake: 10,
        script: [red, red, red, red, grey, extra, skull],
      }),
      resolveRound({ seed: "play-c", stake: 10, script: [grey, grey, grey, grey, grey, grey] }),
    ];
    for (const result of cases) {
      const view = reduceEvents(result.events);
      expect(view.finalMicros).toBe(result.multiplierMicros);
      if (result.outcome === "loss") {
        expect(view.status).toBe("skull");
        expect(view.potentialMicros).toBe(0n);
        expect(view.wiped).toBe(true);
        expect(view.pendingPacks).toBe(0);
      } else if (result.multiplierMicros === 0n) {
        expect(view.status).toBe("no_win");
        expect(view.board).toEqual([]);
      } else {
        expect(view.status).toBe("won");
        expect(view.board.map((card) => card.id).sort()).toEqual(
          result.survivingBoard.map((card) => card.id).sort(),
        );
      }
    }
  });

  it("changes only timing when playback speed changes", () => {
    const result = resolveRound({ seed: "speed", stake: 9, script: [red, red, grey, grey, grey, grey] });
    const atOne = reduceEvents(result.events);
    const atTwo = reduceEvents(result.events);
    const atInstant = reduceEvents(result.events);
    expect(atOne).toEqual(atTwo);
    expect(atTwo).toEqual(atInstant);
    expect(delayFor("merge", "1x")).toBeGreaterThan(delayFor("merge", "2x"));
    expect(delayFor("card_reveal", "2x")).toBeGreaterThan(0);
    expect(delayFor("skull", "instant")).toBe(0);
    expect(delayFor("pack_open", "instant")).toBe(0);
    const again = resolveRound({ seed: "speed", stake: 9, script: [red, red, grey, grey, grey, grey] });
    expect(again.payoutMicros).toBe(result.payoutMicros);
    expect(again.events).toEqual(result.events);
  });
});
