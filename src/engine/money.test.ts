import { describe, expect, it } from "vitest";
import { formatMicros, formatMultiplier, payoutMicros, sumLevels } from "./money";

describe("fixed-point money", () => {
  it("sums the demo ladder exactly", () => {
    expect(sumLevels([1, 1, 1])).toBe(300_000n);
    expect(formatMultiplier(300_000n)).toBe("0.30×");
    expect(formatMultiplier(10_000_000n)).toBe("10.00×");
    expect(formatMultiplier(0n)).toBe("0.00×");
  });

  it("rounds display half away from zero at the cent", () => {
    expect(formatMicros(10_000n)).toBe("0.01");
    expect(formatMicros(14_999n)).toBe("0.01");
    expect(formatMicros(15_000n)).toBe("0.02");
    expect(formatMicros(-15_000n)).toBe("-0.02");
  });

  it("pays stake × multiplier once, in credit micros", () => {
    expect(payoutMicros(10, 600_000n)).toBe(6_000_000n);
    expect(formatMicros(6_000_000n)).toBe("6.00");
    expect(payoutMicros(1, 0n)).toBe(0n);
    expect(() => payoutMicros(0, 100_000n)).toThrow(/Stake/);
    expect(() => payoutMicros(1.5, 100_000n)).toThrow(/Stake/);
  });
});
