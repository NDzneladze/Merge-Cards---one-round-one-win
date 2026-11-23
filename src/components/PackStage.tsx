import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RoundResult, StackColor } from "../engine/types";
import { formatMicros, formatMultiplier } from "../engine/money";
import type { Scene } from "../playback/scene";
import { PLAYBACK_SCALE } from "../playback/timing";
import { CardBoard } from "./CardBoard";
import { CardBack, CardFace } from "./CardFace";
import { CardLegend } from "./CardLegend";
import { fitStage } from "./fitStage";
import { PackArt } from "./PackArt";
import { ResultOverlay } from "./ResultOverlay";

type Props = {
  scene: Scene;
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

/** Physical boosters drawn under the active pack. A +N chip carries any further packs. */
const BOOSTER_LAYERS = 2;

export function PackStage({ scene, result, roundKey, settled }: Props) {
  const stageRef = useRef<HTMLElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const boostersRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Partial<Record<StackColor, HTMLDivElement | null>>>({});
  const [flight, setFlight] = useState<Flight | null>(null);
  const [legend, setLegend] = useState(false);

  const registerSlot = useCallback((color: StackColor, element: HTMLDivElement | null) => {
    slotRefs.current[color] = element;
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      const viewport = document.documentElement.clientWidth;
      const action = stage.querySelector<HTMLElement>(".action");
      const width = action?.clientWidth ?? 0;
      const height = action?.clientHeight ?? 0;
      if (viewport < 80 || width < 80 || height < 80) return;
      const narrow = viewport < 860;
      const short = window.innerHeight <= 760;
      const next = fitStage({
        stageWidth: width,
        actionHeight: height,
        piles: scene.colors.length,
        narrow,
        short,
      });
      stage.style.setProperty("--card-w", `${next.card}px`);
      stage.style.setProperty("--peek", `${next.peek}px`);
      stage.style.setProperty("--lip", `${next.lip}px`);
      stage.style.setProperty("--gap", `${next.gap}px`);
      stage.style.setProperty("--pack-w", `${next.packW}px`);
      stage.style.setProperty("--pack-h", `${next.packH}px`);
      stage.dataset.cardW = String(next.card);
      stage.dataset.cluster = String(Math.round(next.cluster));
      stage.dataset.occupancy = next.occupancy.toFixed(3);
      stage.dataset.tableW = String(Math.round(width));
      setLegend((current) => (current === next.legend ? current : next.legend));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    const action = stage.querySelector(".action");
    if (action) observer.observe(action);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [scene.colors.length]);

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
    if (flyer.phase === "travel") {
      const target =
        flyer.target === "center"
          ? centerRef.current
          : flyer.target === "discard"
            ? discardRef.current
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
        ty = -180;
      }
    }
    setFlight({ key: flyerKey, x, y, tx, ty });
  }, [flyer, flyerKey]);

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
        ? "bust · 0×"
        : verdict === "celebrate"
          ? `${scene.tier} win`
          : verdict === "win"
            ? "win"
            : verdict === "even"
              ? "break-even"
      : verdict === "return"
        ? "return · below stake"
        : "no win · zero return";

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
  const bonusPack = scene.packNo > 1;
  const packOpen = scene.pack === "open";
  const packDetail = idle
    ? `${scene.cardsInPack} cards`
    : scene.pack === "dead"
      ? "busted"
      : scene.pack === "spent"
        ? "closed"
        : `${scene.cardsLeftInPack} left`;

  return (
    <section
      ref={stageRef}
      className={`stage status-${scene.status} bust-${scene.bustPhase} tier-${scene.tier} mode-${scene.difficulty} piles-${scene.colors.length} ${flyer ? "has-flyer" : ""} ${legend ? "show-legend" : ""}`}
      data-testid="stage"
      aria-label="Game stage"
      style={{ ["--anim" as string]: String(PLAYBACK_SCALE) }}
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
        {verdict === "win" || verdict === "even" || verdict === "return" || verdict === "bust" || verdict === "none" ? (
          <p
            key={roundKey}
            className={`verdict-badge tone-${verdict}`}
            data-testid={verdict === "win" ? "win-badge" : verdict === "bust" ? "bust-badge" : verdict === "none" ? "nowin-badge" : "result-badge"}
            role="status"
          >
            <span>
              {verdict === "win" ? "Win" : verdict === "even" ? "Break-even" : verdict === "return" ? "Return" : verdict === "bust" ? "Bust" : "No win"}
            </span>
            <strong>{formatMultiplier(dead ? 0n : scene.totalMicros)}</strong>
          </p>
        ) : null}
      </div>

      <p className="caption" aria-live="polite" data-testid="caption">
        {scene.caption}
      </p>

      <div className="action">
        <div className="arena">
          <CardBoard
            colors={scene.colors}
            stacks={scene.stacks}
            dead={dead}
            showProgress={scene.status === "playing"}
            registerSlot={registerSlot}
          />
          <div ref={centerRef} className="arena-center" aria-hidden="true" />
          <div ref={discardRef} className="discard-anchor" aria-hidden="true" />
          {scene.redCard && (scene.bustPhase === "strike" || scene.bustPhase === "wipe") ? (
            <div className={`red-strike ${scene.bustPhase === "wipe" ? "is-exit" : ""}`} data-testid="red-strike">
              <CardFace card={scene.redCard} size="fly" />
            </div>
          ) : null}
          {burst ? (
            <p key={burst.id} className={`burst tone-${burst.tone} ${burst.color ? `color-${burst.color}` : ""}`} aria-hidden="true">
              {burst.text}
            </p>
          ) : null}
        </div>

        <div className="pack-zone">
          <div
            className={`pack-stack ${waiting > 0 ? "has-boosters" : ""} ${dead && scene.cancelledPacks > 0 ? "boosters-dead" : ""}`}
            data-testid="pack-stack"
            data-waiting={waiting}
            data-pack-count={1 + layers}
          >
            {Array.from({ length: layers }, (_, index) => {
              const depth = index + 1;
              return (
                <div
                  key={`queued-${waiting - index}`}
                  className="booster"
                  style={{ ["--i" as string]: String(depth) }}
                  data-testid={`booster-${depth}`}
                  data-depth={depth}
                  aria-hidden="true"
                >
                  <PackArt bonus sealed product="Merge Packs" detail="Sealed" />
                </div>
              );
            })}
            <div ref={boostersRef} className="booster-anchor" aria-hidden="true" />
            <div
              key={scene.packNo}
              className={`pack pack-${idle ? "sealed" : scene.pack} ${bonusPack ? "is-bonus" : ""}`}
              data-testid="pack"
              aria-label={bonusPack ? "Rainbet bonus pack" : "Rainbet merge pack"}
            >
              <div className="pack-glow" />
              <PackArt
                bonus={bonusPack}
                sealed={!packOpen}
                product="Merge Packs"
                detail={packDetail}
                cardsLeft={scene.cardsLeftInPack}
                mouthRef={mouthRef}
              />
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
      </div>

      {flyer && flight && flight.key === flyerKey ? (
        <div className="flight-layer" aria-hidden="true">
          <div
            key={flyer.card.id}
            className={`flyer phase-${flyer.phase} target-${flyer.target ?? "none"} kind-${flyer.card.kind}`}
            data-testid="flyer"
            data-phase={flyer.phase}
            data-target={flyer.target ?? "none"}
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

      {legend ? <CardLegend /> : null}

      {result && settled ? <ResultOverlay result={result} roundKey={roundKey} /> : null}
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
