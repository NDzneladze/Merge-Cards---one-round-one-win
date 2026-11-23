import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { STARTING_BALANCE_CREDITS } from "./engine/config";
import { creditsToMicros, formatMicros, formatMultiplier } from "./engine/money";
import { resolveRound } from "./engine/round";
import type { Difficulty } from "./engine/types";

beforeEach(() => {
  sessionStorage.clear();
});

type User = ReturnType<typeof userEvent.setup>;

async function openExamples(user: User) {
  await user.click(screen.getByText("Examples & seed"));
}

async function pinSeed(user: User, seed: string, difficulty?: Difficulty) {
  if (difficulty) await user.click(screen.getByTestId(`difficulty-${difficulty}`));
  await openExamples(user);
  const input = screen.getByTestId("seed-input");
  await user.clear(input);
  await user.type(input, seed);
}

const meterOf = (testId: string) => screen.getByTestId(testId).parentElement!;
const pileColors = () => [...document.querySelectorAll(".pile")].map((pile) => pile.getAttribute("data-testid")?.replace("pile-", ""));

describe("App", () => {
  it("plays a +1 PACK chain from one stake, keeps the boost across packs, shows the HUD-only win badge, and debits the stake once per round", async () => {
    const user = userEvent.setup();
    const seed = "demo-14";
    const stake = 10;
    const engine = resolveRound({ seed, stake, difficulty: "medium" });
    expect(engine.tier).toBe("win");
    expect(engine.openedPacks).toBe(2);
    render(<App />);

    expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(creditsToMicros(STARTING_BALANCE_CREDITS)));
    expect(screen.getByTestId("difficulty-medium")).toHaveAttribute("aria-pressed", "true");
    expect(pileColors()).toEqual(["green", "blue", "gold"]);
    expect(screen.queryByTestId("speed-1x")).toBeNull();
    expect(screen.queryByTestId("speed-2x")).toBeNull();
    expect(screen.queryByTestId("speed-instant")).toBeNull();
    expect(screen.queryByRole("group", { name: /playback speed/i })).toBeNull();
    expect(screen.queryByText(/animation only/i)).toBeNull();
    await pinSeed(user, seed);
    await user.click(screen.getByTestId("play-button"));

    await waitFor(() => expect(screen.getByTestId("payout-meter")).toHaveTextContent(`+${formatMicros(engine.payoutMicros)}`));
    expect(screen.getByTestId("total-meter")).toHaveTextContent(formatMultiplier(engine.multiplierMicros));
    expect(meterOf("payout-meter")).toHaveTextContent(`net +${formatMicros(engine.netMicros)}`);
    expect(screen.getByTestId("pack-meter")).toHaveTextContent("2/2");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "0");
    expect(screen.queryByTestId("booster-count")).toBeNull();
    expect(screen.getByTestId("win-badge")).toHaveTextContent(formatMultiplier(engine.multiplierMicros));
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(screen.queryByText(/play again/i)).toBeNull();
    // The purple from pack 1 still boosts green after the bonus pack's green cards landed.
    expect(screen.getByTestId("chip-green")).toHaveTextContent("×2");
    expect(document.querySelectorAll(".stack-card").length).toBe(engine.stacks.reduce((sum, stack) => sum + stack.cards.length, 0));

    const afterOne = creditsToMicros(STARTING_BALANCE_CREDITS) - creditsToMicros(stake) + engine.payoutMicros;
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(afterOne)));

    await user.click(screen.getByTestId("play-button"));
    const afterTwo = afterOne - creditsToMicros(stake) + engine.payoutMicros;
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(afterTwo)));
  });

  it("locks the difficulty during a round and shows only the eligible piles", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("difficulty-easy"));
    expect(screen.getByTestId("difficulty-easy")).toHaveAttribute("aria-pressed", "true");
    expect(pileColors()).toEqual(["green", "blue"]);
    await user.click(screen.getByTestId("difficulty-hard"));
    expect(pileColors()).toEqual(["blue", "gold"]);
    expect(screen.getByTestId("difficulty-blurb")).toHaveTextContent(/Blue \+ Gold only/);

    await user.click(screen.getByTestId("play-button"));
    expect(screen.getByTestId("difficulty-easy")).toBeDisabled();
    expect(screen.getByTestId("difficulty-medium")).toBeDisabled();
    expect(screen.getByTestId("difficulty-blurb")).toHaveTextContent(/Locked while the round resolves/);
    expect(screen.getByTestId("stage")).toHaveClass("mode-hard");
    expect(pileColors()).toEqual(["blue", "gold"]);
  });

  it("Easy with small greens finishes below 1×: payout is shown as a return, never a win", async () => {
    const user = userEvent.setup();
    const engine = resolveRound({ seed: "demo-21", stake: 10, difficulty: "easy" });
    expect(engine.tier).toBe("return");
    expect(engine.multiplierMicros).toBe(700_000n);
    render(<App />);
    await openExamples(user);
    await user.click(screen.getByRole("button", { name: "Small return" }));
    expect(screen.getByTestId("difficulty-easy")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("play-button"));

    await waitFor(() => expect(screen.getByTestId("result-badge")).toHaveTextContent("0.70×"));
    expect(screen.getByTestId("total-meter")).toHaveTextContent("0.70×");
    expect(screen.getByTestId("result-badge")).toHaveTextContent(/Return/);
    expect(screen.getByTestId("result-badge")).toHaveTextContent("0.70×");
    expect(screen.queryByTestId("win-badge")).toBeNull();
    expect(meterOf("total-meter")).not.toHaveTextContent(/win/i);
    expect(screen.getByTestId("payout-meter")).toHaveTextContent("+7.00");
    expect(meterOf("payout-meter")).toHaveTextContent("net −3.00");
    expect(meterOf("total-meter")).toHaveTextContent(/return · below stake/);
    expect(screen.getByTestId("caption")).toHaveTextContent(/return 0\.70× · below the stake/);
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(pileColors()).toEqual(["green", "blue"]);
    expect(document.querySelectorAll(".stack-card").length).toBe(6);
    const balance = creditsToMicros(STARTING_BALANCE_CREDITS) - creditsToMicros(10) + engine.payoutMicros;
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(balance)));
  });

  it("acknowledges a normal profitable finish with a WIN badge and no modal", async () => {
    const user = userEvent.setup();
    const engine = resolveRound({ seed: "demo-11", stake: 10, difficulty: "easy" });
    expect(engine.tier).toBe("win");
    render(<App />);
    await pinSeed(user, "demo-11", "easy");
    await user.click(screen.getByTestId("play-button"));
    await waitFor(() => expect(screen.getByTestId("win-badge")).toHaveTextContent(formatMultiplier(engine.multiplierMicros)));
    expect(screen.getByTestId("win-badge")).toHaveTextContent(/Win/);
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(screen.queryByText(/play again/i)).toBeNull();
    expect(document.querySelectorAll(".stack-card").length).toBeGreaterThan(0);
  });

  it("Hard deals only Blue and Gold into two piles", async () => {
    const user = userEvent.setup();
    const engine = resolveRound({ seed: "demo-141", stake: 10, difficulty: "hard" });
    expect(engine.tier).toBe("big");
    render(<App />);
    await openExamples(user);
    await user.click(screen.getByRole("button", { name: "Hard hit" }));
    expect(screen.getByTestId("difficulty-hard")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("play-button"));
    await waitFor(() => expect(screen.getByTestId("total-meter")).toHaveTextContent(formatMultiplier(engine.multiplierMicros)));
    expect(pileColors()).toEqual(["blue", "gold"]);
    expect(screen.queryByTestId("pile-green")).toBeNull();
    expect([...document.querySelectorAll(".stack-card")].every((card) => card.classList.contains("tone-blue") || card.classList.contains("tone-gold"))).toBe(true);
  });

  it("plays the featured Red seed: two boosters wait under the pack, then red busts at 0× and cancels both", async () => {
    const user = userEvent.setup();
    const engine = resolveRound({ seed: "demo-70", stake: 10, difficulty: "medium" });
    expect(engine.cancelledPacks).toBe(2);
    render(<App />);
    await openExamples(user);
    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.click(screen.getByTestId("play-button"));
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveClass("status-bust", "bust-dead"));
    expect(screen.getByTestId("total-meter")).toHaveTextContent("0.00×");
    expect(screen.getByTestId("payout-meter")).toHaveTextContent("0.00");
    expect(meterOf("payout-meter")).toHaveTextContent("net −10.00");
    expect(screen.queryByTestId("red-strike")).toBeNull();
    expect(screen.getByTestId("pack")).toHaveClass("pack-dead");
    expect(screen.queryByText("STOP")).toBeNull();
    expect(screen.getByTestId("pack-stack")).toHaveClass("boosters-dead");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "2");
    expect(screen.getByTestId("booster-1")).toBeInTheDocument();
    expect(screen.getByTestId("booster-2")).toBeInTheDocument();
    expect(screen.queryByTestId("booster-3")).toBeNull();
    expect(screen.getByTestId("booster-count")).toHaveTextContent("−2");
    expect(screen.getByTestId("booster-count")).toHaveClass("is-dead");
    expect(screen.getByTestId("caption")).toHaveTextContent(/0\.00×/);
    expect(screen.getByTestId("bust-badge")).toHaveTextContent(/Bust/);
    expect(screen.getByTestId("bust-badge")).toHaveTextContent("0.00×");
    expect(meterOf("total-meter")).toHaveTextContent(/bust · 0×/);
    expect(document.querySelectorAll(".stack-card.is-dying").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(screen.queryByTestId("win-badge")).toBeNull();
    const balance = creditsToMicros(STARTING_BALANCE_CREDITS) - creditsToMicros(10);
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(balance)));
  });

  it("stacks boosters under the pack while a chain is pending and counts them", async () => {
    const user = userEvent.setup();
    const engine = resolveRound({ seed: "demo-282", stake: 10, difficulty: "medium" });
    expect(engine.openedPacks).toBe(3);
    render(<App />);
    await openExamples(user);
    await user.click(screen.getByRole("button", { name: "Pack chain" }));
    await user.click(screen.getByTestId("play-button"));
    await waitFor(() => expect(screen.getByTestId("win-badge")).toHaveTextContent(formatMultiplier(engine.multiplierMicros)));
    expect(screen.getByTestId("pack-meter")).toHaveTextContent("3/3");
    expect(screen.getByTestId("pack-stack")).toHaveAttribute("data-waiting", "0");
    expect(screen.getByTestId("pack")).toHaveClass("is-bonus");
    expect(document.querySelectorAll(".stack-card").length).toBe(engine.stacks.reduce((sum, stack) => sum + stack.cards.length, 0));
  });

  it("opens the short celebration from 10× with a count-up and lets it be dismissed", async () => {
    const user = userEvent.setup();
    const engine = resolveRound({ seed: "demo-104", stake: 10, difficulty: "medium" });
    expect(engine.tier).toBe("big");
    render(<App />);
    await openExamples(user);
    await user.click(screen.getByRole("button", { name: "Big win" }));
    await user.click(screen.getByTestId("play-button"));
    const overlay = await screen.findByTestId("win-overlay");
    expect(overlay).toHaveTextContent("BIG WIN");
    expect(overlay).toHaveAttribute("aria-label", `BIG WIN ${formatMultiplier(engine.multiplierMicros)}`);
    expect(screen.getByTestId("win-count")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("win-count")).toHaveTextContent(formatMultiplier(engine.multiplierMicros)), { timeout: 1_400 });
    expect(overlay).not.toHaveTextContent(/play again/i);
    expect(overlay).not.toHaveTextContent(/tap to continue/i);
    expect(screen.getByTestId("total-meter")).toHaveTextContent(formatMultiplier(engine.multiplierMicros));
    await user.click(overlay);
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(document.querySelectorAll(".stack-card").length).toBeGreaterThan(0);
  });

  it("explains difficulty, Purple and Red in the rules, and keeps the shell on a narrow layout", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Rules" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/PURPLE/);
    expect(dialog).toHaveTextContent(/\+1 PACK/);
    expect(dialog).toHaveTextContent(/RED/);
    expect(dialog).toHaveTextContent(/GREY/);
    expect(dialog).toHaveTextContent(/FULL STACK/);
    expect(dialog).toHaveTextContent(/Easy/);
    expect(dialog).toHaveTextContent(/Hard/);
    expect(dialog).toHaveTextContent(/Not a validated RTP/);
    await user.click(screen.getByRole("button", { name: "Close" }));

    const app = screen.getByTestId("app");
    expect(app).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflowX: "hidden" });
  });
});
