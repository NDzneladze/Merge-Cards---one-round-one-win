import { STAKE_PRESETS } from "../engine/config";
import { FEATURED_SEEDS } from "../engine/featured";
import type { PlaybackSpeed } from "../playback/timing";
import { PLAYBACK_SPEEDS } from "../playback/timing";

type Props = {
  balanceLabel: string;
  stake: number;
  maxStake: number;
  playing: boolean;
  canPlay: boolean;
  broke: boolean;
  speed: PlaybackSpeed;
  seed: string;
  muted: boolean;
  onStake: (stake: number) => void;
  onPlay: () => void;
  onSpeed: (speed: PlaybackSpeed) => void;
  onSeed: (seed: string) => void;
  onToggleMute: () => void;
  onInfo: () => void;
  onRefill: () => void;
};

const SPEED_LABEL: Record<PlaybackSpeed, string> = {
  "1x": "1×",
  "2x": "2×",
  instant: "Instant",
};

export function BetPanel(props: Props) {
  const { playing, maxStake, stake } = props;
  return (
    <aside className="bet-panel">
      <div className="balance-row">
        <div>
          <span>Demo credits</span>
          <strong data-testid="balance">{props.balanceLabel}</strong>
        </div>
        <button type="button" className="ghost" onClick={props.onInfo}>
          Rules
        </button>
      </div>

      <div className="stake-block">
        <div className="stake-line">
          <span>Stake</span>
          <div className="stepper">
            <button type="button" onClick={() => props.onStake(stake - 1)} disabled={playing || stake <= 1} aria-label="Decrease stake">
              −
            </button>
            <strong data-testid="stake">{stake}</strong>
            <button
              type="button"
              onClick={() => props.onStake(stake + 1)}
              disabled={playing || stake >= maxStake}
              aria-label="Increase stake"
            >
              +
            </button>
          </div>
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

      <button
        type="button"
        className="play"
        data-testid="play-button"
        disabled={!props.canPlay}
        onClick={props.onPlay}
      >
        {props.broke ? "Not enough credits" : playing ? "Resolving…" : "Play"}
      </button>

      {props.broke ? (
        <button type="button" className="refill" onClick={props.onRefill}>
          Refill demo credits
        </button>
      ) : null}

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
      <p className="speed-note">Speed changes the animation only. The deal is already decided.</p>

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
      <p className="speed-note">Examples pin a seed. Play still spends one stake.</p>

      <div className="side-actions">
        <button type="button" className="ghost" aria-pressed={!props.muted} onClick={props.onToggleMute}>
          {props.muted ? "Sound off" : "Sound on"}
        </button>
      </div>

      <details className="seed-box">
        <summary>Seed</summary>
        <label>
          Pinned seed repeats the same cards. Clear it for a new deal.
          <input
            data-testid="seed-input"
            value={props.seed}
            maxLength={80}
            disabled={playing}
            placeholder="Random each round"
            onChange={(event) => props.onSeed(event.target.value)}
          />
        </label>
      </details>
    </aside>
  );
}
