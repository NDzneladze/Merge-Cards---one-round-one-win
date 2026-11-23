import type { ViewState } from "../playback/reduce";
import type { PlaybackSpeed } from "../playback/timing";
import { formatMultiplier } from "../engine/money";
import { CardFace } from "./CardFace";
import { CardBoard } from "./CardBoard";

type Props = {
  view: ViewState | null;
  speed: PlaybackSpeed;
  idle: boolean;
};

export function PackStage({ view, speed, idle }: Props) {
  const status = idle || !view ? "idle" : view.status;
  const packState = !view || view.packNo === 0 ? "sealed" : view.wiped ? "skull" : view.finalMicros !== null ? "done" : "open";
  const slots = Array.from({ length: 6 }, (_, index) => view?.revealed[index] ?? null);
  const animate = speed !== "instant";

  const potentialLabel = !view
    ? "Potential"
    : view.wiped
      ? "Result"
      : view.finalMicros !== null
        ? "Final"
        : "Potential";
  const potentialValue = !view ? "—" : formatMultiplier(view.wiped ? 0n : view.potentialMicros);

  const anim = speed === "2x" ? "0.5" : speed === "instant" ? "0.01" : "1";

  return (
    <section
      className={`stage stage-${status}`}
      data-testid="stage"
      aria-label="Pack stage"
      style={{ ["--anim" as string]: anim }}
    >
      <div className="meters">
        <Meter label="Pack" value={view && view.packNo > 0 ? String(view.packNo) : "—"} testId="pack-meter" />
        <Meter label="Pending" value={view ? String(view.pendingPacks) : "1"} testId="pending-meter" />
        <Meter
          label={potentialLabel}
          value={potentialValue}
          testId="potential"
          hint={view && view.finalMicros === null && !view.wiped ? "Not a win yet" : undefined}
        />
      </div>

      <div className={`booster booster-${packState}`} data-testid="pack">
        <div className="booster-shine" />
        <div className="booster-flap" />
        <div className="booster-body">
          <span>MERGE</span>
          <strong>PACK</strong>
          <em>6 CARDS</em>
        </div>
      </div>

      <p className="section-label">This pack</p>
      <div className={`reveal ${view?.finalMicros !== null ? "is-settled" : ""}`} aria-label="Current pack">
        {slots.map((card, index) => (
          <div key={index} className="reveal-slot">
            {card ? (
              <CardFace
                card={card}
                compact
                wiped={view?.wiped}
                hot={view?.hotIds.includes(card.id)}
                deal={animate && index === (view?.revealed.length ?? 0) - 1}
              />
            ) : (
              <CardFace card={view?.wiped ? "empty" : "back"} compact />
            )}
          </div>
        ))}
      </div>

      <p className="live" aria-live="polite" data-testid="caption">
        {idle || !view ? "Set a demo stake and press Play. The round resolves by itself." : view.caption}
      </p>

      <p className="section-label">Board</p>
      <CardBoard board={view?.board ?? []} hotIds={view?.hotIds ?? []} wiped={view?.wiped ?? false} />
      {view?.wiped ? <p className="wiped-banner">Board wiped · payout 0×</p> : null}
    </section>
  );
}

function Meter({ label, value, testId, hint }: { label: string; value: string; testId: string; hint?: string }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
      {hint ? <small>{hint}</small> : <small>&nbsp;</small>}
    </div>
  );
}
