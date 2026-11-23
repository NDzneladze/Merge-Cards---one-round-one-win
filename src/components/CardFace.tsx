import type { Card, StackColor } from "../engine/types";
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

/**
 * Shared 5:7 collectible face. Colour, icon and words all carry the identity
 * so a pile still reads if the hue is hard to see. The top corner is the
 * strip that stays visible when a card is peeked in a stack.
 */
export function CardFace({ card, size = "stack", className = "" }: Props) {
  const tone = toneOf(card);
  return (
    <article className={`card size-${size} tone-${tone} ${className}`.trim()} data-tone={tone} data-kind={card.kind}>
      <div className="card-face">
        <div className="card-texture" aria-hidden="true" />
        <div className="card-sheen" aria-hidden="true" />
        <CardBody card={card} />
        <div className="card-frame-line" aria-hidden="true" />
      </div>
    </article>
  );
}

export function CardBack({ size = "fly", className = "" }: { size?: CardSize; className?: string }) {
  return (
    <article className={`card size-${size} tone-back ${className}`.trim()} aria-hidden="true">
      <div className="card-face card-back-face">
        <div className="card-back-lattice" />
        <div className="card-back-medallion">
          <BackMark />
        </div>
        <div className="card-frame-line card-frame-line-back" />
      </div>
    </article>
  );
}

function CardBody({ card }: { card: Card }) {
  if (card.kind === "value") {
    const value = formatMultiplier(card.valueMicros);
    const name = labelColor(card.color);
    return (
      <>
        <Corner value={value} tone={card.color} />
        <div className="card-center">
          <Mark tone={card.color} className="card-watermark" />
          <strong className="card-value">{value}</strong>
          <span className="card-kind">{name}</span>
        </div>
        <Corner value={value} tone={card.color} foot />
      </>
    );
  }
  if (card.kind === "purple") {
    return (
      <>
        <Corner value={`×${card.factor}`} mark="purple" />
        <div className="card-center">
          <Mark tone="purple" className="card-watermark" />
          <strong className="card-value">×{card.factor}</strong>
          <span className="card-kind">Boost</span>
        </div>
        <Corner value={`×${card.factor}`} mark="purple" foot />
      </>
    );
  }
  if (card.kind === "extra") {
    return (
      <>
        <Corner value="+1" mark="extra" />
        <div className="card-center">
          <Mark tone="extra" className="card-watermark" />
          <strong className="card-value">+1</strong>
          <span className="card-kind">Pack</span>
        </div>
        <Corner value="+1" mark="extra" foot />
      </>
    );
  }
  return (
    <>
      <Corner value="STOP" mark="red" />
      <div className="card-center">
        <Mark tone="red" className="card-watermark" />
        <strong className="card-value">STOP</strong>
        <span className="card-kind">0× bust</span>
      </div>
      <Corner value="STOP" mark="red" foot />
    </>
  );
}

function Corner({ value, tone, mark, foot = false }: { value: string; tone?: StackColor; mark?: "purple" | "extra" | "red"; foot?: boolean }) {
  return (
    <div className={`card-corner ${foot ? "is-foot" : ""}`}>
      <span className="card-corner-value">{value}</span>
      <Mark tone={tone ?? mark ?? "green"} className="card-pip" />
    </div>
  );
}

type MarkTone = StackColor | "purple" | "extra" | "red";

export function Mark({ tone, className = "" }: { tone: MarkTone; className?: string }) {
  if (tone === "blue") return <Diamond className={className} />;
  if (tone === "gold") return <Crown className={className} />;
  if (tone === "purple") return <Star className={className} />;
  if (tone === "extra") return <Ticket className={className} />;
  if (tone === "red") return <Stop className={className} />;
  return <Gem className={className} />;
}

export function Gem({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 1.2 4.2 8.6 12 22.8 19.8 8.6 12 1.2Zm0 3.1 2.2 3.5H9.8L12 4.3ZM7.2 9.2h3.1L8.2 16.5 7.2 9.2Zm6.5 0h3.1L15.8 16.5 13.7 9.2ZM12 18.6 9.7 9.2h4.6L12 18.6Z"
      />
    </svg>
  );
}

export function Diamond({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 1.5 21.5 12 12 22.5 2.5 12 12 1.5Zm0 4.2L6.7 12 12 18.3 17.3 12 12 5.7Z" />
    </svg>
  );
}

export function Crown({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 17.5 4.2 8l4.3 3.6L12 4.5l3.5 7.1L19.8 8 21 17.5H3Zm1.6 1.4h14.8V21H4.6v-2.1Z" />
    </svg>
  );
}

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 1.4 14.7 8l7 .6-5.3 4.5 1.7 6.8L12 16.6 6 19.9l1.7-6.8L2.3 8.6 9.3 8 12 1.4Z" />
    </svg>
  );
}

/** Sealed-pack ticket. The notches are the silhouette, not a licensed mark. */
export function Ticket({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M6 3.2h12A1.8 1.8 0 0 1 19.8 5v2.2a2.2 2.2 0 0 0 0 4.1V14a1.8 1.8 0 0 1-1.8 1.8H6A1.8 1.8 0 0 1 4.2 14V11.3a2.2 2.2 0 0 0 0-4.1V5A1.8 1.8 0 0 1 6 3.2Zm2.2 3.1v6.2h1.5V6.3H8.2Zm3 0v6.2H13V6.3h-1.8Zm3.1 0v6.2h1.5V6.3h-1.5ZM7 17.6h10v1.7H7v-1.7Z"
      />
    </svg>
  );
}

export function Stop({ className = "" }: { className?: string }) {
  return (
    <svg className={`glyph ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#3a0712" d="M8.2 2.6h7.6L21.4 8.2v7.6l-5.6 5.6H8.2L2.6 15.8V8.2L8.2 2.6Z" />
      <path fill="none" stroke="#fff6f6" strokeWidth="2.2" strokeLinecap="round" d="M8 8l8 8M16 8l-8 8" />
    </svg>
  );
}

/** Original medallion for the card back: a diamond nested in a four-point star. */
export function BackMark() {
  return (
    <svg className="glyph back-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 1.2 14.2 8.4 21.6 9.2 16.2 13.6 18 21.2 12 17.2 6 21.2 7.8 13.6 2.4 9.2 9.8 8.4 12 1.2Z" />
      <path fill="#1a2748" d="M12 7.2 15.1 12 12 16.8 8.9 12 12 7.2Z" />
    </svg>
  );
}
