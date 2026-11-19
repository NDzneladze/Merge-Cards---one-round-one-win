import { useEffect, useState } from "react";
import type { RoundResult, WinTier } from "../engine/types";
import { formatMicros, formatMultiplier } from "../engine/money";
import { PLAYBACK_SCALE } from "../playback/timing";

type Props = {
  result: RoundResult;
  roundKey: string;
};

type CelebratedTier = Extract<WinTier, "big" | "huge" | "mega">;

const TIER_LABEL: Record<CelebratedTier, string> = {
  big: "BIG WIN",
  huge: "HUGE WIN",
  mega: "MEGA WIN",
};

const HOLD_MS = 3_000;
const COUNT_MS = 1_100;

function isCelebrated(tier: WinTier): tier is CelebratedTier {
  return tier === "big" || tier === "huge" || tier === "mega";
}

/**
 * Short celebration for the high tiers only (from `CELEBRATION_MIN_MICROS`).
 * It counts the multiplier up, holds for a moment and leaves by itself; a tap
 * dismisses it early. Ordinary results never open it, and nothing here
 * changes the settlement. No replay button: the host flow starts rounds.
 */
export function ResultOverlay({ result, roundKey }: Props) {
  const tier = result.tier;
  const celebrate = isCelebrated(tier);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const open = celebrate && dismissedKey !== roundKey;
  const factor = PLAYBACK_SCALE;
  const [shown, setShown] = useState(0n);

  useEffect(() => {
    if (!open) return;
    const hold = Math.max(1_600, HOLD_MS * factor);
    const timer = window.setTimeout(() => setDismissedKey(roundKey), hold);
    return () => window.clearTimeout(timer);
  }, [open, roundKey, factor]);

  useEffect(() => {
    if (!open) return;
    const target = result.multiplierMicros;
    const duration = COUNT_MS * factor;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      setShown(BigInt(Math.round(Number(target) * eased)));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [open, result.multiplierMicros, factor, roundKey]);

  if (!open || !celebrate) return null;

  return (
    <div
      className={`win-overlay tier-${tier}`}
      data-testid="win-overlay"
      role="status"
      aria-label={`${TIER_LABEL[tier]} ${formatMultiplier(result.multiplierMicros)}`}
      onClick={() => setDismissedKey(roundKey)}
    >
      <span className="win-rays" aria-hidden="true" />
      <span className="win-sparks" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} style={{ ["--k" as string]: index }} />
        ))}
      </span>
      <span className="win-tier">{TIER_LABEL[tier]}</span>
      <strong className="win-mult" data-testid="win-count">
        {formatMultiplier(shown)}
      </strong>
      <span className="win-payout">+{formatMicros(result.payoutMicros)} credits</span>
    </div>
  );
}
