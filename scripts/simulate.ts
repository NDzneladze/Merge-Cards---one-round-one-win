/**
 * Per-difficulty simulation of the v0.8 DEMO placeholders.
 *
 *   npm run simulate            # 50 000 rounds per mode
 *   npm run simulate -- 100000  # custom sample size
 *
 * Grey and Full Stack make every v0.7 sample invalid. The numbers below are
 * a demo simulation of the current knobs, not a certified RTP.
 */
import { DIFFICULTIES, DIFFICULTY_ORDER, FULL_STACK_COUNT, GREEN_VALUES, MICRO, WIN_TIERS } from "../src/engine/config";
import { formatMultiplier } from "../src/engine/money";
import { resolveRound } from "../src/engine/round";
import { buildTimeline } from "../src/playback/scene";
import { delayFor } from "../src/playback/timing";
import type { Difficulty, RoundResult } from "../src/engine/types";

const rounds = Number(process.argv[2] ?? 50_000);
const celebrateFrom = WIN_TIERS[WIN_TIERS.length - 1]!.minMicros;
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
  celebrated: number;
  packs: Record<number, number>;
  openedSum: number;
  openedMax: number;
  earned: number;
  roundsWithBonus: number;
  greyCards: number;
  fullStackTriggered: number;
  fullStackPaid: number;
  purpleStackCombo: number;
  purpleStackPaid: number;
  max: bigint;
  maxSeed: string;
  stackSeed: string;
  purpleStackSeed: string;
  samples: number[];
  durationMs: number;
};

function hadFullStack(result: RoundResult): boolean {
  return result.events.some((event) => event.type === "full_stack");
}

function hadPurpleOnStackedPile(result: RoundResult): boolean {
  const stacked = new Set(
    result.events.flatMap((event) => (event.type === "full_stack" ? [event.color] : [])),
  );
  return result.events.some((event) => event.type === "boost" && stacked.has(event.color));
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
    celebrated: 0,
    packs: {},
    openedSum: 0,
    openedMax: 0,
    earned: 0,
    roundsWithBonus: 0,
    greyCards: 0,
    fullStackTriggered: 0,
    fullStackPaid: 0,
    purpleStackCombo: 0,
    purpleStackPaid: 0,
    max: 0n,
    maxSeed: "",
    stackSeed: "",
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
    if (result.multiplierMicros >= celebrateFrom) stats.celebrated += 1;
    stats.packs[result.openedPacks] = (stats.packs[result.openedPacks] ?? 0) + 1;
    stats.openedSum += result.openedPacks;
    if (result.openedPacks > stats.openedMax) stats.openedMax = result.openedPacks;
    stats.earned += result.earnedPacks;
    if (result.earnedPacks > 0) stats.roundsWithBonus += 1;
    stats.greyCards += result.greyCards;
    const stacked = hadFullStack(result);
    const combo = stacked && hadPurpleOnStackedPile(result);
    if (stacked) {
      stats.fullStackTriggered += 1;
      if (!stats.stackSeed) stats.stackSeed = seed;
    }
    if (combo) {
      stats.purpleStackCombo += 1;
      if (!stats.purpleStackSeed) stats.purpleStackSeed = seed;
    }
    if (result.fullStackPiles > 0) stats.fullStackPaid += 1;
    if (result.outcome === "resolved" && result.stacks.some((stack) => stack.fullStack && stack.factor > 1)) {
      stats.purpleStackPaid += 1;
    }
    if (result.multiplierMicros > stats.max) {
      stats.max = result.multiplierMicros;
      stats.maxSeed = seed;
    }
    if (i < 2_000) {
      stats.durationMs += buildTimeline(result.events).reduce((sum, step) => sum + delayFor(step.kind), 0);
    }
  }
  return stats;
}

const pct = (n: number, of = rounds): string => `${((100 * n) / of).toFixed(2)} %`;

function percentile(sorted: number[], p: number): string {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return `${sorted[index]!.toFixed(2)}×`;
}

const greenTotal = GREEN_VALUES.kind === "weighted" ? GREEN_VALUES.entries.reduce((sum, e) => sum + e.weight, 0) : 0;
const greenSmall = GREEN_VALUES.kind === "weighted" ? GREEN_VALUES.entries.filter((e) => e.valueMicros <= 200_000n).reduce((sum, e) => sum + e.weight, 0) : 0;
console.log(`Merge Packs v0.8 demo simulation · ${rounds.toLocaleString()} rounds per mode · stake 1`);
console.log(`Green ≤ 0.20×: ${pct(greenSmall, greenTotal)} of green cards. Full Stack at ${FULL_STACK_COUNT} value cards, once, ×2.`);
console.log("Exploratory mean hypothesis 0.94–0.96×. NOT a validated RTP. v0.7 samples do not apply.\n");

for (const difficulty of DIFFICULTY_ORDER) {
  const mode = DIFFICULTIES[difficulty];
  const s = simulate(difficulty);
  const mean = Number(s.sumMultiplier) / rounds / 1e6;
  const sorted = [...s.samples].sort((a, b) => a - b);
  const packLine = Object.entries(s.packs)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([packs, count]) => `${packs}: ${pct(count)}`)
    .join(" · ");
  console.log(`## ${mode.label} — ${mode.colors.join(" + ")}`);
  console.log(`weights  ${Object.entries(mode.weights).filter(([, w]) => w > 0).map(([k, w]) => `${k} ${(w / 10).toFixed(1)} %`).join(" · ")}`);
  console.log(`mean multiplier (demo return per 1 staked)         ${mean.toFixed(3)}×`);
  console.log(`bust (red, 0×)                                     ${pct(s.bust)}`);
  console.log(`safe 0× (no win, not a bust)                       ${pct(s.safeZero)}`);
  console.log(`safe sub-1× (return, payout > 0)                   ${pct(s.safeSub1)}`);
  console.log(`exactly 1×                                         ${pct(s.even)}`);
  console.log(`profitable hit (above 1×)                          ${pct(s.above1)}`);
  console.log(`≥ 10×                                              ${pct(s.atLeast10)}`);
  console.log(`≥ ${formatMultiplier(celebrateFrom)} celebration                                 ${pct(s.celebrated)}`);
  console.log(`rounds with ≥1 bonus pack                          ${pct(s.roundsWithBonus)}   (${(s.earned / rounds).toFixed(3)} earned per round)`);
  console.log(`grey cards per round                               ${(s.greyCards / rounds).toFixed(3)}`);
  console.log(`Full Stack triggered (incl. later bust)            ${pct(s.fullStackTriggered)}   seed ${s.stackSeed || "none"}`);
  console.log(`Full Stack still paid at settle                    ${pct(s.fullStackPaid)}`);
  console.log(`Purple on a Full Stack pile (incl. later bust)     ${pct(s.purpleStackCombo)}   seed ${s.purpleStackSeed || "none"}`);
  console.log(`Purple + Full Stack still paid                     ${pct(s.purpleStackPaid)}`);
  console.log(`packs opened                                       ${packLine}`);
  console.log(`mean / max opened packs                            ${(s.openedSum / rounds).toFixed(3)} / ${s.openedMax}`);
  console.log(`percentiles p50 p90 p99 p99.9                      ${percentile(sorted, 50)} · ${percentile(sorted, 90)} · ${percentile(sorted, 99)} · ${percentile(sorted, 99.9)}`);
  console.log(`max observed                                       ${formatMultiplier(s.max)} (${s.maxSeed})`);
  console.log(`avg round length, fixed tempo (first 2 000)        ${(s.durationMs / 2_000 / 1000).toFixed(1)} s\n`);
}
