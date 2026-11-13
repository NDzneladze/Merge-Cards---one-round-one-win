import type { Step } from "./scene";

export type PlaybackSpeed = "1x" | "2x" | "instant";

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = ["1x", "2x", "instant"];

/** Milliseconds at 1×. Speed only scales these delays; it never changes the transcript. */
const BASE_MS: Record<Step["kind"], number> = {
  pack_enter: 520,
  pack_open: 420,
  eject: 340,
  travel: 400,
  land: 240,
  merge_collapse: 260,
  merge_pop: 380,
  pack_earned: 620,
  skull_strike: 820,
  wipe: 620,
  settle: 160,
};

export function speedFactor(speed: PlaybackSpeed): number {
  if (speed === "instant") return 0;
  return speed === "2x" ? 0.5 : 1;
}

export function delayFor(kind: Step["kind"], speed: PlaybackSpeed): number {
  return Math.round(BASE_MS[kind] * speedFactor(speed));
}
