import { TOKEN_ORDER, type Weights } from "./config";
import type { Rng } from "./rng";
import type { Token } from "./types";

export function eligibleWeights(
  allowExtra: boolean,
  weights: Weights,
): { token: Token; weight: number }[] {
  return TOKEN_ORDER.filter((token) => allowExtra || token !== "extra_pack")
    .map((token) => ({ token, weight: weights[token] }))
    .filter((entry) => entry.weight > 0);
}

export function weightTotal(pool: { weight: number }[]): number {
  return pool.reduce((sum, entry) => sum + entry.weight, 0);
}

/**
 * Draw one token. Extra Pack is absent from the pool when `allowExtra` is false,
 * so a card that cannot grant a pack is never produced.
 */
export function drawToken(rng: Rng, allowExtra: boolean, weights: Weights): Token {
  const pool = eligibleWeights(allowExtra, weights);
  const total = weightTotal(pool);
  if (total <= 0) {
    throw new Error("No eligible card weights");
  }
  let roll = rng.nextInt(total);
  for (const entry of pool) {
    if (roll < entry.weight) return entry.token;
    roll -= entry.weight;
  }
  const last = pool[pool.length - 1];
  if (!last) throw new Error("Empty draw pool");
  return last.token;
}
