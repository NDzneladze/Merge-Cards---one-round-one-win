import { useEffect, useMemo, useRef, useState } from "react";
import { playCue, resumeAudio } from "./audio";
import { BetPanel } from "./components/BetPanel";
import { InfoModal } from "./components/InfoModal";
import { PackStage } from "./components/PackStage";
import { DEFAULT_STAKE, MICRO, STARTING_BALANCE_CREDITS } from "./engine/config";
import { creditsToMicros, formatMicros } from "./engine/money";
import { createRoundSeed } from "./engine/rng";
import { resolveRound } from "./engine/round";
import type { RoundResult } from "./engine/types";
import { buildTimeline, initialScene, reduceSteps, type Step } from "./playback/scene";
import { delayFor, type PlaybackSpeed } from "./playback/timing";
import "./styles.css";

const BALANCE_KEY = "merge-packs-demo-balance-v1";

type ActiveRound = {
  playId: string;
  result: RoundResult;
  steps: Step[];
};

function readBalance(): bigint {
  try {
    const stored = sessionStorage.getItem(BALANCE_KEY);
    if (!stored || !/^\d+$/.test(stored)) return creditsToMicros(STARTING_BALANCE_CREDITS);
    return BigInt(stored);
  } catch {
    return creditsToMicros(STARTING_BALANCE_CREDITS);
  }
}

function writeBalance(balance: bigint): void {
  try {
    sessionStorage.setItem(BALANCE_KEY, balance.toString());
  } catch {
    // Demo balance is disposable.
  }
}

function cueFor(step: Step): Parameters<typeof playCue>[0] | null {
  switch (step.kind) {
    case "pack_open":
      return "pack";
    case "eject":
      return "flip";
    case "merge_pop":
      return "merge";
    case "pack_earned":
      return "extra";
    case "skull_strike":
      return "skull";
    case "settle":
      return step.outcome === "loss" ? "lose" : step.multiplierMicros > 0n ? "win" : "lose";
    default:
      return null;
  }
}

export function App() {
  const [balance, setBalance] = useState(readBalance);
  const [stake, setStake] = useState(DEFAULT_STAKE);
  const [speed, setSpeed] = useState<PlaybackSpeed>("1x");
  const [seed, setSeed] = useState("");
  const [muted, setMuted] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [round, setRound] = useState<ActiveRound | null>(null);
  const [applied, setApplied] = useState(0);
  const sounded = useRef("");

  const playId = round?.playId;
  const [trackedId, setTrackedId] = useState(playId);
  if (playId !== trackedId) {
    setTrackedId(playId);
    setApplied(0);
  }

  const total = round?.steps.length ?? 0;
  const done = Boolean(round) && total > 0 && applied >= total;
  const playing = Boolean(round) && !done;

  useEffect(() => {
    if (!round || applied >= total) return;
    if (speed === "instant") {
      setApplied(total);
      return;
    }
    const step = round.steps[applied];
    if (!step) return;
    const timer = window.setTimeout(() => setApplied((current) => current + 1), delayFor(step.kind, speed));
    return () => window.clearTimeout(timer);
  }, [round, applied, speed, total]);

  useEffect(() => {
    if (!round || applied === 0) return;
    const token = `${round.playId}:${applied}:${speed}`;
    if (sounded.current === token) return;
    sounded.current = token;
    if (speed === "instant") {
      if (applied !== total) return;
      playCue(round.result.outcome === "loss" ? "skull" : round.result.multiplierMicros > 0n ? "win" : "lose", muted);
      return;
    }
    const step = round.steps[applied - 1];
    if (!step) return;
    const cue = cueFor(step);
    if (cue) playCue(cue, muted);
  }, [applied, muted, round, speed, total]);

  const settledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!round || !done) return;
    if (settledFor.current === round.playId) return;
    settledFor.current = round.playId;
    setBalance((current) => {
      const next = current + round.result.payoutMicros;
      writeBalance(next);
      return next;
    });
  }, [done, round]);

  const scene = useMemo(
    () => (round ? reduceSteps(round.steps.slice(0, applied)) : initialScene()),
    [round, applied],
  );

  const affordable = Number(balance / MICRO);
  const maxStake = Math.max(0, affordable);
  const broke = affordable < 1;
  const canPlay = !playing && stake >= 1 && stake <= affordable;

  useEffect(() => {
    if (!playing && maxStake >= 1 && stake > maxStake) setStake(maxStake);
  }, [maxStake, playing, stake]);

  function play() {
    if (!canPlay) return;
    resumeAudio();
    const chosen = seed.trim() || createRoundSeed();
    const result = resolveRound({ seed: chosen, stake });
    const stakeMicros = creditsToMicros(stake);
    setBalance((current) => {
      const next = current - stakeMicros;
      writeBalance(next);
      return next;
    });
    settledFor.current = null;
    setRound({ playId: crypto.randomUUID(), result, steps: buildTimeline(result.events) });
  }

  function refill() {
    const next = creditsToMicros(STARTING_BALANCE_CREDITS);
    setBalance(next);
    writeBalance(next);
    setStake(DEFAULT_STAKE);
  }

  return (
    <div className="app" data-testid="app">
      <header className="topbar">
        <div className="brand">
          <h1>Merge Packs</h1>
          <p className="eyebrow">Prototype · placeholder math · demo credits</p>
        </div>
        <div className="topbar-right">
          <div className="credits">
            <span>Credits</span>
            <strong data-testid="balance">{formatMicros(balance)}</strong>
          </div>
          <button type="button" className="ghost" aria-pressed={!muted} onClick={() => setMuted((current) => !current)}>
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button type="button" className="ghost" onClick={() => setInfoOpen(true)}>
            Rules
          </button>
        </div>
      </header>

      <main>
        <PackStage
          scene={scene}
          speed={speed}
          result={round?.result ?? null}
          settled={done}
          canPlay={canPlay}
          onAgain={play}
          onPinSeed={(value) => setSeed(value)}
        />
      </main>

      <BetPanel
        stake={stake}
        maxStake={maxStake}
        playing={playing}
        canPlay={canPlay}
        broke={broke}
        speed={speed}
        seed={seed}
        onStake={setStake}
        onPlay={play}
        onSpeed={setSpeed}
        onSeed={setSeed}
        onRefill={refill}
      />

      {infoOpen ? <InfoModal onClose={() => setInfoOpen(false)} /> : null}
    </div>
  );
}
