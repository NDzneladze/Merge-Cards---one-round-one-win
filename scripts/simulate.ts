/**
 * Per-difficulty simulation of the DEMO placeholders.
 *
 *   npm run simulate            # 50 000 rounds per mode
 *   npm run simulate -- 200000  # custom sample size
 *
 * The output describes what the current knobs in `src/engine/config.ts` do.
 * It is a tuning aid for the prototype, not an RTP certification.
 */
import { DIFFICULTIES, DIFFICULTY_ORDER, GREEN_VALUES, MICRO, WIN_TIERS } from "../src/engine/config";
import { formatMultiplier } from "../src/engine/money";
import { resolveRound } from "../src/engine/round";
import { buildTimeline } from "../src/playback/scene";
import { delayFor } from "../src/playback/timing";
import type { Difficulty } from "../src/engine/types";

const rounds = Number(process.argv[2] ?? 50_000);
const celebrateFrom = WIN_TIERS[WIN_TIERS.length - 1]!.minMicros;

type Stats = {
  rounds: number;
  sumMultiplier: bigint;
  bust: number;
  below1: number;
  even: number;
  above1: number;
  celebrated: number;
  packs: Record<number, number>;
  earned: number;
  roundsWithBonus: number;
  max: bigint;
  maxSeed: string;
  durationMs: number;
};

function simulate(difficulty: Difficulty): Stats {
  const stats: Stats = {
    rounds,
    sumMultiplier: 0n,
    bust: 0,
    below1: 0,
    even: 0,
    above1: 0,
    celebrated: 0,
    packs: {},
    earned: 0,
    roundsWithBonus: 0,
    max: 0n,
    maxSeed: "",
    durationMs: 0,
  };
  for (let i = 0; i < rounds; i += 1) {
    const seed = `sim-${difficulty}-${i}`;
    const result = resolveRound({ seed, stake: 1, difficulty });
    stats.sumMultiplier += result.multiplierMicros;
    if (result.outcome === "bust") stats.bust += 1;
    else if (result.multiplierMicros < MICRO) stats.below1 += 1;
    else if (result.multiplierMicros === MICRO) stats.even += 1;
    else stats.above1 += 1;
    if (result.multiplierMicros >= celebrateFrom) stats.celebrated += 1;
    stats.packs[result.openedPacks] = (stats.packs[result.openedPacks] ?? 0) + 1;
    stats.earned += result.earnedPacks;
    if (result.earnedPacks > 0) stats.roundsWithBonus += 1;
    if (result.multiplierMicros > stats.max) {
      stats.max = result.multiplierMicros;
      stats.maxSeed = seed;
    }
    if (i < 2_000) {
      stats.durationMs += buildTimeline(result.events).reduce((sum, step) => sum + delayFor(step.kind, "1x"), 0);
    }
  }
  return stats;
}

const pct = (n: number, of = rounds): string => `${((100 * n) / of).toFixed(2)} %`;

const greenTotal = GREEN_VALUES.kind === "weighted" ? GREEN_VALUES.entries.reduce((sum, e) => sum + e.weight, 0) : 0;
const greenSmall = GREEN_VALUES.kind === "weighted" ? GREEN_VALUES.entries.filter((e) => e.valueMicros <= 200_000n).reduce((sum, e) => sum + e.weight, 0) : 0;
console.log(`Merge Packs demo placeholders · ${rounds.toLocaleString()} rounds per mode · stake 1`);
console.log(`Green ≤ 0.20×: ${pct(greenSmall, greenTotal)} of green cards. Celebration from ${formatMultiplier(celebrateFrom)}.`);
console.log("NOT a validated RTP. Numbers describe the current prototype knobs only.\n");

for (const difficulty of DIFFICULTY_ORDER) {
  const mode = DIFFICULTIES[difficulty];
  const s = simulate(difficulty);
  const mean = Number(s.sumMultiplier) / rounds / 1e6;
  const packLine = Object.entries(s.packs)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([packs, count]) => `${packs}: ${pct(count)}`)
    .join(" · ");
  console.log(`## ${mode.label} — ${mode.colors.join(" + ")}`);
  console.log(`weights  ${Object.entries(mode.weights).filter(([, w]) => w > 0).map(([k, w]) => `${k} ${(w / 10).toFixed(1)} %`).join(" · ")}`);
  console.log(`mean multiplier (placeholder return per 1 staked)  ${mean.toFixed(3)}×`);
  console.log(`bust (red, 0×)                                     ${pct(s.bust)}`);
  console.log(`safe but below 1× (net loss)                       ${pct(s.below1)}`);
  console.log(`exactly 1×                                         ${pct(s.even)}`);
  console.log(`above 1× (net win)                                 ${pct(s.above1)}`);
  console.log(`≥ ${formatMultiplier(celebrateFrom)} celebration                                 ${pct(s.celebrated)}`);
  console.log(`rounds with ≥1 bonus pack                          ${pct(s.roundsWithBonus)}   (${(s.earned / rounds).toFixed(3)} packs earned per round)`);
  console.log(`packs opened                                       ${packLine}`);
  console.log(`max observed                                       ${formatMultiplier(s.max)} (${s.maxSeed}) · worst 0.00× on every bust`);
  console.log(`avg round length at 1× (first 2 000 rounds)        ${(s.durationMs / 2_000 / 1000).toFixed(1)} s\n`);
}
