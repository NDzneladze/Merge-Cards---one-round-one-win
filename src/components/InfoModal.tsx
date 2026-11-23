import { useEffect } from "react";
import { CELEBRATION_MIN_MICROS, DIFFICULTIES, DIFFICULTY_ORDER, FULL_STACK_COUNT, FULL_STACK_FACTOR, GREEN_VALUES, GREEN_VALUES_EASY, MAX_PACKS, PURPLE_FACTOR, SUPER_STACK_COUNT, SUPER_STACK_FACTOR, WIN_TIERS } from "../engine/config";
import type { ValueDistribution } from "../engine/config";
import { valueBounds } from "../engine/draw";
import { formatMultiplier } from "../engine/money";
import { labelColor } from "../playback/scene";
import { LegendRows } from "./CardLegend";

type Props = {
  onClose: () => void;
};

/** Per-mille draw weight → percentage label. */
const pct = (perMille: number) => `${(perMille / 10).toFixed(1).replace(/\.0$/, "")}%`;

/** Share of a green table at or below 0.20×, rounded to the nearest percent. */
function greenSmallShare(table: ValueDistribution): number {
  if (table.kind !== "weighted") return 0;
  const total = table.entries.reduce((sum, entry) => sum + entry.weight, 0);
  const small = table.entries.filter((entry) => entry.valueMicros <= 200_000n).reduce((sum, entry) => sum + entry.weight, 0);
  return Math.round((100 * small) / total);
}

export function InfoModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const easySmall = greenSmallShare(GREEN_VALUES_EASY);
  const mediumSmall = greenSmallShare(GREEN_VALUES);

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
        <h3>Cards</h3>
        <LegendRows />
        <h3>Round</h3>
        <ul>
          <li>Pick a difficulty, set a stake, press Play. One stake opens one pack of six cards.</li>
          <li>Each card launches upward out of the pack, flips in the air and tucks into the pile of its colour. A pile is worth the sum of its cards.</li>
          <li>
            <strong>PURPLE</strong> lands on the biggest pile and multiplies it by ×{PURPLE_FACTOR}. Every card in the
            pile counts, Grey included. Ties go to the highest boosted total, then to the leftmost pile. A pile of only
            Grey cards can take the boost: it stays 0× until a value card joins, and that card is multiplied. Boosts
            stack with each other, and with Stack Bonus.
          </li>
          <li>
            <strong>GREY</strong> is an empty card, 0×. It joins a random pile that already holds a card, or any pile if
            the table is empty. It adds nothing to that pile's value and it is not a bust, a boost or a pack. It does
            count as a card, so it builds the pile toward 10 and 20. A Grey can be the card that awards the bonus. The
            prize is the stack, not the Grey. It can also draw a Purple onto its pile.
          </li>
          <li>
            <strong>STACK BONUS ×{FULL_STACK_FACTOR}</strong> at {FULL_STACK_COUNT} cards, then{" "}
            <strong>STACK ×{SUPER_STACK_FACTOR}</strong> at {SUPER_STACK_COUNT} cards. These are total multipliers: at 20
            cards the ×{FULL_STACK_FACTOR} becomes ×{SUPER_STACK_FACTOR}. It does not stack into ×
            {FULL_STACK_FACTOR * SUPER_STACK_FACTOR}. Green, Blue, Gold and Grey count. Purple, Red and +1 PACK do not.
            Each pile keeps its own progress across every pack of the round. A later card uses the tier already open. 21
            or more adds nothing further. Purple multiplies on top: 3.20× with one Purple is 6.40×, 12.80× at 10 cards,
            and 25.60× at 20. A pile of only Greys stays 0× until a value card joins, and that card takes the tier. Red
            wipes it.
          </li>
          <li>
            <strong>+1 PACK</strong> tucks a bonus pack in under the current one. Its cards join the same piles,
            boosts included, and can earn further packs, up to {MAX_PACKS} packs in a round. It never appears once that
            cap is reached.
          </li>
          <li>
            <strong>RED</strong> strikes and leaves. The whole round ends at 0×. Every pile, every Stack Bonus and every
            waiting pack is cancelled. A round of only grey cards is a no-win 0×, not a bust.
          </li>
          <li>
            The total shown during the round is potential. It pays once, after the last pack, if no red appeared. Above
            1.00× is a win. Exactly 1.00× breaks even. A payout above zero and below 1.00× is a return. Zero without a
            red card is no win.
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
                  <td>
                    Red {pct(mode.weights.red)} · Grey {pct(mode.weights.grey)} · +1 {pct(mode.weights.extra)} · Purple{" "}
                    {pct(mode.weights.purple)}
                  </td>
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
              <td>
                Easy {easySmall}% and Medium {mediumSmall}% of green cards are 0.20× or less
              </td>
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
