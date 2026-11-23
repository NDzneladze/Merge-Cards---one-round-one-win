import type { Difficulty } from "./types";

export type FeaturedSeed = {
  id: string;
  label: string;
  seed: string;
  difficulty: Difficulty;
};

/**
 * Pinned demo seeds. Outcomes are locked by tests. They are illustrations,
 * not a math sample. Grey, Stack bonus and Stack + purple are natural deals,
 * not scripted hands. v0.12 retunes Grey and the stack tiers, so the pinned
 * seeds are the deals that still show each outcome under the v0.13 weights.
 */
export const FEATURED_SEEDS: readonly FeaturedSeed[] = [
  { id: "chain", label: "Pack chain", seed: "demo-430", difficulty: "medium" },
  { id: "small", label: "Small return", seed: "demo-0", difficulty: "easy" },
  { id: "boost", label: "Boost", seed: "demo-241", difficulty: "medium" },
  { id: "hard", label: "Hard hit", seed: "demo-10", difficulty: "hard" },
  { id: "big", label: "Big win", seed: "demo-268", difficulty: "medium" },
  { id: "bust", label: "Red", seed: "demo-40", difficulty: "medium" },
  { id: "grey", label: "Grey", seed: "demo-6", difficulty: "easy" },
  { id: "stack", label: "Stack bonus", seed: "demo-35", difficulty: "easy" },
  { id: "stackPurple", label: "Stack + purple", seed: "demo-11", difficulty: "easy" },
];
