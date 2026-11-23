import type { Step } from "./scene";

/**
 * Delays at the old 1×. There is no speed control. The only tempo is half of
 * these, applied by `PLAYBACK_SCALE`. Card flights keep the v0.7 pace. The
 * +1 PACK tuck and the Stack Bonus are held longer so they can be read.
 */
export const LEGACY_1X_MS: Record<Step["kind"], number> = {
  /** A waiting pack needs a beat to slide up into the active spot. */
  pack_enter: 400,
  pack_open: 160,
  eject: 140,
  travel: 300,
  stack: 50,
  /** +1 PACK only. Reveal, swing round the pack, slide under it. */
  tuck: 900,
  /** The new pack settles into the stack under the active one. */
  earn: 440,
  boost: 340,
  bust_strike: 640,
  wipe: 400,
  settle: 90,
  /** A grey lands in its pile like a value card, with a moment to read the 0×. */
  grey: 120,
  /** Stack ×2 at 10 cards, and the ×4 upgrade at 20. Held long enough to read the ribbon. */
  stack_bonus: 1500,
};

/** Former 2×. Gameplay, flight, and the celebration all use this scale. */
export const PLAYBACK_SCALE = 0.5;

export function delayFor(kind: Step["kind"]): number {
  return Math.round(LEGACY_1X_MS[kind] * PLAYBACK_SCALE);
}

/**
 * How long the scene waits before step `applied` is applied: the delay of
 * the step that is on screen now. A step's delay is its own time on screen,
 * so a 150 ms flight is shown for 150 ms and the landing never cuts it.
 */
export function holdBefore(steps: readonly Step[], applied: number): number {
  const showing = applied > 0 ? steps[applied - 1] : undefined;
  return showing ? delayFor(showing.kind) : 0;
}

/** Fixed-tempo length of a whole round, from the first step to the settled result. */
export function roundDuration(steps: readonly Step[]): number {
  return steps.slice(0, -1).reduce((sum, step) => sum + delayFor(step.kind), 0);
}
