import { useEffect } from "react";
import { DEMO_WEIGHTS, LEVEL_MICROS } from "../engine/config";
import { formatMultiplier } from "../engine/money";

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
          <li>Matching color and level merge into the next level. The board keeps every surviving card for later packs.</li>
          <li>
            <strong>+1 PACK</strong> queues another six-card pack in the same bet. It can chain. There is no −1 pack.
          </li>
          <li>
            <strong>SKULL</strong> stops the round immediately at 0× and cancels pending packs, even if a +1 already appeared.
          </li>
          <li>Grey cards pay 0× and do not merge. There is no cashout and no second bet mid-round.</li>
          <li>The number during the chain is potential. It becomes a win only after a safe finish.</li>
        </ul>
        <h3>Demo paytable</h3>
        <p className="disclaimer">Placeholder values. Not a validated RTP. Not real money.</p>
        <table>
          <tbody>
            {Object.entries(LEVEL_MICROS).map(([level, micros]) => (
              <tr key={level}>
                <th>Level {level}</th>
                <td>{formatMultiplier(micros)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Level 6 is the ceiling and does not merge. With the six-pack demo cap, a natural chain of level-1 cards tops out at level 5.
        </p>
        <h3>Placeholder draw weights</h3>
        <p>
          Each color {DEMO_WEIGHTS.red}%, grey {DEMO_WEIGHTS.grey}%, +1 pack {DEMO_WEIGHTS.extra_pack}%, Skull {DEMO_WEIGHTS.skull}%.
          At the six-pack cap, +1 is removed and the other weights are used unchanged (denominator 89).
        </p>
      </div>
    </div>
  );
}
