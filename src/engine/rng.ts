export type Rng = {
  nextUint32(): number;
  /** Unbiased integer in `0 .. max-1`. */
  nextInt(max: number): number;
};

function cyrb128(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i += 1) {
    const k = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ k, 597399067);
    h2 = Math.imul(h2 ^ k, 2869860233);
    h3 = Math.imul(h3 ^ k, 951274213);
    h4 = Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507);
  h3 ^= Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507);
  h4 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Mulberry32. Pure: the same seed always yields the same stream. */
export function createRng(seed: string): Rng {
  if (seed.length === 0) {
    throw new Error("Seed must be a non-empty string");
  }
  const [a0, b0, c0, d0] = cyrb128(seed);
  let a = (a0! ^ b0! ^ c0! ^ d0!) >>> 0;
  if (a === 0) a = 0x6d2b79f5;

  const nextUint32 = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };

  return {
    nextUint32,
    nextInt(max: number): number {
      if (!Number.isInteger(max) || max <= 0) {
        throw new Error("nextInt max must be a positive integer");
      }
      const limit = Math.floor(0x1_0000_0000 / max) * max;
      let value = nextUint32();
      while (value >= limit) value = nextUint32();
      return value % max;
    },
  };
}

export function createRoundSeed(): string {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => n.toString(16).padStart(8, "0")).join("");
}
