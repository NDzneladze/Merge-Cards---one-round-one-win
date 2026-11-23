import { KIND_ORDER, type ValueRange, type Weights } from "./config";
import type { Rng } from "./rng";
import type { CardKind } from "./types";

export function weightTotal(weights: Weights): number {
  return KIND_ORDER.reduce((sum, kind) => sum + weights[kind], 0);
}

/** Draw one card kind by weight, in `KIND_ORDER`. */
export function drawKind(rng: Rng, weights: Weights): CardKind {
  const total = weightTotal(weights);
  if (total <= 0) {
    throw new Error("No card weights");
  }
  let roll = rng.nextInt(total);
  for (const kind of KIND_ORDER) {
    const weight = weights[kind];
    if (weight <= 0) continue;
    if (roll < weight) return kind;
    roll -= weight;
  }
  return KIND_ORDER[KIND_ORDER.length - 1]!;
}

export function rangeSteps(range: ValueRange): number {
  if (range.stepMicros <= 0n || range.maxMicros < range.minMicros) {
    throw new Error("Invalid value range");
  }
  return Number((range.maxMicros - range.minMicros) / range.stepMicros) + 1;
}

/** Uniform value on the range's step grid, inclusive of both ends. */
export function drawValue(rng: Rng, range: ValueRange): bigint {
  const steps = rangeSteps(range);
  return range.minMicros + range.stepMicros * BigInt(rng.nextInt(steps));
}
