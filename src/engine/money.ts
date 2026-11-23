import { LEVEL_MICROS, MICRO } from "./config";

export function levelMicros(level: number): bigint {
  const value = LEVEL_MICROS[level];
  if (value === undefined) {
    throw new Error(`Invalid card level ${level}`);
  }
  return value;
}

export function sumLevels(levels: readonly number[]): bigint {
  return levels.reduce<bigint>((sum, level) => sum + levelMicros(level), 0n);
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
