import { Mark } from "./CardFace";

const ROWS = [
  { tone: "green", name: "Green", note: "Small" },
  { tone: "blue", name: "Blue", note: "Mid" },
  { tone: "gold", name: "Gold", note: "High" },
  { tone: "purple", name: "Purple", note: "×2" },
  { tone: "extra", name: "+1 Pack", note: "Chain" },
  { tone: "red", name: "Red", note: "Stop" },
  { tone: "grey", name: "Grey", note: "0×" },
] as const;

/** Narrow key. Rendered only when the side gutter is already empty. */
export function CardLegend() {
  return (
    <aside className="card-legend" aria-label="Card types">
      {ROWS.map((row) => (
        <p key={row.tone} className={`legend-row tone-${row.tone}`}>
          <Mark tone={row.tone} className="legend-mark" />
          <span>{row.name}</span>
          <em>{row.note}</em>
        </p>
      ))}
    </aside>
  );
}
