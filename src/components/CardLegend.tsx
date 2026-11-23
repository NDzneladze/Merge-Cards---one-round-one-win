import { FULL_STACK_COUNT, FULL_STACK_FACTOR, PURPLE_FACTOR, SUPER_STACK_COUNT, SUPER_STACK_FACTOR } from "../engine/config";
import { Mark } from "./CardFace";

const ROWS = [
  { tone: "green", name: "Green", note: "Small value" },
  { tone: "blue", name: "Blue", note: "Mid value" },
  { tone: "gold", name: "Gold", note: "High value" },
  { tone: "grey", name: "Grey", note: "0× · builds the pile" },
  { tone: "purple", name: "Purple", note: `×${PURPLE_FACTOR} biggest pile` },
  { tone: "extra", name: "+1 Pack", note: "Extra pack" },
  { tone: "red", name: "Red", note: "Bust · 0×" },
] as const;

/** The seven card kinds. Lives in the rail and the rules, never on the felt. */
export function LegendRows() {
  return (
    <ul className="legend-rows" aria-label="Card types">
      {ROWS.map((row) => (
        <li key={row.tone} className={`legend-row tone-${row.tone}`}>
          <Mark tone={row.tone} className="legend-mark" />
          <span>{row.name}</span>
          <em>{row.note}</em>
        </li>
      ))}
      <li className="legend-row legend-bonus">
        <span className="legend-badge">Stack ×{FULL_STACK_FACTOR}</span>
        <span className="legend-badge is-super">Stack ×{SUPER_STACK_FACTOR}</span>
        <em>
          {FULL_STACK_COUNT} cards → ×{FULL_STACK_FACTOR} · {SUPER_STACK_COUNT} cards → ×{SUPER_STACK_FACTOR}
        </em>
      </li>
    </ul>
  );
}

/** Collapsible key for the left rail. Closed by default, so the rail stays quiet. */
export function CardLegend() {
  return (
    <details className="extras legend-block" data-testid="card-legend">
      <summary>Cards</summary>
      <LegendRows />
    </details>
  );
}
