import type { Step } from "./scene";

export type PlaybackSpeed = "1x" | "2x" | "instant";

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = ["1x", "2x", "instant"];

/**
 * Milliseconds at 1×. Speed only scales these delays; it never changes the
 * transcript. A safe one-pack round runs in roughly 4.5 s; each bonus pack
 * adds about 4 s of card travel plus a short pack transition.
 */
const BASE_MS: Record<Step["kind"], number> = {
  pack_enter: 340,
  pack_open: 300,
  eject: 230,
  travel: 260,
  stack: 150,
  earn: 420,
  boost: 420,
  bust_strike: 760,
  wipe: 480,
  settle: 140,
};

export function speedFactor(speed: PlaybackSpeed): number {
  if (speed === "instant") return 0;
  return speed === "2x" ? 0.5 : 1;
}

export function delayFor(kind: Step["kind"], speed: PlaybackSpeed): number {
  return Math.round(BASE_MS[kind] * speedFactor(speed));
}
