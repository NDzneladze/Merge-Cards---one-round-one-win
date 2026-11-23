import type { Card } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import { labelColor } from "../playback/scene";

export type CardSize = "fly" | "stack" | "hero";

type Props = {
  card: Card;
  size?: CardSize;
  className?: string;
};

export function toneOf(card: Card): string {
  return card.kind === "value" ? card.color : card.kind;
}

/** Portrait 5:7 card with a corner index, a centre emblem and a value foot. */
export function CardFace({ card, size = "stack", className = "" }: Props) {
  const tone = toneOf(card);
  return (
    <article className={`card size-${size} tone-${tone} ${className}`.trim()} data-tone={tone}>
      <div className="card-sheen" aria-hidden="true" />
      <div className="card-frame">
        <CardBody card={card} />
      </div>
    </article>
  );
}

export function CardBack({ size = "fly", className = "" }: { size?: CardSize; className?: string }) {
  return (
    <article className={`card size-${size} tone-back ${className}`.trim()} aria-hidden="true">
      <div className="card-frame card-back-frame">
        <span className="card-back-mark">
          <Gem />
        </span>
      </div>
    </article>
  );
}

function CardBody({ card }: { card: Card }) {
  if (card.kind === "value") {
    const value = formatMultiplier(card.valueMicros);
    return (
      <>
        <header className="card-head">
          <span className="card-index">{labelColor(card.color)}</span>
          <Gem className="card-pip" />
        </header>
        <div className="card-center">
          <strong className="card-value">{value}</strong>
        </div>
        <footer className="card-foot">
          <span>{value}</span>
        </footer>
      </>
    );
  }
  if (card.kind === "purple") {
    return (
      <>
        <header className="card-head">
          <span className="card-index">Boost</span>
          <Star className="card-pip" />
        </header>
        <div className="card-center">
          <Star className="card-emblem" />
          <strong className="card-value">×{card.factor}</strong>
        </div>
        <footer className="card-foot">
          <span>Biggest stack</span>
        </footer>
      </>
    );
  }
  if (card.kind === "extra") {
    return (
      <>
        <header className="card-head">
          <span className="card-index">Extra</span>
          <Ticket className="card-pip" />
        </header>
        <div className="card-center">
          <Ticket className="card-emblem" />
          <strong className="card-value">+1</strong>
          <span className="card-sub">Pack</span>
        </div>
        <footer className="card-foot">
          <span>Next pack</span>
        </footer>
      </>
    );
  }
  return (
    <>
      <header className="card-head">
        <span className="card-index">Red</span>
        <Cross className="card-pip" />
      </header>
      <div className="card-center">
        <Cross className="card-emblem" />
        <strong className="card-value">STOP</strong>
      </div>
      <footer className="card-foot">
        <span>Round over</span>
      </footer>
    </>
  );
}

export function Gem({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 3h10l4 6-9 12L3 9l4-6Zm1.2 2L6 8.6h3.3L8.2 5Zm7.6 0-1.1 3.6H18L15.8 5ZM9.6 5l1.2 3.6h2.4L14.4 5H9.6Zm-3.1 5.6 4.3 7.2-1.6-7.2H6.5Zm4.7 0 .8 8 .8-8h-1.6Zm4.3 0-1.6 7.2 4.3-7.2h-2.7Z" />
    </svg>
  );
}

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 1.5c.6 3.9 3.6 6.9 7.5 7.5v6c-3.9.6-6.9 3.6-7.5 7.5-.6-3.9-3.6-6.9-7.5-7.5v-6c3.9-.6 6.9-3.6 7.5-7.5Z" />
    </svg>
  );
}

/** Pack ticket: a sealed pack silhouette with a torn-off stub. */
export function Ticket({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v3.2a2.3 2.3 0 0 0 0 4.6V16a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16v-3.2a2.3 2.3 0 0 0 0-4.6V5A1.5 1.5 0 0 1 5 3.5Zm3 2.5v9h1.6v-9H8Zm3.2 0v9h1.6v-9h-1.6Zm3.2 0v9H16v-9h-1.6ZM6 19h12v1.5H6V19Z"
      />
    </svg>
  );
}

export function Cross({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        d="M5 5l14 14M19 5 5 19"
      />
    </svg>
  );
}
