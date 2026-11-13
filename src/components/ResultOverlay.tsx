import { useEffect, useState } from "react";
import type { RoundResult, WinTier } from "../engine/types";
import { formatMicros, formatMultiplier } from "../engine/money";
import type { PlaybackSpeed } from "../playback/timing";
import { speedFactor } from "../playback/timing";

type Props = {
  result: RoundResult;
  roundKey: string;
  speed: PlaybackSpeed;
};

const TIER_LABEL: Record<Exclude<WinTier, "none" | "win">, string> = {
  big: "BIG WIN",
  huge: "HUGE WIN",
  mega: "MEGA WIN",
};

const HOLD_MS = 4_200;

/**
 * Celebration for high-tier results only. Ordinary wins and busts never open
 * it; they are read from the HUD. No replay button: the round is relaunched
 * from the host flow.
 */
export function ResultOverlay({ result, roundKey, speed }: Props) {
  const tier = result.tier;
  const celebrate = tier === "big" || tier === "huge" || tier === "mega";
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const open = celebrate && dismissedKey !== roundKey;

  useEffect(() => {
    if (!open) return;
    const hold = Math.max(1_600, HOLD_MS * Math.max(speedFactor(speed), 0.5));
    const timer = window.setTimeout(() => setDismissedKey(roundKey), hold);
    return () => window.clearTimeout(timer);
  }, [open, roundKey, speed]);

  if (!open || !celebrate) return null;

  return (
    <button
      type="button"
      className={`win-overlay tier-${tier}`}
      data-testid="win-overlay"
      aria-label={`${TIER_LABEL[tier]} ${formatMultiplier(result.multiplierMicros)}`}
      onClick={() => setDismissedKey(roundKey)}
    >
      <span className="win-rays" aria-hidden="true" />
      <span className="win-tier">{TIER_LABEL[tier]}</span>
      <strong className="win-mult">{formatMultiplier(result.multiplierMicros)}</strong>
      <span className="win-payout">+{formatMicros(result.payoutMicros)} credits</span>
      <span className="win-hint">tap to continue</span>
    </button>
  );
}
