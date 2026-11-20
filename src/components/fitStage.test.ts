import { describe, expect, it } from "vitest";
import { fitStage } from "./fitStage";

describe("fitStage", () => {
  it("fills most of a 1168-wide card table with readable piles", () => {
    const three = fitStage({ stageWidth: 852, actionHeight: 820, piles: 3, narrow: false, short: false });
    expect(three.card).toBeGreaterThanOrEqual(145);
    expect(three.card).toBeLessThanOrEqual(184);
    expect(three.occupancy).toBeGreaterThanOrEqual(0.65);
    expect(three.occupancy).toBeLessThanOrEqual(0.8);
    expect(three.legend).toBe(false);

    const two = fitStage({ stageWidth: 852, actionHeight: 820, piles: 2, narrow: false, short: false });
    expect(two.card).toBeGreaterThan(three.card);
    expect(two.occupancy).toBeGreaterThanOrEqual(0.65);
    expect(two.occupancy).toBeLessThanOrEqual(0.8);
  });

  it("keeps 720p cards readable and grows a legend only into an existing gutter", () => {
    const short = fitStage({ stageWidth: 964, actionHeight: 540, piles: 3, narrow: false, short: true });
    expect(short.card).toBeGreaterThanOrEqual(140);
    expect(short.card).toBeLessThanOrEqual(188);

    const wide = fitStage({ stageWidth: 1124, actionHeight: 760, piles: 3, narrow: false, short: false });
    expect(wide.legend).toBe(true);
    expect(wide.card).toBe(fitStage({ stageWidth: 852, actionHeight: 820, piles: 3, narrow: false, short: false }).card);
  });

  it("targets a phone card between 100 and 115", () => {
    const phone = fitStage({ stageWidth: 347, actionHeight: 460, piles: 3, narrow: true, short: false });
    expect(phone.card).toBeGreaterThanOrEqual(100);
    expect(phone.card).toBeLessThanOrEqual(115);
    expect(phone.legend).toBe(false);
  });
});
