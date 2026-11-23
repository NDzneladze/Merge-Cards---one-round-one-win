import { DIFFICULTIES, DIFFICULTY_ORDER, STAKE_PRESETS } from "../engine/config";
import { FEATURED_SEEDS, type FeaturedSeed } from "../engine/featured";
import type { Difficulty } from "../engine/types";
import { labelColor } from "../playback/scene";
import { CardLegend } from "./CardLegend";

type Props = {
  stake: number;
  maxStake: number;
  playing: boolean;
  canPlay: boolean;
  broke: boolean;
  seed: string;
  difficulty: Difficulty;
  onStake: (stake: number) => void;
  onPlay: () => void;
  onSeed: (seed: string) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onExample: (example: FeaturedSeed) => void;
  onRefill: () => void;
  onInfo: () => void;
};

/** Left rail on a wide screen, and the bar under the table on a phone. */
export function BetPanel(props: Props) {
  const { playing, maxStake, stake } = props;
  const mode = DIFFICULTIES[props.difficulty];
  return (
    <aside className="controls" aria-label="Bet controls">
      <div className="difficulty-block">
        <span className="field-label">Difficulty</span>
        <div className="difficulty-row" role="group" aria-label="Difficulty">
          {DIFFICULTY_ORDER.map((id) => {
            const option = DIFFICULTIES[id];
            return (
              <button
                key={id}
                type="button"
                className={`difficulty tone-${id}`}
                data-testid={`difficulty-${id}`}
                aria-pressed={props.difficulty === id}
                disabled={playing}
                onClick={() => props.onDifficulty(id)}
              >
                <strong>{option.label}</strong>
                <span>{option.colors.map(labelColor).join(" + ")}</span>
              </button>
            );
          })}
        </div>
        <small data-testid="difficulty-blurb">{mode.blurb}. Purple ×2, Red and +1 PACK in every mode.{playing ? " Locked while the round resolves." : ""}</small>
      </div>
      <div className="controls-row">
        <div className="stake-block">
          <span className="field-label">Stake</span>
          <div className="stepper">
            <button type="button" onClick={() => props.onStake(stake - 1)} disabled={playing || stake <= 1} aria-label="Decrease stake">
              −
            </button>
            <strong data-testid="stake">{stake}</strong>
            <button type="button" onClick={() => props.onStake(stake + 1)} disabled={playing || stake >= maxStake} aria-label="Increase stake">
              +
            </button>
          </div>
          <div className="presets" role="group" aria-label="Stake presets">
            {STAKE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={stake === preset}
                disabled={playing || preset > maxStake}
                onClick={() => props.onStake(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="play-block">
          <button type="button" className="play" data-testid="play-button" disabled={!props.canPlay} onClick={props.onPlay}>
            {props.broke ? "No credits" : playing ? "Resolving…" : "Play"}
          </button>
          {props.broke ? (
            <button type="button" className="ghost" onClick={props.onRefill}>
              Refill demo credits
            </button>
          ) : null}
        </div>
      </div>

      <CardLegend />
      <details className="extras">
        <summary>Examples &amp; seed</summary>
        <div className="extras-body">
          <div className="examples" role="group" aria-label="Example seeds">
            {FEATURED_SEEDS.map((example) => (
              <button
                key={example.id}
                type="button"
                aria-pressed={props.seed === example.seed && props.difficulty === example.difficulty}
                disabled={playing}
                title={`${DIFFICULTIES[example.difficulty].label} · ${example.seed}`}
                onClick={() => props.onExample(example)}
              >
                {example.label}
              </button>
            ))}
          </div>
          <label className="seed-field">
            <span>A pinned seed repeats the same cards for the same difficulty. Clear it for a fresh deal. Play always spends one stake.</span>
            <input
              data-testid="seed-input"
              value={props.seed}
              maxLength={80}
              disabled={playing}
              placeholder="Random each round"
              onChange={(event) => props.onSeed(event.target.value)}
            />
          </label>
        </div>
      </details>
      <button type="button" className="ghost rules-button" onClick={props.onInfo}>
        Rules
      </button>
    </aside>
  );
}
