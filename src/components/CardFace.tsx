import type { Card, StackColor } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import { labelColor } from "../playback/scene";
import { BackMark, BlueCrystal, GoldTrophy, GreenEmblem, GreyVoid, PackGlyph, PurpleSigil, Skull } from "./CardArt";

export type CardSize = "fly" | "stack" | "hero";

type Props = {
  card: Card;
  size?: CardSize;
  className?: string;
};

const RARITY: Record<StackColor, string> = {
  green: "Spark",
  blue: "Crystal",
  gold: "Treasure",
};

export function toneOf(card: Card): string {
  return card.kind === "value" ? card.color : card.kind;
}

/**
 * One collectible face for every kind. The top nameplate is exactly one peek
 * tall, so a pile shows that strip and not a stripe of the whole card.
 * The large figure is the identity. The chip at the bottom is the value.
 */
export function CardFace({ card, size = "stack", className = "" }: Props) {
  const tone = toneOf(card);
  return (
    <article className={`card size-${size} tone-${tone} ${className}`.trim()} data-tone={tone} data-kind={card.kind}>
      <div className="card-face">
        <CardBody card={card} />
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
        <header className="card-index">
          <Mark tone={card.color} className="card-pip" />
          <span className="card-index-value">{value}</span>
          <span className="card-rarity">{RARITY[card.color]}</span>
        </header>
        <div className="card-art">{heroFor(card.color)}</div>
        <footer className="card-chip">
          <strong className="card-value">{value}</strong>
          <span className="card-kind">{name}</span>
        </footer>
      </>
    );
  }
  if (card.kind === "purple") {
    return (
      <>
        <header className="card-index">
          <PurpleSigil className="card-pip" />
          <span className="card-index-value">×{card.factor}</span>
          <span className="card-rarity">Boost</span>
        </header>
        <div className="card-art">
          <PurpleSigil />
        </div>
        <footer className="card-chip">
          <strong className="card-value">×{card.factor}</strong>
          <span className="card-kind">Boost</span>
        </footer>
      </>
    );
  }
  if (card.kind === "extra") {
    return (
      <>
        <header className="card-index">
          <PackGlyph className="card-pip" />
          <span className="card-index-value">+1</span>
          <span className="card-rarity">Pack</span>
        </header>
        <div className="card-art">
          <PackGlyph />
        </div>
        <footer className="card-chip">
          <strong className="card-value">+1</strong>
          <span className="card-kind">Pack</span>
        </footer>
      </>
    );
  }
  if (card.kind === "grey") {
    return (
      <>
        <header className="card-index">
          <GreyVoid className="card-pip" />
          <span className="card-index-value">0×</span>
          <span className="card-rarity">Blank</span>
        </header>
        <div className="card-art">
          <GreyVoid />
        </div>
        <footer className="card-chip">
          <strong className="card-value">0×</strong>
          <span className="card-kind">Grey</span>
        </footer>
      </>
    );
  }
  return (
    <>
      <header className="card-index card-index-stop">
        <span className="card-index-value">STOP</span>
      </header>
      <div className="card-art">
        <Skull />
      </div>
      <footer className="card-chip">
        <strong className="card-value">0×</strong>
        <span className="card-kind">Red</span>
      </footer>
    </>
  );
}

function heroFor(color: StackColor) {
  if (color === "blue") return <BlueCrystal />;
  if (color === "gold") return <GoldTrophy />;
  return <GreenEmblem />;
}

type MarkTone = StackColor | "purple" | "extra" | "red" | "grey";

export function Mark({ tone, className = "" }: { tone: MarkTone; className?: string }) {
  if (tone === "blue") return <BlueCrystal className={className} />;
  if (tone === "gold") return <GoldTrophy className={className} />;
  if (tone === "purple") return <PurpleSigil className={className} />;
  if (tone === "extra") return <PackGlyph className={className} />;
  if (tone === "red") return <Skull className={className} />;
  if (tone === "grey") return <GreyVoid className={className} />;
  return <GreenEmblem className={className} />;
}
