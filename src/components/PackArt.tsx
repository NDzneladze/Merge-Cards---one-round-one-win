import type { Ref } from "react";
import { CardBack } from "./CardFace";

type Props = {
  bonus: boolean;
  /** Closed wrapper. Queued boosters stay sealed; the active pack opens from the parent state. */
  sealed?: boolean;
  product: string;
  detail: string;
  cardsLeft?: number;
  mouthRef?: Ref<HTMLDivElement>;
};

/**
 * Original Rainbet booster wrapper. The wordmark is set in type, not a copied
 * logo. The flap, crimp and card backs are what make it a pack of cards.
 */
export function PackArt({ bonus, sealed = false, product, detail, cardsLeft = 0, mouthRef }: Props) {
  const backs = sealed ? 3 : cardsLeft;
  return (
    <div className={`pack-art ${bonus ? "is-bonus" : ""} ${sealed ? "is-sealed" : ""}`} data-brand="rainbet">
      <span className="pack-edge" aria-hidden="true" />
      <div className="pack-shell">
        <div className="pack-lid">
          <span className="pack-notch" aria-hidden="true" />
          <span>Collectible cards</span>
        </div>
        <div ref={mouthRef} className="pack-mouth" aria-hidden="true">
          {Array.from({ length: Math.min(backs, 6) }, (_, index) => (
            <CardBack key={index} size="stack" className={`inside inside-${index}`} />
          ))}
        </div>
        <div className="pack-body">
          <span className="pack-sheen" aria-hidden="true" />
          <RainbetCrest />
          {bonus ? <span className="pack-ribbon">Bonus</span> : null}
          <strong className="pack-product">{product}</strong>
          <em className="pack-detail">{detail}</em>
          <span className="pack-foil" aria-hidden="true" />
          <span className="pack-foot">
            <span className="pack-wordmark">RAINBET</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function RainbetCrest() {
  return (
    <svg className="pack-crest" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.7" />
      <g fill="currentColor">
        <rect x="18" y="18" width="16" height="26" rx="2" transform="rotate(-18 26 31)" opacity="0.45" />
        <rect x="30" y="16" width="16" height="28" rx="2" transform="rotate(16 38 30)" opacity="0.7" />
        <rect x="24" y="14" width="16" height="32" rx="2.2" />
      </g>
    </svg>
  );
}
