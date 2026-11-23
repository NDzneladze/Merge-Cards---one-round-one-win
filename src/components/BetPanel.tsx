import { STAKE_PRESETS } from "../engine/config";
import { FEATURED_SEEDS } from "../engine/featured";
import type { PlaybackSpeed } from "../playback/timing";
import { PLAYBACK_SPEEDS } from "../playback/timing";

type Props = {
  stake: number;
  maxStake: number;
  playing: boolean;
  canPlay: boolean;
  broke: boolean;
  speed: PlaybackSpeed;
  seed: string;
  onStake: (stake: number) => void;
  onPlay: () => void;
  onSpeed: (speed: PlaybackSpeed) => void;
  onSeed: (seed: string) => void;
  onRefill: () => void;
};

const SPEED_LABEL: Record<PlaybackSpeed, string> = {
  "1x": "1×",
  "2x": "2×",
  instant: "Instant",
};

/** Compact control bar under the stage. The scene above stays the focus. */
export function BetPanel(props: Props) {
  const { playing, maxStake, stake } = props;
  return (
    <aside className="controls" aria-label="Bet controls">
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

        <div className="speed-block">
          <span className="field-label">Speed</span>
          <div className="speed-row" role="group" aria-label="Playback speed">
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                data-testid={`speed-${speed}`}
                aria-pressed={props.speed === speed}
                onClick={() => props.onSpeed(speed)}
              >
                {SPEED_LABEL[speed]}
              </button>
            ))}
          </div>
          <small>Animation only. The deal is already decided.</small>
        </div>
      </div>

      <details className="extras">
        <summary>Examples &amp; seed</summary>
        <div className="extras-body">
          <div className="examples" role="group" aria-label="Example seeds">
            {FEATURED_SEEDS.map((example) => (
              <button
                key={example.id}
                type="button"
                aria-pressed={props.seed === example.seed}
                disabled={playing}
                onClick={() => props.onSeed(example.seed)}
              >
                {example.label}
              </button>
            ))}
          </div>
          <label className="seed-field">
            <span>A pinned seed repeats the same cards. Clear it for a fresh deal. Play always spends one stake.</span>
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
    </aside>
  );
}
