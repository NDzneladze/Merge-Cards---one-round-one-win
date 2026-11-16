import { KIND_ORDER, type ValueDistribution, type Weights } from "./config";
import type { Rng } from "./rng";
import type { CardKind } from "./types";

export function weightTotal(weights: Weights): number {
  return KIND_ORDER.reduce((sum, kind) => sum + weights[kind], 0);
}

/** Draw one card kind by weight, in `KIND_ORDER`. Zero-weight kinds never appear. */
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

export function rangeSteps(range: Extract<ValueDistribution, { kind: "uniform" }>): number {
  if (range.stepMicros <= 0n || range.maxMicros < range.minMicros) {
    throw new Error("Invalid value range");
  }
  return Number((range.maxMicros - range.minMicros) / range.stepMicros) + 1;
}

export function tableWeight(table: Extract<ValueDistribution, { kind: "weighted" }>): number {
  const total = table.entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) throw new Error("Empty value table");
  return total;
}

/** Smallest and largest value the distribution can produce. */
export function valueBounds(distribution: ValueDistribution): { minMicros: bigint; maxMicros: bigint } {
  if (distribution.kind === "uniform") return { minMicros: distribution.minMicros, maxMicros: distribution.maxMicros };
  const values = distribution.entries.map((entry) => entry.valueMicros);
  return {
    minMicros: values.reduce((min, value) => (value < min ? value : min)),
    maxMicros: values.reduce((max, value) => (value > max ? value : max)),
  };
}

/** Every value the distribution can produce, ascending. */
export function valueSupport(distribution: ValueDistribution): bigint[] {
  if (distribution.kind === "weighted") {
    return [...new Set(distribution.entries.map((entry) => entry.valueMicros))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }
  const out: bigint[] = [];
  for (let value = distribution.minMicros; value <= distribution.maxMicros; value += distribution.stepMicros) out.push(value);
  return out;
}

/** One card value: uniform on the grid, or by denomination weight. */
export function drawValue(rng: Rng, distribution: ValueDistribution): bigint {
  if (distribution.kind === "uniform") {
    const steps = rangeSteps(distribution);
    return distribution.minMicros + distribution.stepMicros * BigInt(rng.nextInt(steps));
  }
  let roll = rng.nextInt(tableWeight(distribution));
  for (const entry of distribution.entries) {
    if (entry.weight <= 0) continue;
    if (roll < entry.weight) return entry.valueMicros;
    roll -= entry.weight;
  }
  return distribution.entries[distribution.entries.length - 1]!.valueMicros;
}
