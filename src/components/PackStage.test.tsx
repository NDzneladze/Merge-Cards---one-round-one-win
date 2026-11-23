import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { resolveRound } from "../engine/round";
import type { ScriptedDraw } from "../engine/types";
import { buildTimeline, initialScene, reduceSteps, type Scene, type StackView } from "../playback/scene";
import { PLAYBACK_SCALE } from "../playback/timing";
import { PackStage } from "./PackStage";
import { QUEUE_LAYERS, VISIBLE_FACES } from "./fitStage";

const g = (value: number): ScriptedDraw => ({ kind: "green", value });
const b = (value: number): ScriptedDraw => ({ kind: "blue", value });
const extra: ScriptedDraw = { kind: "extra" };
const purple: ScriptedDraw = { kind: "purple" };
const red: ScriptedDraw = { kind: "red" };
const greyTo = (target: "green" | "blue" | "gold"): ScriptedDraw => ({ kind: "grey", target });

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
    expect(screen.getByTestId("bust-badge")).toHaveAttribute("aria-label", "Bust 0.00×");
    // The verdict sits inside the HUD's result cell. Nothing floats over the table.
    expect(screen.getByTestId("bust-badge").closest(".meter")).toHaveClass("is-hero");
    expect(document.querySelector(".verdict-badge")).toBeNull();
    expect(screen.getByTestId("total-meter")).toHaveTextContent("0.00×");
    expect(screen.queryByTestId("win-badge")).toBeNull();
    // The wiped pile gets its empty slot back, so the table keeps its shape after a bust.
    expect(screen.getByTestId("pile-green").querySelectorAll(".stack-card.is-dying")).toHaveLength(1);
    expect(screen.getByTestId("pile-green").querySelector(".landing-hint")).toBeTruthy();
    expect(screen.getByTestId("pack-stack")).toHaveClass("boosters-dead");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "2");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-pack-count", "3");
    expect(screen.getAllByText("RAINBET")).toHaveLength(3);
    expect(screen.getByTestId("booster-1").querySelector("[data-brand='rainbet']")).toBeTruthy();
    expect(screen.getByTestId("booster-2")).toBeInTheDocument();
    expect(screen.queryByTestId("booster-3")).toBeNull();
    expect(screen.getByTestId("booster-count")).toHaveTextContent("−2");
    expect(screen.queryByTestId("red-strike")).toBeNull();
    expect(screen.getByTestId("pack")).toHaveClass("pack-dead");
    expect(screen.getByTestId("pack").querySelector(".pack-art")).toHaveClass("is-sealed");
    expect(screen.getByTestId("pack").querySelectorAll(".pack-mouth .card")).toHaveLength(0);
    expect(screen.getByTestId("pack")).toHaveTextContent("busted");
    expect(screen.queryByText("STOP")).toBeNull();
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(screen.queryByTestId("nowin-badge")).toBeNull();

    const strikeAt = steps.findIndex((step) => step.kind === "bust_strike");
    const strikeScene = reduceSteps(steps.slice(0, strikeAt + 1), initialScene(result.difficulty, result.colors));
    const { unmount } = render(<PackStage scene={strikeScene} result={null} roundKey="bust-strike" settled={false} />);
    const strike = screen.getByTestId("red-strike");
    expect(strike.querySelectorAll(".card-corner")).toHaveLength(0);
    expect(strike.querySelectorAll("[data-mark='skull']")).toHaveLength(1);
    expect(strike).toHaveTextContent("STOP");
    expect(strike).toHaveTextContent("0×");
    expect(strike).not.toHaveTextContent("0× bust");
    const stopWords = strike.textContent?.match(/STOP/g) ?? [];
    expect(stopWords).toHaveLength(1);
    unmount();
  });

  it("flies a grey card into its pile, where it stays as a 0× card and counts toward the bonus", () => {
    const greyScript: ScriptedDraw[] = [g(0.2), greyTo("green"), b(1.5), g(0.1), g(0.1), g(0.1)];
    const greySteps = buildTimeline(resolveRound({ seed: "vis", stake: 1, script: greyScript }).events);
    const greyAt = greySteps.findIndex((step) => step.kind === "grey");

    const { rerender } = mount(reduceSteps(greySteps.slice(0, greyAt)));
    const flyer = screen.getByTestId("flyer");
    expect(flyer).toHaveClass("phase-travel", "kind-grey", "target-green");
    expect(flyer.querySelector(".face-front")).toHaveTextContent("0×");
    expect(screen.getByTestId("pile-green")).toHaveAttribute("data-count", "1");

    rerender(<PackStage scene={reduceSteps(greySteps.slice(0, greyAt + 1))} result={null} roundKey="round-1" settled={false} />);
    expect(screen.queryByTestId("flyer")).toBeNull();
    const pile = screen.getByTestId("pile-green");
    expect(pile).toHaveAttribute("data-count", "2");
    expect(pile).toHaveAttribute("data-greys", "1");
    expect(pile).toHaveClass("is-hot");
    const cards = pile.querySelectorAll(".stack-card");
    expect(cards).toHaveLength(2);
    expect(cards[1]).toHaveClass("kind-grey", "tone-grey", "is-landing", "is-shown");
    expect(cards[1]?.querySelector(".card-value")).toHaveTextContent("0×");
    expect(cards[1]?.querySelector(".card-kind")).toHaveTextContent("Grey");
    // The pile is worth what it was. The grey moved the count, not the total.
    expect(screen.getByTestId("stack-green-total")).toHaveTextContent("0.20×");
    expect(screen.getByTestId("progress-green")).toHaveTextContent("2/10");
    expect(pile.querySelector(".burst")).toHaveTextContent("0×");
    expect(screen.getByTestId("pile-blue").querySelector(".burst")).toBeNull();
    expect(screen.getByTestId("caption")).toHaveTextContent("Empty 0× joins the green stack · 2/10");
  });

  it("shows n/10 while a pile builds, then lands STACK BONUS ×2 once and keeps a STACK ×2 badge", async () => {
    const stackScript: ScriptedDraw[] = [extra, g(0.5), g(0.4), greyTo("green"), g(0.3), g(0.5), g(0.4), g(0.3), g(0.4), g(0.4), purple, greyTo("green")];
    const stackSteps = buildTimeline(resolveRound({ seed: "vis-stack", stake: 1, script: stackScript }).events);
    const bonusAt = stackSteps.findIndex((step) => step.kind === "stack_bonus");

    const errors: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => void errors.push(args[0]));
    onTestFinished(() => spy.mockRestore());

    // Nine cards: the marker reads 9/10 and is lit as "close".
    const nine = stackSteps.findIndex((step) => step.kind === "boost");
    const { rerender } = render(<PackStage scene={reduceSteps(stackSteps.slice(0, nine + 1))} result={null} roundKey="stack-1" settled={false} />);
    expect(screen.getByTestId("progress-green")).toHaveTextContent("9/10");
    expect(screen.getByTestId("progress-green")).toHaveClass("is-near");
    expect(screen.getByTestId("goal10-green")).toHaveTextContent("10→×2");
    expect(screen.getByTestId("goal20-green")).toHaveTextContent("20→×4");
    expect(screen.queryByTestId("fullstack-green")).toBeNull();
    expect(screen.queryByTestId("stack-bonus-green")).toBeNull();
    expect(screen.getByTestId("stack-green-total")).toHaveAttribute("data-total", "6.40×");

    // The 10th card is a grey. It lands first, at the same 6.40×.
    rerender(<PackStage scene={reduceSteps(stackSteps.slice(0, bonusAt))} result={null} roundKey="stack-1" settled={false} />);
    expect(screen.getByTestId("pile-green")).toHaveAttribute("data-count", "10");
    expect(screen.getByTestId("stack-green-total")).toHaveAttribute("data-total", "6.40×");
    expect(screen.queryByTestId("stack-bonus-green")).toBeNull();

    // Then the bonus: ribbon on the pile, badge in the header, total doubled.
    rerender(<PackStage scene={reduceSteps(stackSteps.slice(0, bonusAt + 1))} result={null} roundKey="stack-1" settled={false} />);
    const ribbon = screen.getByTestId("stack-bonus-green");
    expect(ribbon).toHaveTextContent(/stack bonus/i);
    expect(ribbon).toHaveTextContent("×2");
    expect(ribbon.closest(".pile")).toBe(screen.getByTestId("pile-green"));
    expect(screen.getByTestId("pile-green")).toHaveClass("is-full", "is-bonus-hot");
    expect(screen.getByTestId("fullstack-green")).toHaveTextContent(/^stack ×2$/i);
    expect(screen.getAllByTestId("fullstack-green")).toHaveLength(1);
    expect(screen.getByTestId("chip-green")).toHaveTextContent("×2");
    expect(screen.getByTestId("progress-green")).toHaveTextContent("10/20");
    expect(screen.getByTestId("goal20-green")).toHaveTextContent("20→×4");
    expect(screen.getByTestId("count-green")).toHaveTextContent("10 CARDS");
    expect(screen.getByTestId("stack-green-total")).toHaveAttribute("data-total", "12.80×");
    // The figure counts up from the old total. Its first frame is 6.40×, not a flash of 12.80×.
    expect(screen.getByTestId("stack-green-total")).toHaveTextContent("6.40×");
    await waitFor(() => expect(screen.getByTestId("stack-green-total")).toHaveTextContent("12.80×"), { timeout: 2_000 });
    expect(screen.getByTestId("total-meter")).toHaveTextContent("12.80×");
    expect(screen.getByTestId("pile-green").querySelector(".pile-halo")).toBeTruthy();
    // The halo and ribbon are keyed apart from the 10th card they sit beside.
    expect(screen.getByTestId("pile-green").querySelectorAll(".stack-card")).toHaveLength(10);
    expect(errors).toEqual([]);

    // After that step the ribbon is gone and the badge stays for the rest of the round.
    rerender(<PackStage scene={reduceSteps(stackSteps)} result={null} roundKey="stack-1" settled={false} />);
    expect(screen.queryByTestId("stack-bonus-green")).toBeNull();
    expect(screen.getByTestId("fullstack-green")).toHaveTextContent(/stack ×2/i);
    expect(screen.getByTestId("stack-green-total")).toHaveTextContent("12.80×");
    expect(screen.getByTestId("pile-green")).toHaveAttribute(
      "aria-label",
      "Green pile, 10 cards, total 12.80×, Stack Bonus ×2, next 20 cards ×4",
    );
  });

  it("sends the +1 PACK card under the active pack as a sealed pack, then stacks it there", () => {
    const chain: ScriptedDraw[] = [extra, extra, extra, extra, g(0.1), g(0.1)];
    const { steps } = timeline(chain);
    const tuck = steps.findIndex((step) => step.kind === "tuck");
    const { rerender } = mount(reduceSteps(steps.slice(0, tuck + 1)));
    const flyer = screen.getByTestId("flyer");
    expect(flyer).toHaveClass("phase-travel", "kind-extra", "target-boosters");
    expect(flyer.querySelector(".face-front")).toHaveTextContent("+1");
    // The card turns into a pack on the way down, so what slides under is a pack.
    expect(screen.getByTestId("flyer-pack").querySelector("[data-brand='rainbet']")).toBeTruthy();
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "0");
    expect(screen.queryByTestId("booster-1")).toBeNull();

    rerender(<PackStage scene={reduceSteps(steps.slice(0, tuck + 2))} result={null} roundKey="round-1" settled={false} />);
    expect(screen.queryByTestId("flyer")).toBeNull();
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "1");
    expect(screen.getByTestId("booster-1")).toHaveAttribute("data-depth", "1");
    expect(screen.getByTestId("booster-count")).toHaveTextContent("+1");
    expect(screen.getByTestId("pack-meter").parentElement).toHaveTextContent("+1 waiting");

    // Four earned: three wrappers are drawn, each one step further out, and the chip has the exact count.
    const earns = steps.map((step, index) => (step.kind === "earn" ? index : -1)).filter((index) => index >= 0);
    rerender(<PackStage scene={reduceSteps(steps.slice(0, earns[3]! + 1))} result={null} roundKey="round-1" settled={false} />);
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "4");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-pack-count", String(1 + QUEUE_LAYERS));
    expect([1, 2, 3].map((depth) => screen.getByTestId(`booster-${depth}`).style.getPropertyValue("--i"))).toEqual(["1", "2", "3"]);
    expect(screen.queryByTestId("booster-4")).toBeNull();
    expect(screen.getByTestId("booster-count")).toHaveTextContent("+4");
    expect(screen.getAllByText("RAINBET")).toHaveLength(1 + QUEUE_LAYERS);
  });

  it("keeps the felt clear: no legend on the table and one compact HUD", () => {
    mount(initialScene());
    const stage = screen.getByTestId("stage");
    expect(stage.querySelector(".card-legend")).toBeNull();
    expect(stage.querySelector(".legend-row")).toBeNull();
    expect(stage).not.toHaveClass("show-legend");
    const hud = screen.getByTestId("hud");
    expect(hud.querySelectorAll(".meter")).toHaveLength(3);
    expect(hud).toContainElement(screen.getByTestId("pack-meter"));
    expect(hud).toContainElement(screen.getByTestId("total-meter"));
    expect(hud).toContainElement(screen.getByTestId("payout-meter"));
    // Empty piles are quiet placeholders with no card and no footer figures.
    expect(screen.getByTestId("pile-green")).toHaveClass("is-empty");
    expect(screen.getByTestId("pile-green").querySelector(".card")).toBeNull();
  });

  it("draws a tall green pile as a faced stack, not one stripe per card", () => {
    const base = initialScene();
    const cards = Array.from({ length: 27 }, (_, index) => ({
      id: `g${index}`,
      kind: "value" as const,
      valueMicros: index === 26 ? 130_000n : 200_000n,
      state: "idle" as const,
    }));
    const green: StackView = {
      ...base.stacks.green,
      cards,
      totalMicros: 7_900_000n,
      stackBonusFactor: 2,
      stackBonusKey: "seal",
    };
    const scene = {
      ...base,
      status: "playing" as const,
      stacks: { ...base.stacks, green, blue: { ...base.stacks.blue, cards: [{ id: "b0", kind: "value" as const, valueMicros: 1_500_000n, state: "idle" as const }], totalMicros: 1_500_000n } },
    };
    render(<PackStage scene={scene} result={null} roundKey="tall" settled={false} />);
    const pile = screen.getByTestId("pile-green");
    expect(pile).toHaveAttribute("data-count", "27");
    expect(pile).toHaveAttribute("data-shown", String(VISIBLE_FACES));
    expect(pile.querySelectorAll(".stack-card")).toHaveLength(27);
    expect(pile.querySelectorAll(".stack-card.is-shown")).toHaveLength(VISIBLE_FACES);
    expect(pile.querySelectorAll(".stack-card.is-buried")).toHaveLength(27 - VISIBLE_FACES);
    expect(screen.getByTestId("thickness-green")).toBeInTheDocument();
    expect(screen.getByTestId("count-green")).toHaveTextContent("27 CARDS");
    expect(screen.getByTestId("progress-green")).toHaveTextContent("20/20");
    expect(screen.getByTestId("goal20-green")).toHaveTextContent("20→×4");
    expect(screen.getByTestId("stack-green-total")).toHaveTextContent("7.90×");
    const front = pile.querySelectorAll(".stack-card")[26];
    expect(front?.querySelector(".card-art .hero-green")).toBeTruthy();
    expect(front?.querySelector(".card-value")).toHaveTextContent("0.13×");
    expect(front?.querySelector(".card-value")).not.toHaveTextContent("7.90×");
    expect(screen.getByTestId("fullstack-green").closest(".card")).toBeNull();
    expect(screen.getByTestId("pile-gold").querySelector(".landing-hint")).toBeTruthy();
    expect(screen.getByTestId("pile-gold").querySelector(".card")).toBeNull();
    expect(screen.getByTestId("pack")).toHaveTextContent(/merge packs/i);
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
