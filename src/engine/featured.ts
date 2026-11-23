import type { Difficulty } from "./types";

export type FeaturedSeed = {
  id: string;
  label: string;
  seed: string;
  difficulty: Difficulty;
};

/** Pinned demo seeds. Outcomes are locked by tests; they are not a math sample. */
export const FEATURED_SEEDS: readonly FeaturedSeed[] = [
  { id: "chain", label: "Pack chain", seed: "demo-1725", difficulty: "medium" },
  { id: "small", label: "Small return", seed: "demo-6", difficulty: "easy" },
  { id: "boost", label: "Boost", seed: "demo-97", difficulty: "medium" },
  { id: "hard", label: "Hard hit", seed: "demo-10", difficulty: "hard" },
  { id: "big", label: "Big win", seed: "demo-105", difficulty: "medium" },
  { id: "bust", label: "Red", seed: "demo-441", difficulty: "medium" },
];
