import type { Step } from "./scene";

/**
 * v0.6 delays at 1×. v0.7 has no speed control. The only tempo is half of
 * these — the old 2× playback — applied by `PLAYBACK_SCALE`.
 */
export const LEGACY_1X_MS: Record<Step["kind"], number> = {
  pack_enter: 240,
  pack_open: 160,
  eject: 140,
  travel: 300,
  stack: 50,
  earn: 320,
  boost: 340,
  bust_strike: 640,
  wipe: 400,
  settle: 90,
};

/** Former 2×. Gameplay, flight, and the celebration all use this scale. */
export const PLAYBACK_SCALE = 0.5;

export function delayFor(kind: Step["kind"]): number {
  return Math.round(LEGACY_1X_MS[kind] * PLAYBACK_SCALE);
}
