import { forwardRef } from "react";
import { Ticket } from "./CardFace";

type Props = {
  pending: number;
  /** Packs already opened plus every pack waiting. */
  total: number;
  /** Replays the increment animation whenever a +1 PACK lands. */
  earnKey: string | null;
  cancelled: number;
  idle: boolean;
};

/**
 * Next Packs queue beside the bottom pack. Every +1 PACK card flies here and
 * bumps the counter; the next pack is pulled from here once the current one
 * is empty. A red card crosses the whole queue out.
 */
export const PackQueue = forwardRef<HTMLDivElement, Props>(function PackQueue({ pending, total, earnKey, cancelled, idle }, ref) {
  const dead = cancelled > 0;
  const shown = dead ? cancelled : pending;
  return (
    <div
      ref={ref}
      className={`queue ${shown > 0 ? "has-packs" : "is-empty"} ${dead ? "is-dead" : ""} ${idle ? "is-idle" : ""}`}
      data-testid="pack-queue"
      aria-label={dead ? `${cancelled} queued packs cancelled` : `${pending} packs queued`}
    >
      <span className="queue-label">Next packs</span>
      <div className="queue-tickets" aria-hidden="true">
        {Array.from({ length: Math.min(shown, 5) }, (_, index) => (
          <span key={index} className="queue-ticket" style={{ ["--i" as string]: index }}>
            <Ticket />
          </span>
        ))}
        {shown === 0 ? (
          <span className="queue-ticket is-ghost">
            <Ticket />
          </span>
        ) : null}
      </div>
      <strong key={earnKey ?? "count"} className={`queue-count ${earnKey ? "is-bump" : ""}`} data-testid="queue-count">
        {dead ? `−${cancelled}` : `+${pending}`}
      </strong>
      <small>{dead ? "cancelled" : total > 1 ? `of ${total} packs` : "\u00a0"}</small>
    </div>
  );
});
