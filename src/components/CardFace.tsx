import type { Card } from "../engine/types";
import { formatMultiplier, levelMicros } from "../engine/money";
import { labelColor } from "../playback/scene";

type Props = {
  card: Card;
  size?: "fly" | "lane";
  className?: string;
};

export function toneOf(card: Card): string {
  return card.kind === "color" ? card.color : card.kind;
}

export function CardFace({ card, size = "lane", className = "" }: Props) {
  const tone = toneOf(card);
  return (
    <article className={`pcard size-${size} tone-${tone} ${className}`.trim()} data-tone={tone}>
      <CardBody card={card} />
    </article>
  );
}

export function CardBack({ size = "fly", className = "" }: { size?: "fly" | "lane"; className?: string }) {
  return (
    <article className={`pcard size-${size} tone-back ${className}`.trim()} aria-hidden="true">
      <span className="pcard-back-mark">?</span>
    </article>
  );
}

function CardBody({ card }: { card: Card }) {
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
        <span className="pcard-value">Pack</span>
      </>
    );
  }
  return (
    <>
      <span className="pcard-kicker">Danger</span>
      <strong className="pcard-title">
        <SkullMark />
      </strong>
      <span className="pcard-value">Skull</span>
    </>
  );
}

export function SkullMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`skull-mark ${className}`.trim()} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M32 6C18 6 8 16 8 29c0 7 3 12 8 16v7a4 4 0 0 0 4 4h4v-6h4v6h8v-6h4v6h4a4 4 0 0 0 4-4v-7c5-4 8-9 8-16C56 16 46 6 32 6Zm-9 30a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm18 0a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm-9 9-4-7h8l-4 7Z"
      />
    </svg>
  );
}
