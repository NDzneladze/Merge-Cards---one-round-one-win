/**
 * Sizes the card table from the real stage box.
 * The cluster (piles, not the felt) is aimed at roughly three quarters of
 * the table width. Height can pull that back on a short screen, but the
 * cards stay large enough to read.
 */

export const PEEK_EDGES = 4;
export const VISIBLE_FACES = PEEK_EDGES + 1;

const EDGE_RATIO = 0.11;

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
  lip: number;
  cluster: number;
  /** Pile-row width divided by the card-table width. */
  occupancy: number;
  legend: boolean;
  packW: number;
  packH: number;
};

export function packHeightRatio(narrow: boolean, short: boolean, piles: number): number {
  if (narrow) return 0.9;
  if (short) return 0.8;
  if (piles === 2) return 0.78;
  return 0.96;
}

/** Vertical space the piles, the four peek edges and the pack stack need. */
export function contentHeight(card: number, packRatio: number, lip: number): number {
  const peek = Math.max(12, Math.round(card * EDGE_RATIO));
  const cardH = card * 1.4;
  const edges = PEEK_EDGES * peek;
  const tag = 22;
  const footer = 26;
  const gap = 10;
  const thickness = 14;
  const packStack = Math.round(card * packRatio) + lip * 2;
  return tag + cardH + edges + thickness + footer + gap + packStack;
}

export function fitStage(input: FitInput): StageFit {
  const { stageWidth, actionHeight, piles, narrow, short } = input;
  const count = Math.max(1, piles);
  const gap = narrow ? 10 : count === 2 ? 44 : 26;
  const fraction = narrow ? 0.94 : count === 2 ? 0.72 : 0.74;
  const lip = 8;
  const packRatio = packHeightRatio(narrow, short, count);
  const widthCap = (stageWidth * fraction - gap * Math.max(0, count - 1)) / count;
  const hardCap = narrow ? 115 : count === 2 ? 260 : short ? 188 : 184;
  const ceiling = Math.max(72, Math.floor(Math.min(widthCap, hardCap)));

  let card = 72;
  if (stageWidth >= 80 && actionHeight >= 80) {
    for (let size = ceiling; size >= 72; size -= 1) {
      if (contentHeight(size, packRatio, lip) <= actionHeight) {
        card = size;
        break;
      }
    }
  }

  const peek = Math.max(12, Math.round(card * EDGE_RATIO));
  const cluster = Math.round(card * count + gap * Math.max(0, count - 1));
  const occupancy = stageWidth > 0 ? cluster / stageWidth : 0;
  const gutter = (stageWidth - cluster) / 2;
  return {
    card,
    gap,
    peek,
    lip,
    cluster,
    occupancy,
    legend: !narrow && gutter >= 150,
    packW: Math.round(card * 1.12),
    packH: Math.round(card * packRatio),
  };
}
