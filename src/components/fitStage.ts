/**
 * Sizes the card table from the real stage box.
 *
 * The table is the hero. Cards grow until the play area's height stops them,
 * so a tall or wide screen gets large piles instead of empty felt. The gap
 * between piles scales with the card, which spreads the row across the width.
 */

export const PEEK_EDGES = 4;
export const VISIBLE_FACES = PEEK_EDGES + 1;

/** Packs drawn as physical wrappers under the active one. A +N chip carries the exact count. */
export const QUEUE_LAYERS = 3;

const EDGE_RATIO = 0.11;
/** Booster wrapper: a touch taller than wide, close to square. */
const PACK_ASPECT = 0.94;

export type FitInput = {
  /** Width inside the stage padding. The left rail is already outside this. */
  stageWidth: number;
  /** Height of the play area under the HUD and caption. */
  actionHeight: number;
  piles: number;
  narrow: boolean;
  short: boolean;
};

export type StageFit = {
  card: number;
  gap: number;
  peek: number;
  /** Space between the pile row and the pack. */
  rowGap: number;
  /** Offset of each queued pack from the one above it. */
  queueDx: number;
  queueDy: number;
  cluster: number;
  /** Pile-row width divided by the card-table width. */
  occupancy: number;
  packW: number;
  packH: number;
};

export function packHeightRatio(narrow: boolean, short: boolean): number {
  if (narrow) return 0.9;
  if (short) return 0.86;
  return 0.98;
}

/** Pile gap as a share of the card width. Two piles sit further apart than three. */
export function gapRatio(narrow: boolean, piles: number): number {
  if (narrow) return 0.09;
  return piles <= 2 ? 0.34 : 0.24;
}

export function queueStep(card: number): { dx: number; dy: number } {
  return { dx: Math.round(card * 0.13), dy: Math.max(6, Math.round(card * 0.055)) };
}

/** Vertical space the piles, the four peek edges and the pack stack need. */
export function contentHeight(card: number, packRatio: number): number {
  const peek = Math.max(12, Math.round(card * EDGE_RATIO));
  const cardH = card * 1.4;
  const edges = PEEK_EDGES * peek;
  const tag = Math.max(22, Math.round(card * 0.13));
  const footer = Math.max(58, Math.round(card * 0.32));
  const rowGap = Math.max(10, Math.round(card * 0.06));
  const thickness = 14;
  const packStack = Math.round(card * packRatio) + QUEUE_LAYERS * queueStep(card).dy;
  return tag + cardH + edges + thickness + footer + rowGap + packStack;
}

export function fitStage(input: FitInput): StageFit {
  const { stageWidth, actionHeight, piles, narrow, short } = input;
  const count = Math.max(1, piles);
  const ratio = gapRatio(narrow, count);
  const fraction = narrow ? 0.96 : 0.88;
  const packRatio = packHeightRatio(narrow, short);
  const widthCap = (stageWidth * fraction) / (count + ratio * (count - 1));
  const hardCap = narrow ? 118 : count <= 2 ? 300 : 280;
  const ceiling = Math.max(72, Math.floor(Math.min(widthCap, hardCap)));

  let card = 72;
  if (stageWidth >= 80 && actionHeight >= 80) {
    for (let size = ceiling; size >= 72; size -= 1) {
      if (contentHeight(size, packRatio) <= actionHeight) {
        card = size;
        break;
      }
    }
  }

  const gap = Math.round(card * ratio);
  const peek = Math.max(12, Math.round(card * EDGE_RATIO));
  const cluster = Math.round(card * count + gap * Math.max(0, count - 1));
  const occupancy = stageWidth > 0 ? cluster / stageWidth : 0;
  const packH = Math.round(card * packRatio);
  const { dx, dy } = queueStep(card);
  return {
    card,
    gap,
    peek,
    rowGap: Math.max(10, Math.round(card * 0.06)),
    queueDx: dx,
    queueDy: dy,
    cluster,
    occupancy,
    packW: Math.round(packH * PACK_ASPECT),
    packH,
  };
}
