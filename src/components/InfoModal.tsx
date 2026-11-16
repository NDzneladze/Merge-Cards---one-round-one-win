import { useEffect } from "react";
import { CELEBRATION_MIN_MICROS, DIFFICULTIES, DIFFICULTY_ORDER, GREEN_VALUES, MAX_PACKS, PURPLE_FACTOR, WIN_TIERS } from "../engine/config";
import { valueBounds } from "../engine/draw";
import { formatMultiplier } from "../engine/money";
import { labelColor } from "../playback/scene";

type Props = {
  onClose: () => void;
};

/** Per-mille draw weight → percentage label. */
const pct = (perMille: number) => `${(perMille / 10).toFixed(1).replace(/\.0$/, "")}%`;

export function InfoModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const greenSmall =
    GREEN_VALUES.kind === "weighted"
      ? Math.round(
          (100 * GREEN_VALUES.entries.filter((entry) => entry.valueMicros <= 200_000n).reduce((sum, entry) => sum + entry.weight, 0)) /
            GREEN_VALUES.entries.reduce((sum, entry) => sum + entry.weight, 0),
        )
      : 0;

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className="info-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="info-title">How a round works</h2>
          <button type="button" className="ghost" onClick={onClose} autoFocus>
            Close
          </button>
        </header>
        <ul>
          <li>Pick a difficulty, set a stake, press Play. One stake opens one pack of six cards.</li>
          <li>Each card launches upward out of the pack, flips in the air and tucks into the pile of its colour. A pile is worth the sum of its cards.</li>
          <li>
            <strong>PURPLE</strong> lands on the pile with the most cards and multiplies it by ×{PURPLE_FACTOR}. Ties go
            to the highest total, then to the leftmost pile. Boosts stack with each other.
          </li>
          <li>
            <strong>+1 PACK</strong> slides a bonus pack in under the current one. Its cards join the same piles,
            boosts included, and can earn further packs, up to {MAX_PACKS} packs in a round. It never appears once that
            cap is reached.
          </li>
          <li>
            <strong>RED</strong> ends the whole round instantly at 0×. Every pile, every remaining card and every
            waiting pack is cancelled.
          </li>
          <li>
            The total shown during the round is potential. It pays once, after the last pack, if no red appeared. A
            result below 1.00× is a return smaller than the stake; above 1.00× is a win.
          </li>
        </ul>
        <h3>Difficulty</h3>
        <table>
          <tbody>
            {DIFFICULTY_ORDER.map((id) => {
              const mode = DIFFICULTIES[id];
              return (
                <tr key={id}>
                  <th>{mode.label}</th>
                  <td>{mode.colors.map(labelColor).join(" + ")}</td>
                  <td>Red {pct(mode.weights.red)} · +1 {pct(mode.weights.extra)} · Purple {pct(mode.weights.purple)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3>Card values</h3>
        <p className="disclaimer">Placeholder values and weights. Not a validated RTP. Not real money.</p>
        <table>
          <tbody>
            <tr>
              <th>Green</th>
              <td>
                {formatMultiplier(valueBounds(GREEN_VALUES).minMicros)} – {formatMultiplier(valueBounds(GREEN_VALUES).maxMicros)}
              </td>
              <td>{greenSmall}% of green cards are 0.20× or less</td>
            </tr>
            <tr>
              <th>Blue</th>
              <td>1.00× – 3.00×</td>
              <td>Low values more likely on Hard</td>
            </tr>
            <tr>
              <th>Gold</th>
              <td>5.00× – 15.00×</td>
              <td>Medium and Hard only</td>
            </tr>
          </tbody>
        </table>
        <h3>Win feedback</h3>
        <p>
          Wins above 1× get a small badge in the HUD. From {formatMultiplier(CELEBRATION_MIN_MICROS)} a short celebration
          plays:{" "}
          {[...WIN_TIERS]
            .reverse()
            .map((rule) => `${rule.tier.toUpperCase()} from ${formatMultiplier(rule.minMicros)}`)
            .join(", ")}
          . It leaves on its own; nothing to tap.
        </p>
      </div>
    </div>
  );
}
