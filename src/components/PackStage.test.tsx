import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveRound } from "../engine/round";
import type { ScriptedDraw } from "../engine/types";
import { buildTimeline, initialScene, reduceSteps, type Scene } from "../playback/scene";
import { PLAYBACK_SCALE } from "../playback/timing";
import { PackStage } from "./PackStage";

const g = (value: number): ScriptedDraw => ({ kind: "green", value });
const b = (value: number): ScriptedDraw => ({ kind: "blue", value });
const extra: ScriptedDraw = { kind: "extra" };
const purple: ScriptedDraw = { kind: "purple" };
const red: ScriptedDraw = { kind: "red" };

function timeline(script: ScriptedDraw[]) {
  const result = resolveRound({ seed: "vis", stake: 1, script });
  return { result, steps: buildTimeline(result.events) };
}

function at(script: ScriptedDraw[], count: number): Scene {
  const { steps } = timeline(script);
  return reduceSteps(steps.slice(0, count));
}

function mount(scene: Scene, settled = false) {
  const result = settled ? resolveRound({ seed: "vis", stake: 1, script: [g(0.12), g(0.12), g(0.12), g(0.12), g(0.12), g(0.12)] }) : null;
  return render(<PackStage scene={scene} result={result} roundKey="round-1" settled={settled} />);
}

describe("pack opening presentation", () => {
  const script: ScriptedDraw[] = [g(0.12), b(1.05), g(0.1), g(0.1), g(0.1), g(0.1)];

  it("launches a card from the pack still face-down, then flips it toward its pile", () => {
    const { rerender } = mount(at(script, 3));
    const flyer = screen.getByTestId("flyer");
    expect(flyer).toHaveClass("phase-eject", "kind-value");
    expect(flyer).toHaveAttribute("data-phase", "eject");
    expect(flyer).toHaveAttribute("data-target", "none");
    expect(document.querySelector(".stack-card")).toBeNull();
    expect(screen.getByTestId("pack")).toHaveClass("pack-open");

    rerender(<PackStage scene={at(script, 4)} result={null} roundKey="round-1" settled={false} />);
    const travelling = screen.getByTestId("flyer");
    expect(travelling).toHaveClass("phase-travel", "target-green");
    expect(travelling).toHaveAttribute("data-phase", "travel");
    expect(travelling).toHaveAttribute("data-target", "green");
    expect(travelling.getAttribute("style")).toMatch(/--tx:/);
    expect(travelling.getAttribute("style")).toMatch(/--ty:/);

    rerender(<PackStage scene={at(script, 5)} result={null} roundKey="round-1" settled={false} />);
    expect(screen.queryByTestId("flyer")).toBeNull();
    const landed = document.querySelector(".stack-card");
    expect(landed).toHaveClass("is-landing", "tone-green");
    expect(landed?.querySelector(".card-value")).toHaveTextContent("0.12×");
    expect(landed?.querySelector(".card-kind")).toHaveTextContent("Green");
  });

  it("hits the chosen pile with a boost chip and a hot state", () => {
    const boostScript: ScriptedDraw[] = [g(0.5), g(0.25), b(2), purple, g(0.1), g(0.1)];
    const steps = buildTimeline(resolveRound({ seed: "vis", stake: 1, script: boostScript }).events);
    const boostAt = steps.findIndex((step) => step.kind === "boost");
    mount(reduceSteps(steps.slice(0, boostAt + 1)));
    expect(screen.queryByTestId("flyer")).toBeNull();
    expect(screen.getByTestId("pile-green")).toHaveClass("is-hot", "is-boosted");
    expect(screen.getByTestId("chip-green")).toHaveTextContent("×2");
    expect(document.querySelector(".pile-flash")).toBeTruthy();
    expect(screen.getByTestId("pile-blue")).not.toHaveClass("is-hot");
  });

  it("shows a bust badge and kills the boosters waiting under the pack", () => {
    const bustScript: ScriptedDraw[] = [extra, g(0.5), extra, red];
    const { result, steps } = timeline(bustScript);
    const scene = reduceSteps(steps, initialScene(result.difficulty, result.colors));
    render(<PackStage scene={scene} result={result} roundKey="bust-1" settled />);
    expect(screen.getByTestId("bust-badge")).toHaveTextContent(/Bust/);
    expect(screen.getByTestId("bust-badge")).toHaveTextContent("0.00×");
    expect(screen.queryByTestId("win-badge")).toBeNull();
    expect(screen.getByTestId("pack-stack")).toHaveClass("boosters-dead");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "2");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-pack-count", "3");
    expect(screen.getAllByText("RAINBET")).toHaveLength(3);
    expect(screen.getByTestId("booster-1").querySelector("[data-brand='rainbet']")).toBeTruthy();
    expect(screen.getByTestId("booster-2")).toBeInTheDocument();
    expect(screen.queryByTestId("booster-3")).toBeNull();
    expect(screen.getByTestId("booster-count")).toHaveTextContent("−2");
    const strike = screen.getByTestId("red-strike");
    expect(strike.querySelectorAll(".card-corner svg")).toHaveLength(0);
    expect(strike.querySelectorAll("[data-mark='skull']")).toHaveLength(1);
    expect(strike).toHaveTextContent("STOP");
    expect(strike).toHaveTextContent("0× bust");
    expect(screen.queryByTestId("win-overlay")).toBeNull();
  });

  it("locks the animation scale to the former 2× tempo", () => {
    mount(initialScene());
    expect(screen.getByTestId("stage").style.getPropertyValue("--anim")).toBe(String(PLAYBACK_SCALE));
    expect(screen.getByTestId("pack")).toHaveTextContent("RAINBET");
    expect(screen.getByTestId("stage")).toHaveClass("piles-3");
    expect(screen.queryByRole("group", { name: /playback speed/i })).toBeNull();
  });

  it("promotes the top queued Rainbet pack into the active slot", () => {
    const chain: ScriptedDraw[] = [g(0.3), extra, g(0.1), g(0.1), g(0.1), g(0.1), g(0.2), g(0.2), g(0.2), g(0.2), g(0.2), g(0.2)];
    const { steps } = timeline(chain);
    const earned = steps.findIndex((step) => step.kind === "earn");
    const { rerender } = mount(reduceSteps(steps.slice(0, earned + 1)));
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "1");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-pack-count", "2");
    expect(screen.getByTestId("booster-1")).toBeInTheDocument();
    expect(screen.getAllByText("RAINBET")).toHaveLength(2);

    const entering = steps.findIndex((step, index) => step.kind === "pack_enter" && index > 0);
    rerender(<PackStage scene={reduceSteps(steps.slice(0, entering + 1))} result={null} roundKey="round-1" settled={false} />);
    expect(screen.getByTestId("pack")).toHaveClass("pack-arriving", "is-bonus");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "0");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-pack-count", "1");
    expect(screen.queryByTestId("booster-1")).toBeNull();
    expect(screen.getAllByText("RAINBET")).toHaveLength(1);
  });
});
