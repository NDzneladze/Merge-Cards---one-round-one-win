type Cue = "pack" | "flip" | "land" | "boost" | "bust" | "win" | "bigwin" | "lose";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window.AudioContext !== "function") return null;
  if (!context) context = new window.AudioContext();
  return context;
}

export function resumeAudio(): void {
  const ctx = audioContext();
  if (ctx?.state === "suspended") void ctx.resume();
}

function beep(frequency: number, duration: number, type: OscillatorType, gainValue: number, delay = 0): void {
  const ctx = audioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const at = ctx.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  gain.gain.setValueAtTime(gainValue, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration);
}

export function playCue(cue: Cue, muted: boolean): void {
  if (muted) return;
  try {
    resumeAudio();
    if (cue === "pack") beep(180, 0.14, "triangle", 0.04);
    if (cue === "flip") beep(540, 0.05, "square", 0.025);
    if (cue === "land") beep(330, 0.07, "triangle", 0.035);
    if (cue === "boost") {
      beep(440, 0.08, "triangle", 0.04);
      beep(660, 0.1, "triangle", 0.04, 0.07);
      beep(880, 0.16, "triangle", 0.04, 0.14);
    }
    if (cue === "bust") {
      beep(120, 0.3, "sawtooth", 0.05);
      beep(70, 0.4, "sawtooth", 0.05, 0.1);
    }
    if (cue === "win") beep(880, 0.18, "triangle", 0.05);
    if (cue === "bigwin") {
      beep(660, 0.12, "triangle", 0.05);
      beep(880, 0.12, "triangle", 0.05, 0.12);
      beep(1320, 0.3, "triangle", 0.05, 0.24);
    }
    if (cue === "lose") beep(140, 0.16, "sine", 0.04);
  } catch {
    // Autoplay or missing audio output should never block the round.
  }
}
