import { MICRO } from "./config";
import type { StackState } from "./types";

export function stackSum(stack: Pick<StackState, "cards">): bigint {
  return stack.cards.reduce<bigint>((sum, card) => sum + card.valueMicros, 0n);
}

/** Sum of the stack's cards times every purple boost that landed on it. */
export function stackTotal(stack: StackState): bigint {
  return stackSum(stack) * BigInt(stack.factor);
}

export function boardTotal(stacks: readonly StackState[]): bigint {
  return stacks.reduce<bigint>((sum, stack) => sum + stackTotal(stack), 0n);
}

export function payoutMicros(stakeCredits: number, multiplierMicros: bigint): bigint {
  if (!Number.isInteger(stakeCredits) || stakeCredits <= 0) {
    throw new Error("Stake must be a positive integer number of demo credits");
  }
  if (multiplierMicros < 0n) {
    throw new Error("Multiplier cannot be negative");
  }
  return BigInt(stakeCredits) * multiplierMicros;
}

/** Round half away from zero to the nearest 0.01 and render. */
export function formatMicros(micros: bigint, suffix = ""): string {
  const negative = micros < 0n;
  let hundredths = (negative ? -micros : micros) / 10_000n;
  const remainder = (negative ? -micros : micros) % 10_000n;
  if (remainder * 2n >= 10_000n) hundredths += 1n;
  const whole = hundredths / 100n;
  const cents = hundredths % 100n;
  return `${negative ? "-" : ""}${whole}.${cents.toString().padStart(2, "0")}${suffix}`;
}

export function formatMultiplier(micros: bigint): string {
  return formatMicros(micros, "×");
}

export function creditsToMicros(credits: number): bigint {
  if (!Number.isInteger(credits)) {
    throw new Error("Demo credits must be whole numbers");
  }
  return BigInt(credits) * MICRO;
}

/** Plain multiplier number (e.g. 0.31) to micros, rounded to the nearest cent. */
export function valueToMicros(value: number): bigint {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Card value must be a non-negative number");
  }
  return BigInt(Math.round(value * 100)) * 10_000n;
}
