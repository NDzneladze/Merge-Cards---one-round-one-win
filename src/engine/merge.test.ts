import { describe, expect, it } from "vitest";
import { findOldestPair, resolveMerges } from "./merge";
import type { ColorCard } from "./types";

function color(id: string, colorName: ColorCard["color"], level: number): ColorCard {
  return { kind: "color", id, color: colorName, level };
}

function idsFrom(start: number) {
  let n = start;
  return () => {
    const id = `c${String(n).padStart(4, "0")}`;
    n += 1;
    return id;
  };
}

describe("resolveMerges", () => {
  it("combines two same-color same-level cards into one upgraded card", () => {
    const { board, merges } = resolveMerges(
      [color("c0001", "red", 1), color("c0002", "red", 1)],
      6,
      idsFrom(3),
    );
    expect(merges).toHaveLength(1);
    expect(merges[0]?.removed).toEqual(["c0001", "c0002"]);
    expect(board).toEqual([color("c0003", "red", 2)]);
  });

  it("turns four L1 cards into one L3", () => {
    const { board, merges } = resolveMerges(
      [
        color("c0001", "gold", 1),
        color("c0002", "gold", 1),
        color("c0003", "gold", 1),
        color("c0004", "gold", 1),
      ],
      6,
      idsFrom(5),
    );
    expect(merges.map((step) => step.created.level)).toEqual([2, 2, 3]);
    expect(board).toEqual([color("c0007", "gold", 3)]);
  });

  it("does not merge different colors or different levels", () => {
    const board = [
      color("c0001", "red", 1),
      color("c0002", "blue", 1),
      color("c0003", "red", 2),
    ];
    const resolved = resolveMerges(board, 6, idsFrom(4));
    expect(resolved.merges).toEqual([]);
    expect(resolved.board).toEqual(board);
  });

  it("pairs the oldest ids first and leaves the newest leftover", () => {
    const { board, merges } = resolveMerges(
      [color("c0003", "green", 1), color("c0001", "green", 1), color("c0002", "green", 1)],
      6,
      idsFrom(4),
    );
    expect(merges[0]?.removed).toEqual(["c0001", "c0002"]);
    expect(board.map((card) => card.id).sort()).toEqual(["c0003", "c0004"]);
    expect(board.find((card) => card.id === "c0003")?.level).toBe(1);
    expect(board.find((card) => card.id === "c0004")?.level).toBe(2);
  });

  it("merges L5 into L6 and refuses to merge the maximum level", () => {
    const upgraded = resolveMerges(
      [color("c0001", "blue", 5), color("c0002", "blue", 5)],
      6,
      idsFrom(3),
    );
    expect(upgraded.board).toEqual([color("c0003", "blue", 6)]);

    const capped = resolveMerges(
      [color("c0001", "blue", 6), color("c0002", "blue", 6)],
      6,
      idsFrom(3),
    );
    expect(capped.merges).toEqual([]);
    expect(capped.board).toHaveLength(2);
    expect(findOldestPair(capped.board, 6)).toBeNull();
  });
});
