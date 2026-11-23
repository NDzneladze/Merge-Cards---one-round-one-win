import type { RoundEvent } from "../engine/types";

export type PlaybackSpeed = "1x" | "2x" | "instant";

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = ["1x", "2x", "instant"];

/** Milliseconds at 1×. Speed only scales these delays; it never changes the transcript. */
const BASE_MS: Record<RoundEvent["type"], number> = {
  pack_open: 380,
  card_reveal: 170,
  merge: 320,
  pack_earned: 240,
  skull: 640,
  round_end: 40,
};

export function delayFor(type: RoundEvent["type"], speed: PlaybackSpeed): number {
  if (speed === "instant") return 0;
  const base = BASE_MS[type];
  return speed === "2x" ? Math.round(base / 2) : base;
}
