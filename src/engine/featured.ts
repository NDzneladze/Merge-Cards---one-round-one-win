import type { Difficulty } from "./types";

export type FeaturedSeed = {
  id: string;
  label: string;
  seed: string;
  difficulty: Difficulty;
};

/**
 * Pinned demo seeds for the v0.8 weights, replayed under the v0.10 rules
 * (grey joins a pile and counts toward Stack Bonus). Outcomes are locked by
 * tests. They are illustrations, not a math sample. Grey, Stack bonus and
 * Stack + purple are natural deals, not scripted hands.
 */
export const FEATURED_SEEDS: readonly FeaturedSeed[] = [
  { id: "chain", label: "Pack chain", seed: "demo-282", difficulty: "medium" },
  { id: "small", label: "Small return", seed: "demo-21", difficulty: "easy" },
  { id: "boost", label: "Boost", seed: "demo-14", difficulty: "medium" },
  { id: "hard", label: "Hard hit", seed: "demo-141", difficulty: "hard" },
  { id: "big", label: "Big win", seed: "demo-104", difficulty: "medium" },
  { id: "bust", label: "Red", seed: "demo-70", difficulty: "medium" },
  { id: "grey", label: "Grey", seed: "demo-48", difficulty: "easy" },
  { id: "stack", label: "Stack bonus", seed: "demo-2", difficulty: "easy" },
  { id: "stackPurple", label: "Stack + purple", seed: "demo-104", difficulty: "easy" },
];
