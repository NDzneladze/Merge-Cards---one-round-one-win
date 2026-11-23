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

const TEETH = 13;

/** Saw-tooth edge of a heat-sealed foil wrapper. `up` puts the teeth on the top edge. */
function crimpPath(up: boolean): string {
  const points: string[] = [];
  const flat = up ? "100%" : "0%";
  const tip = up ? "0%" : "100%";
  const root = up ? "34%" : "66%";
  points.push(`0% ${flat}`);
  for (let tooth = 0; tooth < TEETH; tooth += 1) {
    const left = (tooth / TEETH) * 100;
    const mid = ((tooth + 0.5) / TEETH) * 100;
    points.push(`${left.toFixed(2)}% ${root}`, `${mid.toFixed(2)}% ${tip}`);
  }
  points.push(`100% ${root}`, `100% ${flat}`);
  return `polygon(${points.join(", ")})`;
}

const CRIMP_TOP = crimpPath(true);
const CRIMP_BOTTOM = crimpPath(false);

/**
 * Foil booster wrapper, close to square, in the navy-and-gold language of
 * the card backs. Crimped seals top and bottom, a struck medallion, the
 * product title and the Rainbet band. The top seal is the lid: it folds
 * back and the cards leave through the mouth. The wordmark is set in type
 * because the repo has no Rainbet logo file.
 */
export function PackArt({ bonus, sealed = false, product, detail, cardsLeft = 0, mouthRef }: Props) {
  const backs = sealed ? 0 : cardsLeft;
  return (
    <div className={`pack-art ${bonus ? "is-bonus" : ""} ${sealed ? "is-sealed" : ""}`} data-brand="rainbet">
      <div className="pack-shell">
        <div className="pack-lid" style={{ clipPath: CRIMP_TOP }}>
          <span className="pack-lid-foil" aria-hidden="true" />
        </div>
        <div ref={mouthRef} className="pack-mouth" aria-hidden="true">
          {Array.from({ length: Math.min(backs, 3) }, (_, index) => (
            <CardBack key={index} size="stack" className={`inside inside-${index}`} />
          ))}
        </div>
        <div className="pack-body">
          <span className="pack-foil" aria-hidden="true" />
          <span className="pack-frame" aria-hidden="true" />
          {bonus ? <span className="pack-ribbon">Bonus</span> : null}
          <PackEmblem />
          <strong className="pack-product">{product}</strong>
          <em className="pack-detail">{detail}</em>
          <span className="pack-foot">
            <span className="pack-wordmark">RAINBET</span>
          </span>
          <span className="pack-sheen" aria-hidden="true" />
        </div>
        <div className="pack-crimp" style={{ clipPath: CRIMP_BOTTOM }} aria-hidden="true" />
      </div>
    </div>
  );
}

/** Struck medallion: two fanned cards and a star inside a beaded ring. Original mark, not a logo. */
function PackEmblem() {
  return (
    <svg className="pack-emblem" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <circle cx="40" cy="40" r="37" fill="#0b1426" stroke="#e6c36a" strokeWidth="1.6" />
      <circle cx="40" cy="40" r="32.5" fill="none" stroke="#e6c36a" strokeWidth="0.9" strokeDasharray="1.2 2.6" strokeLinecap="round" />
      <rect x="19" y="24" width="24" height="33" rx="3.2" fill="#9fc2f2" transform="rotate(-15 31 40.5)" />
      <rect x="19" y="24" width="24" height="33" rx="3.2" fill="none" stroke="#0b1426" strokeWidth="1" transform="rotate(-15 31 40.5)" />
      <rect x="37" y="22" width="24" height="33" rx="3.2" fill="#9fe0bd" transform="rotate(13 49 38.5)" />
      <rect x="37" y="22" width="24" height="33" rx="3.2" fill="none" stroke="#0b1426" strokeWidth="1" transform="rotate(13 49 38.5)" />
      <rect x="28" y="20" width="24" height="34" rx="3.2" fill="#fbf4df" stroke="#a37b22" strokeWidth="1.2" />
      <path fill="#e2b340" stroke="#8a5a10" strokeWidth="0.8" d="M40 26.5 43 33.6l7.6.6-5.8 4.9 1.8 7.4L40 42.6l-6.6 3.9 1.8-7.4-5.8-4.9 7.6-.6L40 26.5Z" />
    </svg>
  );
}
