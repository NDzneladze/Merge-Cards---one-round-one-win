import type { Step } from "./scene";

export type PlaybackSpeed = "1x" | "2x" | "instant";

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = ["1x", "2x", "instant"];

/**
 * Milliseconds at 1×. Speed only scales these delays; it never changes the
 * transcript. Eject is a short launch, travel is the flip-and-arc, and the
 * stack step is only the handoff onto the pile — the tuck animation keeps
 * running into the next launch so a pack reads as one opening, not a
 * slideshow. A safe one-pack round lands around 3.5 s. A bonus pack adds
 * another opening of the same length plus the earn beat.
 */
const BASE_MS: Record<Step["kind"], number> = {
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

export function speedFactor(speed: PlaybackSpeed): number {
  if (speed === "instant") return 0;
  return speed === "2x" ? 0.5 : 1;
}

export function delayFor(kind: Step["kind"], speed: PlaybackSpeed): number {
  return Math.round(BASE_MS[kind] * speedFactor(speed));
}
