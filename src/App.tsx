import { useEffect, useMemo, useRef, useState } from "react";
import { playCue, resumeAudio } from "./audio";
import { BetPanel } from "./components/BetPanel";
import { InfoModal } from "./components/InfoModal";
import { PackStage } from "./components/PackStage";
import { ResultOverlay } from "./components/ResultOverlay";
import { DEFAULT_STAKE, MICRO, STARTING_BALANCE_CREDITS } from "./engine/config";
import { creditsToMicros, formatMicros } from "./engine/money";
import { createRoundSeed } from "./engine/rng";
import { resolveRound } from "./engine/round";
import type { RoundResult } from "./engine/types";
import { reduceEvents } from "./playback/reduce";
import { delayFor, type PlaybackSpeed } from "./playback/timing";
import "./styles.css";

const BALANCE_KEY = "merge-packs-demo-balance-v1";

type ActiveRound = {
  playId: string;
  result: RoundResult;
};

function readBalance(): bigint {
  try {
    const stored = sessionStorage.getItem(BALANCE_KEY);
    if (!stored) return creditsToMicros(STARTING_BALANCE_CREDITS);
    if (!/^\d+$/.test(stored)) return creditsToMicros(STARTING_BALANCE_CREDITS);
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

  const total = round?.result.events.length ?? 0;
  const done = Boolean(round) && applied >= total && total > 0;
  const playing = Boolean(round) && !done;

  useEffect(() => {
    if (!round || applied >= total) return;
    if (speed === "instant") {
      setApplied(total);
      return;
    }
    const event = round.result.events[applied];
    if (!event) return;
    const timer = window.setTimeout(() => setApplied((current) => current + 1), delayFor(event.type, speed));
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
    const event = round.result.events[applied - 1];
    if (!event) return;
    if (event.type === "pack_open") playCue("pack", muted);
    if (event.type === "card_reveal") playCue("flip", muted);
    if (event.type === "merge") playCue("merge", muted);
    if (event.type === "pack_earned") playCue("extra", muted);
    if (event.type === "skull") playCue("skull", muted);
    if (event.type === "round_end" && event.outcome === "resolved") {
      playCue(event.multiplierMicros > 0n ? "win" : "lose", muted);
    }
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

  const view = useMemo(
    () => (round ? reduceEvents(round.result.events.slice(0, applied)) : null),
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
    const nextPlayId = crypto.randomUUID();
    const stakeMicros = creditsToMicros(stake);
    setBalance((current) => {
      const next = current - stakeMicros;
      writeBalance(next);
      return next;
    });
    settledFor.current = null;
    setRound({ playId: nextPlayId, result });
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
        <div>
          <p className="eyebrow">Prototype · placeholder math</p>
          <h1>Merge Packs</h1>
        </div>
        <p className="tagline">One bet. One pack of six. One final result.</p>
      </header>

      <BetPanel
        balanceLabel={formatMicros(balance)}
        stake={stake}
        maxStake={maxStake}
        playing={playing}
        canPlay={canPlay}
        broke={broke}
        speed={speed}
        seed={seed}
        muted={muted}
        onStake={setStake}
        onPlay={play}
        onSpeed={setSpeed}
        onSeed={setSeed}
        onToggleMute={() => setMuted((current) => !current)}
        onInfo={() => setInfoOpen(true)}
        onRefill={refill}
      />

      <main>
        {done && round ? (
          <ResultOverlay
            result={round.result}
            canPlay={canPlay}
            onAgain={play}
            onPinSeed={(value) => setSeed(value)}
          />
        ) : null}
        <PackStage view={view} speed={speed} idle={!round || applied === 0} />
      </main>
      {infoOpen ? <InfoModal onClose={() => setInfoOpen(false)} /> : null}
    </div>
  );
}
