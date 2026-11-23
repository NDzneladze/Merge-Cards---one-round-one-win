import { describe, expect, it } from "vitest";
import { QUEUE_LAYERS, contentHeight, fitStage, packHeightRatio } from "./fitStage";

describe("fitStage", () => {
  it("grows the piles until the play area's height stops them", () => {
    // 1440 × 900 with the rail on the left: about 1148 × 770 of play area.
    const desktop = fitStage({ stageWidth: 1148, actionHeight: 770, piles: 3, narrow: false, short: false });
    expect(desktop.card).toBeGreaterThanOrEqual(215);
    expect(desktop.card).toBeLessThanOrEqual(280);
    expect(contentHeight(desktop.card, packHeightRatio(false, false))).toBeLessThanOrEqual(770);
    // One more pixel of card would not fit: the table is height-bound, not capped small.
    expect(contentHeight(desktop.card + 1, packHeightRatio(false, false))).toBeGreaterThan(770);
    expect(desktop.occupancy).toBeGreaterThanOrEqual(0.64);
    expect(desktop.gap).toBe(Math.round(desktop.card * 0.24));

    // v0.9 stopped at 184 px here and left 46 % of the felt empty beside the piles.
    expect(desktop.card).toBeGreaterThan(184);
  });

  it("fills a narrower table by width and never overflows it", () => {
    const three = fitStage({ stageWidth: 852, actionHeight: 880, piles: 3, narrow: false, short: false });
    expect(three.cluster).toBeLessThanOrEqual(852 * 0.88 + 1);
    expect(three.occupancy).toBeGreaterThanOrEqual(0.82);
    expect(three.card).toBeGreaterThanOrEqual(200);

    const two = fitStage({ stageWidth: 852, actionHeight: 880, piles: 2, narrow: false, short: false });
    expect(two.card).toBeGreaterThan(three.card);
    expect(two.gap).toBeGreaterThan(three.gap);
    expect(two.cluster).toBeLessThanOrEqual(852);
  });

  it("keeps 720p cards readable", () => {
    const short = fitStage({ stageWidth: 988, actionHeight: 590, piles: 3, narrow: false, short: true });
    expect(short.card).toBeGreaterThanOrEqual(150);
    expect(contentHeight(short.card, packHeightRatio(false, true))).toBeLessThanOrEqual(590);
  });

  it("targets a phone card between 100 and 118", () => {
    const phone = fitStage({ stageWidth: 347, actionHeight: 480, piles: 3, narrow: true, short: false });
    expect(phone.card).toBeGreaterThanOrEqual(100);
    expect(phone.card).toBeLessThanOrEqual(118);
    expect(phone.cluster).toBeLessThanOrEqual(347);
  });

  it("draws a near-square pack and steps each waiting pack down and to the right", () => {
    const fit = fitStage({ stageWidth: 1148, actionHeight: 770, piles: 3, narrow: false, short: false });
    const aspect = fit.packW / fit.packH;
    // v0.9 was 1.17 wide. A booster is a touch taller than wide.
    expect(aspect).toBeGreaterThanOrEqual(0.9);
    expect(aspect).toBeLessThanOrEqual(1);
    expect(fit.packW).toBeLessThan(fit.card);
    expect(fit.queueDx).toBeGreaterThanOrEqual(20);
    expect(fit.queueDy).toBeGreaterThanOrEqual(8);
    // Every drawn layer stays on the table next to the active pack.
    expect(fit.packW + QUEUE_LAYERS * fit.queueDx).toBeLessThan(fit.cluster);
  });
});
