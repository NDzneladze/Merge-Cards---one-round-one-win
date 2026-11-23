import type { Step } from "./playback/scene";
import type { Difficulty, ScriptedDraw } from "./engine/types";
import { FIXTURES, type FixtureId } from "./fixtures";

export type Launch = {
  seed: string;
  difficulty: Difficulty;
  script?: readonly ScriptedDraw[];
  /** "end", a step kind, "kind:nth", or a numeric step count. */
  at: string | null;
};

const DIFFICULTIES = new Set<Difficulty>(["easy", "medium", "hard"]);

function isFixture(value: string): value is FixtureId {
  return value in FIXTURES;
}

/**
 * Screenshot and QA entry. Absent on a normal visit, so the idle table is unchanged.
 * `?fixture=green27&at=end` or `?seed=demo-70&difficulty=medium&at=end`.
 */
export function readLaunch(search: string): Launch | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fixtureId = params.get("fixture");
  const seed = params.get("seed");
  const at = params.get("at");
  const rawDifficulty = params.get("difficulty");
  const difficulty: Difficulty = rawDifficulty && DIFFICULTIES.has(rawDifficulty as Difficulty) ? (rawDifficulty as Difficulty) : "medium";
  if (!fixtureId && !seed) return null;
  if (fixtureId && isFixture(fixtureId)) {
    const fixture = FIXTURES[fixtureId];
    return {
      seed: fixture.seed,
      difficulty: fixture.difficulty,
      script: fixture.script,
      at,
    };
  }
  if (!seed) return null;
  return { seed, difficulty, at };
}

/** How many timeline steps to apply before the first paint of a launched round. */
export function appliedFor(steps: readonly Step[], at: string | null): number {
  if (!at || at === "start") return 0;
  if (at === "end") return steps.length;
  if (/^\d+$/.test(at)) return Math.min(steps.length, Number(at));
  const nth = /^([a-z_]+):(\d+)$/.exec(at);
  if (nth) {
    const kind = nth[1];
    const wanted = Number(nth[2]);
    let seen = 0;
    for (let index = 0; index < steps.length; index += 1) {
      if (steps[index]?.kind === kind) {
        seen += 1;
        if (seen === wanted) return index + 1;
      }
    }
    return steps.length;
  }
  const index = steps.findIndex((step) => step.kind === at);
  return index === -1 ? steps.length : index + 1;
}
