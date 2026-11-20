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
 * Foil booster in the same navy-and-gold language as the card backs.
 * The flap is a real lid. Cards leave through the mouth. The wordmark is set
 * in type because the repo has no Rainbet logo file.
 */
export function PackArt({ bonus, sealed = false, product, detail, cardsLeft = 0, mouthRef }: Props) {
  const backs = sealed ? 0 : cardsLeft;
  return (
    <div className={`pack-art ${bonus ? "is-bonus" : ""} ${sealed ? "is-sealed" : ""}`} data-brand="rainbet">
      <span className="pack-edge" aria-hidden="true" />
      <span className="pack-edge pack-edge-right" aria-hidden="true" />
      <div className="pack-shell">
        <div className="pack-lid">
          <span className="pack-notch" aria-hidden="true" />
        </div>
        <div ref={mouthRef} className="pack-mouth" aria-hidden="true">
          {Array.from({ length: Math.min(backs, 3) }, (_, index) => (
            <CardBack key={index} size="stack" className={`inside inside-${index}`} />
          ))}
        </div>
        <div className="pack-body">
          <span className="pack-sheen" aria-hidden="true" />
          <PackCrest />
          {bonus ? <span className="pack-ribbon">Bonus</span> : null}
          <strong className="pack-product">{product}</strong>
          <em className="pack-detail">{detail}</em>
          <span className="pack-foil" aria-hidden="true" />
          <span className="pack-foot">
            <span className="pack-wordmark">RAINBET</span>
          </span>
          <span className="pack-crimp" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function PackCrest() {
  return (
    <svg className="pack-crest" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      <rect x="6" y="8" width="22" height="28" rx="3" fill="#d7e4f8" transform="rotate(-12 17 22)" />
      <rect x="22" y="6" width="22" height="30" rx="3" fill="#f6f1e4" transform="rotate(8 33 21)" />
      <rect x="21" y="5" width="22" height="30" rx="3" fill="none" stroke="#e6c36a" strokeWidth="1.2" transform="rotate(8 32 20)" />
      <path fill="#e6c36a" d="M32 12.2 33.4 16l4.2.3-3.2 2.5 1.1 4-3.5-2.2-3.5 2.2 1.1-4L28.4 16.3 32.6 16 32 12.2Z" />
    </svg>
  );
}
