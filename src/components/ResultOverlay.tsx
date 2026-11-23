import type { RoundResult } from "../engine/types";
import { formatMicros, formatMultiplier } from "../engine/money";
import { SkullMark } from "./CardFace";

type Props = {
  result: RoundResult;
  onAgain: () => void;
  onPinSeed: (seed: string) => void;
  canPlay: boolean;
};

/** Takes the hero spot once the round has settled. The lanes stay visible below it. */
export function ResultOverlay({ result, onAgain, onPinSeed, canPlay }: Props) {
  const skull = result.outcome === "loss";
  const noWin = !skull && result.multiplierMicros === 0n;
  const title = skull ? "SKULL" : noWin ? "NO WIN" : "FINAL WIN";
  const tone = skull ? "skull" : noWin ? "empty" : "win";

  return (
    <div className={`result tone-${tone}`} role="status" aria-labelledby="result-title" data-testid="result-overlay">
      {skull ? <SkullMark className="result-skull" /> : null}
      <p className="result-kicker">{skull ? "Round ended instantly" : "One settlement"}</p>
      <h2 id="result-title" data-testid="result-title">
        {title} {formatMultiplier(result.multiplierMicros)}
      </h2>
      <p className="payout" data-testid="result-payout">
        Payout {formatMicros(result.payoutMicros)} credits
      </p>
      <p className="result-copy">
        {skull
          ? result.potentialLostMicros > 0n
            ? `Wiped ${formatMultiplier(result.potentialLostMicros)} of potential and every pending pack.`
            : "Nothing on the board is paid. Pending packs are cancelled."
          : noWin
            ? "The packs finished safely, and the surviving cards pay 0×. This is not a Skull."
            : `${result.openedPacks} pack${result.openedPacks === 1 ? "" : "s"} resolved into one payout.`}
      </p>
      <div className="result-actions">
        <button type="button" className="play" data-testid="play-again" disabled={!canPlay} onClick={onAgain}>
          Play again
        </button>
        <button type="button" className="ghost" onClick={() => onPinSeed(result.seed)} title={`Seed ${result.seed}`}>
          Pin seed
        </button>
      </div>
      <p className="seed-read">
        Seed <code data-testid="round-seed">{result.seed}</code>
      </p>
    </div>
  );
}
