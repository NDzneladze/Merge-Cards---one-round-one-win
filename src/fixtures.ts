import type { Difficulty, ScriptedDraw, StackColor } from "./engine/types";

/**
 * Deterministic boards for screenshots. They call the same resolver with a
 * script, so the weights are not involved and the math tables stay as they are.
 */

const extra: ScriptedDraw = { kind: "extra" };
const purple: ScriptedDraw = { kind: "purple" };
const grey: ScriptedDraw = { kind: "grey" };
const greyTo = (target: StackColor): ScriptedDraw => ({ kind: "grey", target });
const red: ScriptedDraw = { kind: "red" };
const g = (value = 0.13): ScriptedDraw => ({ kind: "green", value });
const b = (value = 1.5): ScriptedDraw => ({ kind: "blue", value });
const gold = (value = 8): ScriptedDraw => ({ kind: "gold", value });

/** Six packs: 5 extras, 27 greens at 0.13×, then blue and gold. */
export function green27Script(): ScriptedDraw[] {
  const greens = Array.from({ length: 27 }, () => g(0.13));
  const rest: ScriptedDraw[] = [b(1.25), b(2.65), gold(6.5), gold(12.5)];
  const slots: ScriptedDraw[] = [];
  let gi = 0;
  let ri = 0;
  for (let pack = 0; pack < 6; pack += 1) {
    for (let slot = 0; slot < 6; slot += 1) {
      if (slot === 0 && pack < 5) slots.push(extra);
      else if (gi < greens.length) slots.push(greens[gi++]!);
      else slots.push(rest[ri++]!);
    }
  }
  return slots;
}

export type FixtureId =
  | "green27"
  | "partial"
  | "waiting"
  | "bust"
  | "grey"
  | "fullstack"
  | "showcase"
  | "purplecount"
  | "purplegrey"
  | "stack20"
  | "stack20grey"
  | "easy"
  | "hard";

export type Fixture = {
  id: FixtureId;
  seed: string;
  difficulty: Difficulty;
  script: readonly ScriptedDraw[];
};

export const FIXTURES: Record<FixtureId, Fixture> = {
  green27: {
    id: "green27",
    seed: "fixture-green27",
    difficulty: "medium",
    script: green27Script(),
  },
  partial: {
    id: "partial",
    seed: "fixture-partial",
    difficulty: "medium",
    script: [g(0.13), b(2.65), gold(12.5), g(0.2), b(1.05), g(0.18)],
  },
  waiting: {
    id: "waiting",
    seed: "fixture-waiting",
    difficulty: "medium",
    script: [extra, extra, g(0.13), b(1.8), gold(8), g(0.25)],
  },
  bust: {
    id: "bust",
    seed: "fixture-bust",
    difficulty: "medium",
    script: [extra, g(0.4), b(1.5), extra, red],
  },
  grey: {
    id: "grey",
    seed: "fixture-grey",
    difficulty: "medium",
    script: [g(0.2), grey, b(1.4), g(0.13), gold(5), g(0.15)],
  },
  fullstack: {
    id: "fullstack",
    seed: "fixture-fullstack",
    difficulty: "medium",
    script: [extra, g(0.2), g(0.2), g(0.2), g(0.2), g(0.2), purple, g(0.2), g(0.2), g(0.2), g(0.2), g(0.2)],
  },
  /**
   * The v0.10 walk-through in three packs. Two +1 PACKs stack under the pack.
   * Greys join the green pile. Eight greens make 3.20×, purple doubles it to
   * 6.40×, and the 10th card (a grey) lands Stack Bonus ×2 for 12.80×.
   */
  showcase: {
    id: "showcase",
    seed: "fixture-showcase",
    difficulty: "medium",
    script: [
      extra, g(0.5), g(0.4), greyTo("green"), g(0.3), extra,
      g(0.5), b(1.6), g(0.4), g(0.3), b(1.2), g(0.4),
      g(0.4), purple, greyTo("green"), b(1.4), g(0.2), g(0.1),
    ],
  },
  /**
   * Green holds 3 prizes + 2 greys (5 cards, 0.30×). Blue holds 4 prizes (12.00×).
   * Purple follows the physical count and doubles green, then a later green is doubled too.
   */
  purplecount: {
    id: "purplecount",
    seed: "fixture-purplecount",
    difficulty: "medium",
    script: [g(0.1), g(0.1), g(0.1), greyTo("green"), greyTo("green"), extra, b(3), b(3), b(3), b(3), purple, g(0.1)],
  },
  /**
   * Blue holds only greys. Purple lands there at 0×. The blue card that arrives
   * afterwards is multiplied, so the factor is visible as 2.00×.
   */
  purplegrey: {
    id: "purplegrey",
    seed: "fixture-purplegrey",
    difficulty: "easy",
    script: [greyTo("blue"), greyTo("blue"), purple, b(1), g(0.5), g(0.5)],
  },
  /**
   * Twenty greens of 0.20×. Purple after four of them. The 10th card awards
   * Stack ×2 and the 20th upgrades it to Stack ×4 (32.00×, not ×8).
   */
  stack20: {
    id: "stack20",
    seed: "fixture-stack20",
    difficulty: "medium",
    script: [
      extra, g(0.2), g(0.2), g(0.2), g(0.2), extra,
      g(0.2), g(0.2), purple, g(0.2), g(0.2), g(0.2),
      g(0.2), g(0.2), g(0.2), g(0.2), extra, g(0.2),
      g(0.2), g(0.2), g(0.2), g(0.2), g(0.2), g(0.2),
    ],
  },
  /**
   * Grey is the 10th card and the 20th card. Eight 0.40× greens are 3.20×,
   * one Purple makes 6.40×, Stack ×2 makes 12.80×, and the 20th grey upgrades
   * that total to 25.60×. The grey itself pays nothing.
   */
  stack20grey: {
    id: "stack20grey",
    seed: "fixture-stack20grey",
    difficulty: "easy",
    script: [
      extra, g(0.4), g(0.4), g(0.4), g(0.4), extra,
      g(0.4), g(0.4), g(0.4), g(0.4), purple, greyTo("green"),
      greyTo("green"), greyTo("green"), greyTo("green"), greyTo("green"), extra, greyTo("green"),
      greyTo("green"), greyTo("green"), greyTo("green"), greyTo("green"), greyTo("green"), greyTo("green"),
    ],
  },
  easy: {
    id: "easy",
    seed: "fixture-easy",
    difficulty: "easy",
    script: [g(0.12), b(1.2), g(0.13), b(1.5), g(0.1), g(0.18)],
  },
  hard: {
    id: "hard",
    seed: "fixture-hard",
    difficulty: "hard",
    script: [b(1.4), gold(9), b(2.2), gold(14), b(1.1), gold(6)],
  },
};
