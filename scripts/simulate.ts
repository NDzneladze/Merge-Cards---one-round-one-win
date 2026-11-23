/**
 * Per-difficulty simulation of the current demo placeholders.
 *
 *   npm run simulate            # 50 000 rounds per mode
 *   npm run simulate -- 100000  # custom sample size
 *
 * Purple targets the pile with the most physical cards, Grey included.
 * Stack Bonus is a total factor: ×2 at 10 cards, ×4 at 20. The ×4 replaces ×2.
 * Demo simulation of the current knobs, not a certified RTP.
 */
import { DEMO_CONFIG_ID, DIFFICULTIES, DIFFICULTY_ORDER, FULL_STACK_COUNT, GREEN_VALUES, GREEN_VALUES_EASY, MICRO, SUPER_STACK_COUNT } from "../src/engine/config";
import { formatMultiplier } from "../src/engine/money";
import { resolveRound } from "../src/engine/round";
import { buildTimeline } from "../src/playback/scene";
import { roundDuration } from "../src/playback/timing";
import type { Difficulty, RoundEvent, RoundResult, StackColor } from "../src/engine/types";

const rounds = Number(process.argv[2] ?? 50_000);
const TEN = 10_000_000n;

type Stats = {
  rounds: number;
  sumMultiplier: bigint;
  bust: number;
  safeZero: number;
  safeSub1: number;
  even: number;
  above1: number;
  atLeast10: number;
  atLeast25: number;
  packs: Record<number, number>;
  openedSum: number;
  openedMax: number;
  earned: number;
  roundsWithBonus: number;
  greyCards: number;
  greyRounds1: number;
  greyRounds2: number;
  greyRounds3: number;
  tier10Triggered: number;
  tier20Triggered: number;
  tier10Paid: number;
  tier20Paid: number;
  greyTriggered10: number;
  greyTriggered20: number;
  purpleStackCombo: number;
  purpleStackPaid: number;
  purpleSuperPaid: number;
  max: bigint;
  maxSeed: string;
  stackSeed: string;
  superSeed: string;
  purpleStackSeed: string;
  samples: number[];
  durationMs: number;
};

function bonuses(result: RoundResult, threshold: number): Extract<RoundEvent, { type: "stack_bonus" }>[] {
  return result.events.filter((event): event is Extract<RoundEvent, { type: "stack_bonus" }> => event.type === "stack_bonus" && event.threshold === threshold);
}

function greyTriggered(result: RoundResult, threshold: number): boolean {
  const greyIds = new Set(result.events.flatMap((event) => (event.type === "grey" ? [event.cardId] : [])));
  return bonuses(result, threshold).some((event) => greyIds.has(event.cardId));
}

function purpleOn(result: RoundResult, colors: Set<StackColor>): boolean {
  return result.events.some((event) => event.type === "boost" && colors.has(event.color));
}

function simulate(difficulty: Difficulty): Stats {
  const stats: Stats = {
    rounds,
    sumMultiplier: 0n,
    bust: 0,
    safeZero: 0,
    safeSub1: 0,
    even: 0,
    above1: 0,
    atLeast10: 0,
    atLeast25: 0,
    packs: {},
    openedSum: 0,
    openedMax: 0,
    earned: 0,
    roundsWithBonus: 0,
    greyCards: 0,
    greyRounds1: 0,
    greyRounds2: 0,
    greyRounds3: 0,
    tier10Triggered: 0,
    tier20Triggered: 0,
    tier10Paid: 0,
    tier20Paid: 0,
    greyTriggered10: 0,
    greyTriggered20: 0,
    purpleStackCombo: 0,
    purpleStackPaid: 0,
    purpleSuperPaid: 0,
    max: 0n,
    maxSeed: "",
    stackSeed: "",
    superSeed: "",
    purpleStackSeed: "",
    samples: [],
    durationMs: 0,
  };
  for (let i = 0; i < rounds; i += 1) {
    const seed = `sim-${difficulty}-${i}`;
    const result = resolveRound({ seed, stake: 1, difficulty });
    stats.sumMultiplier += result.multiplierMicros;
    stats.samples.push(Number(result.multiplierMicros) / 1e6);
    if (result.outcome === "bust") stats.bust += 1;
    else if (result.multiplierMicros === 0n) stats.safeZero += 1;
    else if (result.multiplierMicros < MICRO) stats.safeSub1 += 1;
    else if (result.multiplierMicros === MICRO) stats.even += 1;
    else stats.above1 += 1;
    if (result.multiplierMicros >= TEN) stats.atLeast10 += 1;
    if (result.multiplierMicros >= 25_000_000n) stats.atLeast25 += 1;
    stats.packs[result.openedPacks] = (stats.packs[result.openedPacks] ?? 0) + 1;
    stats.openedSum += result.openedPacks;
    if (result.openedPacks > stats.openedMax) stats.openedMax = result.openedPacks;
    stats.earned += result.earnedPacks;
    if (result.earnedPacks > 0) stats.roundsWithBonus += 1;
    stats.greyCards += result.greyCards;
    if (result.greyCards >= 1) stats.greyRounds1 += 1;
    if (result.greyCards >= 2) stats.greyRounds2 += 1;
    if (result.greyCards >= 3) stats.greyRounds3 += 1;
    const hit10 = bonuses(result, FULL_STACK_COUNT);
    const hit20 = bonuses(result, SUPER_STACK_COUNT);
    if (hit10.length > 0) {
      stats.tier10Triggered += 1;
      if (!stats.stackSeed) stats.stackSeed = seed;
      if (greyTriggered(result, FULL_STACK_COUNT)) stats.greyTriggered10 += 1;
    }
    if (hit20.length > 0) {
      stats.tier20Triggered += 1;
      if (!stats.superSeed) stats.superSeed = seed;
      if (greyTriggered(result, SUPER_STACK_COUNT)) stats.greyTriggered20 += 1;
    }
    if (result.stackBonusPiles > 0) stats.tier10Paid += 1;
    if (result.superStackPiles > 0) stats.tier20Paid += 1;
    const stackedColors = new Set(hit10.map((event) => event.color));
    const combo = stackedColors.size > 0 && purpleOn(result, stackedColors);
    if (combo) {
      stats.purpleStackCombo += 1;
      if (!stats.purpleStackSeed) stats.purpleStackSeed = seed;
    }
    if (result.outcome === "resolved" && result.stacks.some((stack) => stack.stackBonusFactor >= 2 && stack.factor > 1)) {
      stats.purpleStackPaid += 1;
    }
    if (result.outcome === "resolved" && result.stacks.some((stack) => stack.stackBonusFactor >= 4 && stack.factor > 1)) {
      stats.purpleSuperPaid += 1;
    }
    if (result.multiplierMicros > stats.max) {
      stats.max = result.multiplierMicros;
      stats.maxSeed = seed;
    }
    if (i < 2_000) stats.durationMs += roundDuration(buildTimeline(result.events));
  }
  return stats;
}

const pct = (n: number, of = rounds): string => `${((100 * n) / of).toFixed(2)} %`;

function percentile(sorted: number[], p: number): string {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return `${sorted[index]!.toFixed(2)}×`;
}

const smallShare = (table: typeof GREEN_VALUES): string => {
  if (table.kind !== "weighted") return "n/a";
  const total = table.entries.reduce((sum, entry) => sum + entry.weight, 0);
  const small = table.entries.filter((entry) => entry.valueMicros <= 200_000n).reduce((sum, entry) => sum + entry.weight, 0);
  return pct(small, total);
};

console.log(`Merge Packs demo simulation · ${DEMO_CONFIG_ID} · ${rounds.toLocaleString()} rounds per mode · stake 1`);
console.log(`Seeds sim-{easy|medium|hard}-0 … sim-…-${rounds - 1}. Purple targets the biggest physical pile, Grey included.`);
console.log(
  `Green ≤ 0.20×: Easy ${smallShare(GREEN_VALUES_EASY)}, Medium ${smallShare(GREEN_VALUES)}. Stack Bonus is a total factor: ×2 at ${FULL_STACK_COUNT}, ×4 at ${SUPER_STACK_COUNT} (replaces ×2, never ×8).`,
);
console.log("Placeholder math. NOT a validated RTP.\n");

for (const difficulty of DIFFICULTY_ORDER) {
  const mode = DIFFICULTIES[difficulty];
  const s = simulate(difficulty);
  const mean = Number(s.sumMultiplier) / rounds / 1e6;
  const variance = s.samples.reduce((sum, sample) => sum + (sample - mean) ** 2, 0) / Math.max(1, rounds - 1);
  const standardError = Math.sqrt(variance / rounds);
  const sorted = [...s.samples].sort((a, b) => a - b);
  const packLine = Object.entries(s.packs)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([packs, count]) => `${packs}: ${pct(count)}`)
    .join(" · ");
  console.log(`## ${mode.label} — ${mode.colors.join(" + ")}`);
  console.log(`weights  ${Object.entries(mode.weights).filter(([, w]) => w > 0).map(([k, w]) => `${k} ${(w / 10).toFixed(1)} %`).join(" · ")}`);
  console.log(`mean multiplier (demo return per 1 staked)         ${mean.toFixed(4)}×`);
  console.log(`standard error of that mean                        ±${standardError.toFixed(4)}×   (~95% ${(mean - 1.96 * standardError).toFixed(4)}–${(mean + 1.96 * standardError).toFixed(4)}×)`);
  console.log(`bust (red, 0×)                                     ${pct(s.bust)}`);
  console.log(`safe 0× (no win, not a bust)                       ${pct(s.safeZero)}`);
  console.log(`safe sub-1× (return, payout > 0)                   ${pct(s.safeSub1)}`);
  console.log(`exactly 1×                                         ${pct(s.even)}`);
  console.log(`profitable hit (above 1×)                          ${pct(s.above1)}`);
  console.log(`≥ 10×                                              ${pct(s.atLeast10)}`);
  console.log(`≥ 25×                                              ${pct(s.atLeast25)}`);
  console.log(`rounds with ≥1 bonus pack                          ${pct(s.roundsWithBonus)}   (${(s.earned / rounds).toFixed(3)} earned per round)`);
  console.log(`grey cards per round / per opened pack            ${(s.greyCards / rounds).toFixed(3)} / ${(s.greyCards / s.openedSum).toFixed(3)}`);
  console.log(`rounds with ≥1 / ≥2 / ≥3 greys                     ${pct(s.greyRounds1)} · ${pct(s.greyRounds2)} · ${pct(s.greyRounds3)}`);
  console.log(`Stack ×2 triggered (incl. later bust)              ${pct(s.tier10Triggered)}   seed ${s.stackSeed || "none"}`);
  console.log(`  … where a grey was the 10th card                 ${pct(s.greyTriggered10)}`);
  console.log(`Stack ×2 still paid at settle                      ${pct(s.tier10Paid)}`);
  console.log(`Stack ×4 triggered (incl. later bust)              ${pct(s.tier20Triggered)}   seed ${s.superSeed || "none"}`);
  console.log(`  … where a grey was the 20th card                 ${pct(s.greyTriggered20)}`);
  console.log(`Stack ×4 still paid at settle                      ${pct(s.tier20Paid)}`);
  console.log(`Purple on a Stack pile (incl. later bust)          ${pct(s.purpleStackCombo)}   seed ${s.purpleStackSeed || "none"}`);
  console.log(`Purple + Stack ×2 still paid                       ${pct(s.purpleStackPaid)}`);
  console.log(`Purple + Stack ×4 still paid                       ${pct(s.purpleSuperPaid)}`);
  console.log(`packs opened                                       ${packLine}`);
  console.log(`mean / max opened packs                            ${(s.openedSum / rounds).toFixed(3)} / ${s.openedMax}`);
  console.log(`percentiles p50 p90 p99 p99.9                      ${percentile(sorted, 50)} · ${percentile(sorted, 90)} · ${percentile(sorted, 99)} · ${percentile(sorted, 99.9)}`);
  console.log(`max observed                                       ${formatMultiplier(s.max)} (${s.maxSeed})`);
  console.log(`avg round length, fixed tempo (first 2 000)        ${(s.durationMs / Math.min(2_000, rounds) / 1000).toFixed(1)} s\n`);
}
