import type { Card } from "../engine/types";
import { formatMultiplier, levelMicros } from "../engine/money";
import { labelColor } from "../playback/reduce";

type FaceCard = Card | "back" | "empty";

type Props = {
  card: FaceCard;
  hot?: boolean;
  compact?: boolean;
  wiped?: boolean;
  deal?: boolean;
};

export function CardFace({ card, hot = false, compact = false, wiped = false, deal = false }: Props) {
  const tone = card === "back" || card === "empty" ? card : card.kind === "color" ? card.color : card.kind;
  const classes = [
    "pcard",
    `tone-${tone}`,
    compact ? "is-compact" : "",
    hot ? "is-hot" : "",
    wiped && card !== "empty" && card !== "back" ? "is-wiped" : "",
    deal ? "is-deal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} data-tone={tone}>
      <CardBody card={card} />
    </article>
  );
}

function CardBody({ card }: { card: FaceCard }) {
  if (card === "empty") {
    return <span className="pcard-empty">·</span>;
  }
  if (card === "back") {
    return (
      <>
        <span className="pcard-kicker">Pack</span>
        <strong className="pcard-title">?</strong>
      </>
    );
  }
  if (card.kind === "color") {
    return (
      <>
        <span className="pcard-kicker">{labelColor(card.color)}</span>
        <strong className="pcard-title">L{card.level}</strong>
        <span className="pcard-value">{formatMultiplier(levelMicros(card.level))}</span>
      </>
    );
  }
  if (card.kind === "grey") {
    return (
      <>
        <span className="pcard-kicker">Grey</span>
        <strong className="pcard-title">0×</strong>
        <span className="pcard-value">No merge</span>
      </>
    );
  }
  if (card.kind === "extra_pack") {
    return (
      <>
        <span className="pcard-kicker">Bonus</span>
        <strong className="pcard-title">+1</strong>
        <span className="pcard-value">PACK</span>
      </>
    );
  }
  return (
    <>
      <span className="pcard-kicker">Danger</span>
      <strong className="pcard-title">SKULL</strong>
      <span className="pcard-value">Ends at 0×</span>
    </>
  );
}
