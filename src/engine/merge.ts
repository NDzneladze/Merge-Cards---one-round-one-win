import type { ColorCard } from "./types";

export type MergeStep = {
  removed: [string, string];
  created: ColorCard;
};

function byId(a: ColorCard, b: ColorCard): number {
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Pair the oldest card that has a same-color, same-level partner below max level
 * with that partner's oldest id. Repeat until no pair remains.
 */
export function findOldestPair(
  board: readonly ColorCard[],
  maxLevel: number,
): [ColorCard, ColorCard] | null {
  const sorted = [...board].sort(byId);
  for (let i = 0; i < sorted.length; i += 1) {
    const first = sorted[i];
    if (!first || first.level >= maxLevel) continue;
    const partner = sorted
      .slice(i + 1)
      .find((card) => card.color === first.color && card.level === first.level);
    if (partner) return [first, partner];
  }
  return null;
}

export function resolveMerges(
  board: readonly ColorCard[],
  maxLevel: number,
  nextId: () => string,
): { board: ColorCard[]; merges: MergeStep[] } {
  let current = [...board];
  const merges: MergeStep[] = [];
  let pair = findOldestPair(current, maxLevel);
  while (pair) {
    const [left, right] = pair;
    const created: ColorCard = {
      kind: "color",
      id: nextId(),
      color: left.color,
      level: left.level + 1,
    };
    if (created.level > maxLevel) {
      throw new Error("Merge produced a level above the configured maximum");
    }
    current = current.filter((card) => card.id !== left.id && card.id !== right.id);
    current.push(created);
    merges.push({ removed: [left.id, right.id], created });
    pair = findOldestPair(current, maxLevel);
  }
  return { board: current, merges };
}
