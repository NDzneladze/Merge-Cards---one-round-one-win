import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RoundResult, StackColor } from "../engine/types";
import { formatMicros, formatMultiplier } from "../engine/money";
import type { Scene } from "../playback/scene";
import type { PlaybackSpeed } from "../playback/timing";
import { speedFactor } from "../playback/timing";
import { CardBack, CardFace } from "./CardFace";
import { CardBoard } from "./CardBoard";
import { PackQueue } from "./PackQueue";
import { ResultOverlay } from "./ResultOverlay";

type Props = {
  scene: Scene;
  speed: PlaybackSpeed;
  result: RoundResult | null;
  roundKey: string;
  settled: boolean;
};

type Flight = {
  key: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
};

export function PackStage({ scene, speed, result, roundKey, settled }: Props) {
  const stageRef = useRef<HTMLElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Partial<Record<StackColor, HTMLDivElement | null>>>({});
  const [flight, setFlight] = useState<Flight | null>(null);

  const registerSlot = useCallback((color: StackColor, element: HTMLDivElement | null) => {
    slotRefs.current[color] = element;
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
    const y = mouth.top - stage.top;
    let tx = 0;
    let ty = 0;
    if (flyer.phase === "travel") {
      const target =
        flyer.target === "center"
          ? centerRef.current
          : flyer.target === "queue"
            ? queueRef.current
            : flyer.target
              ? slotRefs.current[flyer.target]
              : null;
      const rect = target?.getBoundingClientRect();
      if (rect) {
        tx = rect.left + rect.width / 2 - stage.left - x;
        ty = rect.top + rect.height / 2 - stage.top - y;
      } else {
        ty = -220;
      }
    }
    setFlight({ key: flyerKey, x, y, tx, ty });
  }, [flyer, flyerKey]);

  const anim = String(Math.max(speedFactor(speed), 0.01));
  const dead = scene.bustPhase !== "none";
  const idle = scene.status === "idle";
  const burst = scene.burst;
  const finalShown = settled && result !== null;

  const totalLabel = finalShown ? "Result" : "Total";
  const totalHint = idle ? "\u00a0" : finalShown ? (dead ? "red card" : scene.tier === "win" ? "final" : scene.tier === "none" ? "nothing collected" : scene.tier.toUpperCase() + " WIN") : "potential";
  const payoutValue = finalShown && result ? (result.payoutMicros > 0n ? `+${formatMicros(result.payoutMicros)}` : "0.00") : "—";
  const multiPack = scene.packsTotal > 1;
  const packValue = scene.packNo > 0 ? (multiPack ? `${scene.packNo}/${scene.packsTotal}` : `${scene.packNo}`) : "—";
  const packHint = idle
    ? `${scene.cardsInPack} cards`
    : finalShown
      ? multiPack
        ? `${scene.packNo} opened`
        : "opened"
      : scene.pendingPacks > 0
        ? `${scene.cardsLeftInPack} left · +${scene.pendingPacks} queued`
        : `${scene.cardsLeftInPack} left`;

  return (
    <section
      ref={stageRef}
      className={`stage status-${scene.status} bust-${scene.bustPhase} tier-${scene.tier} ${flyer ? "has-flyer" : ""}`}
      data-testid="stage"
      aria-label="Game stage"
      style={{ ["--anim" as string]: anim }}
    >
      <div className="hud">
        <Meter label="Pack" value={packValue} hint={packHint} testId="pack-meter" hot={burst?.tone === "extra"} />
        <Meter
          label={totalLabel}
          value={idle ? "—" : formatMultiplier(dead ? 0n : scene.totalMicros)}
          hint={totalHint}
          testId="total-meter"
          hero
          hot={burst !== null && burst.tone !== "bust" && burst.tone !== "extra"}
          tone={finalShown ? (dead ? "bust" : scene.tier) : undefined}
        />
        <Meter label="Payout" value={payoutValue} hint={finalShown ? "credits" : "\u00a0"} testId="payout-meter" />
      </div>

      <div className="arena">
        <CardBoard stacks={scene.stacks} dead={dead} registerSlot={registerSlot} />
        <div ref={centerRef} className="arena-center" aria-hidden="true" />
        {scene.redCard && dead ? (
          <div className="red-strike" data-testid="red-strike">
            <CardFace card={scene.redCard} size="hero" />
          </div>
        ) : null}
        {burst ? (
          <p key={burst.id} className={`burst tone-${burst.tone} ${burst.color ? `color-${burst.color}` : ""}`} aria-hidden="true">
            {burst.text}
          </p>
        ) : null}
      </div>

      <p className="caption" aria-live="polite" data-testid="caption">
        {scene.caption}
      </p>

      <div className="pack-zone">
        <div key={scene.packNo} className={`pack pack-${idle ? "sealed" : scene.pack} ${scene.packNo > 1 ? "is-bonus" : ""}`} data-testid="pack">
          <div className="pack-glow" />
          <div ref={mouthRef} className="pack-mouth">
            {Array.from({ length: scene.cardsLeftInPack }, (_, index) => (
              <CardBack key={index} size="stack" className={`inside inside-${index}`} />
            ))}
          </div>
          <div className="pack-lid">
            <span>{scene.packNo > 1 ? "Bonus Pack" : "Merge Pack"}</span>
          </div>
          <div className="pack-body">
            <span className="pack-band" />
            <strong>{multiPack && scene.packNo > 0 ? `PACK ${scene.packNo}` : "PACK"}</strong>
            <em>{idle ? `${scene.cardsInPack} cards` : finalShown ? "empty" : `${scene.cardsLeftInPack} left`}</em>
          </div>
        </div>
        <PackQueue
          ref={queueRef}
          pending={scene.pendingPacks}
          total={scene.packsTotal}
          earnKey={scene.earnKey}
          cancelled={dead ? scene.cancelledPacks : 0}
          idle={idle}
        />
      </div>

      {flyer && flight && flight.key === flyerKey ? (
        <div className="flight-layer" aria-hidden="true">
          <div
            key={flight.key}
            className={`flyer phase-${flyer.phase} target-${flyer.target ?? "none"} kind-${flyer.card.kind}`}
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
                    <CardBack size="fly" />
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

      {scene.bustPhase === "strike" || scene.bustPhase === "wipe" ? <div className="red-flash" aria-hidden="true" /> : null}

      {result && settled ? <ResultOverlay result={result} roundKey={roundKey} speed={speed} /> : null}
    </section>
  );
}

function Meter({
  label,
  value,
  hint,
  testId,
  hero = false,
  hot = false,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  testId: string;
  hero?: boolean;
  hot?: boolean;
  tone?: string;
}) {
  return (
    <div className={`meter ${hero ? "is-hero" : ""} ${hot ? "is-hot" : ""} ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong data-testid={testId}>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}
