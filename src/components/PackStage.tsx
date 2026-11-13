import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Color, RoundResult } from "../engine/types";
import { formatMultiplier } from "../engine/money";
import type { Scene } from "../playback/scene";
import type { PlaybackSpeed } from "../playback/timing";
import { speedFactor } from "../playback/timing";
import { CardBack, CardFace, SkullMark } from "./CardFace";
import { CardBoard } from "./CardBoard";
import { ResultOverlay } from "./ResultOverlay";

type Props = {
  scene: Scene;
  speed: PlaybackSpeed;
  result: RoundResult | null;
  settled: boolean;
  canPlay: boolean;
  onAgain: () => void;
  onPinSeed: (seed: string) => void;
};

type Flight = {
  key: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
};

export function PackStage({ scene, speed, result, settled, canPlay, onAgain, onPinSeed }: Props) {
  const stageRef = useRef<HTMLElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const laneRefs = useRef<Partial<Record<Color, HTMLDivElement | null>>>({});
  const [flight, setFlight] = useState<Flight | null>(null);

  const registerLane = useCallback((color: Color, element: HTMLDivElement | null) => {
    laneRefs.current[color] = element;
  }, []);

  const flyer = scene.flyer;
  const flyerKey = flyer ? `${flyer.card.id}:${flyer.phase}` : null;

  useLayoutEffect(() => {
    if (!flyer || !flyerKey) {
      setFlight(null);
      return;
    }
    const stage = stageRef.current?.getBoundingClientRect();
    const mouth = mouthRef.current?.getBoundingClientRect();
    if (!stage || !mouth) return;
    const x = mouth.left + mouth.width / 2 - stage.left;
    const y = mouth.top + mouth.height / 2 - stage.top;
    let tx = 0;
    let ty = 0;
    if (flyer.phase === "land") {
      const target =
        flyer.target === "lane" && flyer.lane
          ? laneRefs.current[flyer.lane]
          : flyer.target === "queue"
            ? queueRef.current
            : flyer.target === "discard"
              ? discardRef.current
              : null;
      const rect = target?.getBoundingClientRect();
      if (rect) {
        tx = rect.left + rect.width / 2 - stage.left - x;
        ty = rect.top + rect.height / 2 - stage.top - y;
      } else {
        ty = 160;
      }
    }
    setFlight({ key: flyerKey, x, y, tx, ty });
  }, [flyer, flyerKey]);

  const anim = String(Math.max(speedFactor(speed), 0.01));
  const dead = scene.skullPhase !== "none";
  const hudLabel = scene.finalMicros !== null ? (dead ? "Result" : "Final") : "Potential";
  const burst = scene.burst;
  const idle = scene.status === "idle";

  return (
    <section
      ref={stageRef}
      className={`stage status-${scene.status} skull-${scene.skullPhase} ${flyer ? "has-flyer" : ""}`}
      data-testid="stage"
      aria-label="Game stage"
      style={{ ["--anim" as string]: anim }}
    >
      <div className="hud">
        <Meter label="Pack" value={scene.packNo > 0 ? `${scene.packNo}` : "—"} testId="pack-meter" />
        <Meter label="Pending" value={`${scene.pendingPacks}`} testId="pending-meter" hot={burst?.tone === "extra"} />
        <Meter
          label={hudLabel}
          value={idle ? "—" : formatMultiplier(dead ? 0n : scene.potentialMicros)}
          testId="potential"
          hint={scene.status === "playing" ? "not yet won" : undefined}
          hot={burst?.tone === "merge"}
        />
      </div>

      <div className="hero">
        <div className="side side-left">
          <div ref={discardRef} className={`discard ${scene.discarded > 0 ? "has-cards" : ""}`} aria-label="Grey cards">
            <span className="side-label">Grey</span>
            <div className="discard-pile">
              {Array.from({ length: Math.min(scene.discarded, 4) }, (_, index) => (
                <span key={index} className="discard-card" style={{ ["--i" as string]: index }} />
              ))}
            </div>
            <strong>{scene.discarded > 0 ? `×${scene.discarded}` : "0×"}</strong>
          </div>
        </div>

        <div className="hero-center">
          {settled && result ? (
            <ResultOverlay result={result} canPlay={canPlay} onAgain={onAgain} onPinSeed={onPinSeed} />
          ) : (
            <div className={`pack pack-${idle ? "sealed" : scene.pack}`} data-testid="pack">
              <div className="pack-glow" />
              <div ref={mouthRef} className="pack-mouth">
                {Array.from({ length: scene.cardsLeftInPack }, (_, index) => (
                  <CardBack key={index} className={`inside inside-${index}`} />
                ))}
              </div>
              <div className="pack-lid">
                <span>MERGE PACK</span>
              </div>
              <div className="pack-body">
                <strong>{scene.packNo > 0 ? `PACK ${scene.packNo}` : "PACK"}</strong>
                <em>{idle ? "6 cards inside" : `${scene.cardsLeftInPack} left`}</em>
              </div>
              {scene.pack === "dead" || scene.skullPhase !== "none" ? (
                <div className="pack-skull">
                  <SkullMark />
                </div>
              ) : null}
            </div>
          )}

          {burst ? (
            <p key={burst.id} className={`burst tone-${burst.tone}`} aria-hidden="true">
              {burst.text}
            </p>
          ) : null}
        </div>

        <div className="side side-right">
          <div ref={queueRef} className={`queue ${scene.pendingPacks > 0 && !idle ? "has-packs" : ""}`} aria-label="Pending packs">
            <span className="side-label">Next</span>
            <div className="queue-pile">
              {Array.from({ length: Math.min(idle ? 0 : scene.pendingPacks, 5) }, (_, index) => (
                <span key={index} className="mini-pack" style={{ ["--i" as string]: index }} />
              ))}
            </div>
            <strong>{idle ? "—" : `${scene.pendingPacks}`}</strong>
          </div>
        </div>
      </div>

      <p className="caption" aria-live="polite" data-testid="caption">
        {scene.caption}
      </p>

      <CardBoard lanes={scene.lanes} dead={dead} registerLane={registerLane} />

      {flyer && flight && flight.key === flyerKey ? (
        <div className="flight-layer" aria-hidden="true">
          <div
            key={flight.key}
            className={`flyer phase-${flyer.phase} target-${flyer.target} tone-${flyer.card.kind === "color" ? flyer.card.color : flyer.card.kind}`}
            style={{
              left: flight.x,
              top: flight.y,
              ["--tx" as string]: `${flight.tx}px`,
              ["--ty" as string]: `${flight.ty}px`,
            }}
          >
            <div className="flyer-move">
              <div className="flyer-hop">
                <div className="flyer-flip">
                  <div className="face face-back">
                    <CardBack />
                  </div>
                  <div className="face face-front">
                    <CardFace card={flyer.card} size="fly" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {scene.skullPhase === "strike" || scene.skullPhase === "wipe" ? <div className="skull-flash" aria-hidden="true" /> : null}
    </section>
  );
}

function Meter({
  label,
  value,
  testId,
  hint,
  hot = false,
}: {
  label: string;
  value: string;
  testId: string;
  hint?: string;
  hot?: boolean;
}) {
  return (
    <div className={`meter ${hot ? "is-hot" : ""}`}>
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
      <small>{hint ?? "\u00a0"}</small>
    </div>
  );
}
