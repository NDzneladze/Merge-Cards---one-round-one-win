type Cue = "pack" | "flip" | "merge" | "extra" | "skull" | "win" | "lose";

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

function beep(frequency: number, duration: number, type: OscillatorType, gainValue: number): void {
  const ctx = audioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playCue(cue: Cue, muted: boolean): void {
  if (muted) return;
  try {
    resumeAudio();
    if (cue === "pack") beep(180, 0.12, "triangle", 0.04);
    if (cue === "flip") beep(520, 0.06, "square", 0.03);
    if (cue === "merge") {
      beep(440, 0.08, "triangle", 0.04);
      beep(660, 0.12, "triangle", 0.04);
    }
    if (cue === "extra") beep(760, 0.16, "sine", 0.05);
    if (cue === "skull") beep(90, 0.28, "sawtooth", 0.05);
    if (cue === "win") beep(880, 0.18, "triangle", 0.05);
    if (cue === "lose") beep(140, 0.16, "sine", 0.04);
  } catch {
    // Autoplay or missing audio output should never block the round.
  }
}
