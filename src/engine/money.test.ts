import { describe, expect, it } from "vitest";
import { boardTotal, formatMicros, formatMultiplier, payoutMicros, stackTotal, valueToMicros } from "./money";
import type { StackState } from "./types";

const stack = (color: StackState["color"], values: bigint[], factor = 1, stackBonusFactor = 1): StackState => ({
  color,
  factor,
  stackBonusFactor,
  cards: values.map((valueMicros, index) => ({ kind: "value", id: `${color}${index}`, color, valueMicros })),
});

describe("fixed-point money", () => {
  it("totals stacks exactly with boosts applied per stack", () => {
    const green = stack("green", [310_000n, 150_000n], 2);
    const blue = stack("blue", [1_050_000n]);
    expect(stackTotal(green)).toBe(920_000n);
    expect(boardTotal([green, blue, stack("gold", [])])).toBe(1_970_000n);
    expect(formatMultiplier(1_970_000n)).toBe("1.97×");
    expect(formatMultiplier(0n)).toBe("0.00×");
    const stacked = stack("green", [310_000n, 150_000n], 2, 2);
    // (0.31 + 0.15) × purple 2 × stack 2
    expect(stackTotal(stacked)).toBe(1_840_000n);
    const upgraded = stack("green", [310_000n, 150_000n], 2, 4);
    // The ×4 tier replaces ×2. It is not ×2 × ×4.
    expect(stackTotal(upgraded)).toBe(3_680_000n);
    expect(stackTotal(upgraded)).not.toBe(stackTotal(stacked) * 4n);
  });

  it("counts a grey card in the pile as 0×", () => {
    const green = stack("green", [310_000n, 150_000n], 2, 2);
    const withGrey: StackState = { ...green, cards: [...green.cards, { kind: "grey", id: "x1" }, { kind: "grey", id: "x2" }] };
    expect(withGrey.cards).toHaveLength(4);
    expect(stackTotal(withGrey)).toBe(stackTotal(green));
    expect(stackTotal({ color: "blue", factor: 4, stackBonusFactor: 4, cards: [{ kind: "grey", id: "x3" }] })).toBe(0n);
  });

  it("rounds display half away from zero at the cent", () => {
    expect(formatMicros(10_000n)).toBe("0.01");
    expect(formatMicros(14_999n)).toBe("0.01");
    expect(formatMicros(15_000n)).toBe("0.02");
    expect(formatMicros(-15_000n)).toBe("-0.02");
  });

  it("converts plain values to cent-aligned micros", () => {
    expect(valueToMicros(0.31)).toBe(310_000n);
    expect(valueToMicros(15)).toBe(15_000_000n);
    expect(() => valueToMicros(-1)).toThrow();
  });

  it("pays stake × multiplier once, in credit micros", () => {
    expect(payoutMicros(10, 600_000n)).toBe(6_000_000n);
    expect(formatMicros(6_000_000n)).toBe("6.00");
    expect(payoutMicros(1, 0n)).toBe(0n);
    expect(() => payoutMicros(0, 100_000n)).toThrow(/Stake/);
    expect(() => payoutMicros(1.5, 100_000n)).toThrow(/Stake/);
  });
});
