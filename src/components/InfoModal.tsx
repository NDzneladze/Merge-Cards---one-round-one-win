import { useEffect } from "react";
import { DEMO_WEIGHTS, PURPLE_FACTOR, VALUE_RANGES, WIN_TIERS } from "../engine/config";
import { formatMultiplier } from "../engine/money";
import { STACK_COLORS } from "../engine/types";
import { labelColor } from "../playback/scene";

type Props = {
  onClose: () => void;
};

export function InfoModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <li>One stake buys one round and opens one pack of six cards.</li>
          <li>Each card flies out of the pack into the stack of its colour. A stack is worth the sum of its cards.</li>
          <li>
            <strong>PURPLE</strong> lands on the stack with the most cards and multiplies it by ×{PURPLE_FACTOR}. Ties go
            to the highest total, then to the leftmost stack. Boosts stack with each other.
          </li>
          <li>
            <strong>RED</strong> ends the round instantly at 0×. Every stack and every remaining card is cancelled.
          </li>
          <li>The total shown during the round is potential. It pays once, after the last card, if no red appeared.</li>
        </ul>
        <h3>Card types</h3>
        <p className="disclaimer">Placeholder values and weights. Not a validated RTP. Not real money.</p>
        <table>
          <tbody>
            {STACK_COLORS.map((color) => (
              <tr key={color}>
                <th>{labelColor(color)}</th>
                <td>
                  {formatMultiplier(VALUE_RANGES[color].minMicros)} – {formatMultiplier(VALUE_RANGES[color].maxMicros)}
                </td>
                <td>{DEMO_WEIGHTS[color]}%</td>
              </tr>
            ))}
            <tr>
              <th>Purple</th>
              <td>×{PURPLE_FACTOR} on the biggest stack</td>
              <td>{DEMO_WEIGHTS.purple}%</td>
            </tr>
            <tr>
              <th>Red</th>
              <td>Round over · 0×</td>
              <td>{DEMO_WEIGHTS.red}%</td>
            </tr>
          </tbody>
        </table>
        <h3>Win tiers</h3>
        <p>
          Ordinary wins are shown in the HUD only.{" "}
          {[...WIN_TIERS]
            .reverse()
            .map((rule) => `${rule.tier.toUpperCase()} from ${formatMultiplier(rule.minMicros)}`)
            .join(", ")}{" "}
          open a celebration.
        </p>
      </div>
    </div>
  );
}
