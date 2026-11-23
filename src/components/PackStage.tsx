import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RoundResult, StackColor } from "../engine/types";
import { formatMicros, formatMultiplier } from "../engine/money";
import type { Scene } from "../playback/scene";
import type { PlaybackSpeed } from "../playback/timing";
import { speedFactor } from "../playback/timing";
import { CardBack, CardFace } from "./CardFace";
import { CardBoard } from "./CardBoard";
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

/** Most waiting boosters drawn as separate layers; beyond that the counter carries the number. */
const BOOSTER_LAYERS = 3;

export function PackStage({ scene, speed, result, roundKey, settled }: Props) {
  const stageRef = useRef<HTMLElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const boostersRef = useRef<HTMLDivElement>(null);
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
          : flyer.target === "boosters"
            ? boostersRef.current
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

  const verdict = !finalShown
    ? null
    : dead
      ? "bust"
      : scene.tier === "big" || scene.tier === "huge" || scene.tier === "mega"
        ? "celebrate"
        : scene.tier === "win"
          ? "win"
          : scene.tier === "even"
            ? "even"
            : scene.tier === "return"
              ? "return"
              : "none";

  const totalLabel = finalShown ? "Result" : "Total";
  const totalHint = idle
    ? "\u00a0"
    : verdict === null
      ? "potential"
      : verdict === "bust"
        ? "red card · 0×"
        : verdict === "celebrate"
          ? `${scene.tier} win`
          : verdict === "win"
            ? "win"
            : verdict === "even"
              ? "break-even"
              : verdict === "return"
                ? "return · below stake"
                : "nothing collected";

  const payoutValue = finalShown && result ? (result.payoutMicros > 0n ? `+${formatMicros(result.payoutMicros)}` : "0.00") : "—";
  const netHint =
    finalShown && result
      ? result.netMicros === 0n
        ? "net ±0.00"
        : `net ${result.netMicros > 0n ? "+" : "−"}${formatMicros(result.netMicros < 0n ? -result.netMicros : result.netMicros)}`
      : "\u00a0";

  const multiPack = scene.packsTotal > 1;
  const packValue = scene.packNo > 0 ? (multiPack ? `${scene.packNo}/${scene.packsTotal}` : `${scene.packNo}`) : "—";
  const packHint = idle
    ? `${scene.cardsInPack} cards`
    : finalShown
      ? multiPack
        ? `${scene.packNo} opened`
        : "opened"
      : scene.pendingPacks > 0
        ? `${scene.cardsLeftInPack} left · +${scene.pendingPacks} below`
        : `${scene.cardsLeftInPack} left`;

  const waiting = dead ? scene.cancelledPacks : scene.pendingPacks;
  const layers = Math.min(waiting, BOOSTER_LAYERS);

  return (
    <section
      ref={stageRef}
      className={`stage status-${scene.status} bust-${scene.bustPhase} tier-${scene.tier} mode-${scene.difficulty} ${flyer ? "has-flyer" : ""}`}
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
          tone={verdict ?? undefined}
        />
        <Meter label="Payout" value={payoutValue} hint={netHint} testId="payout-meter" />
        {verdict === "win" || verdict === "even" || verdict === "return" ? (
          <p key={roundKey} className={`verdict-badge tone-${verdict}`} data-testid={verdict === "win" ? "win-badge" : "result-badge"} role="status">
            <span>{verdict === "win" ? "Win" : verdict === "even" ? "Break-even" : "Return"}</span>
            <strong>{formatMultiplier(scene.totalMicros)}</strong>
          </p>
        ) : null}
      </div>

      <div className="arena">
        <CardBoard colors={scene.colors} stacks={scene.stacks} dead={dead} registerSlot={registerSlot} />
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
        <div
          className={`pack-stack ${waiting > 0 ? "has-boosters" : ""} ${dead && scene.cancelledPacks > 0 ? "boosters-dead" : ""}`}
          data-testid="pack-stack"
          data-waiting={waiting}
        >
          {Array.from({ length: layers }, (_, index) => (
            <div
              key={`booster-${index}`}
              className="booster"
              style={{ ["--i" as string]: index + 1 }}
              data-testid={`booster-${index + 1}`}
              aria-hidden="true"
            >
              <span className="booster-lid" />
              <span className="booster-band" />
            </div>
          ))}
          <div ref={boostersRef} className="booster-anchor" aria-hidden="true" />
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
          {waiting > 0 ? (
            <span
              key={`${scene.earnKey ?? "count"}:${waiting}:${dead ? "dead" : "live"}`}
              className={`booster-count ${dead ? "is-dead" : ""}`}
              data-testid="booster-count"
              aria-label={dead ? `${waiting} waiting packs cancelled` : `${waiting} bonus packs waiting`}
            >
              {dead ? `−${waiting}` : `+${waiting}`}
            </span>
          ) : null}
        </div>
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
