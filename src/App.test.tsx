import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { STARTING_BALANCE_CREDITS } from "./engine/config";
import { creditsToMicros, formatMicros, formatMultiplier } from "./engine/money";
import { resolveRound } from "./engine/round";

beforeEach(() => {
  sessionStorage.clear();
});

async function openExamples(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Examples & seed"));
}

async function pinSeed(user: ReturnType<typeof userEvent.setup>, seed: string) {
  await openExamples(user);
  const input = screen.getByTestId("seed-input");
  await user.clear(input);
  await user.type(input, seed);
}

describe("App", () => {
  it("plays a pinned seed, shows the engine result in the HUD, and debits the stake once per round", async () => {
    const user = userEvent.setup();
    const seed = "demo-19";
    const stake = 10;
    const engine = resolveRound({ seed, stake });
    expect(engine.tier).toBe("win");
    render(<App />);

    expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(creditsToMicros(STARTING_BALANCE_CREDITS)));
    await user.click(screen.getByTestId("speed-instant"));
    await pinSeed(user, seed);
    await user.click(screen.getByTestId("play-button"));

    await waitFor(() => expect(screen.getByTestId("total-meter")).toHaveTextContent(formatMultiplier(engine.multiplierMicros)));
    expect(screen.getByTestId("payout-meter")).toHaveTextContent(`+${formatMicros(engine.payoutMicros)}`);
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(screen.queryByText(/play again/i)).toBeNull();
    expect(screen.getByTestId("chip-green")).toHaveTextContent("×2");

    const afterOne = creditsToMicros(STARTING_BALANCE_CREDITS) - creditsToMicros(stake) + engine.payoutMicros;
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(afterOne)));

    await user.click(screen.getByTestId("play-button"));
    const afterTwo = afterOne - creditsToMicros(stake) + engine.payoutMicros;
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(afterTwo)));
  });

  it("plays the featured Red seed to an instant 0× with a struck board", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("speed-instant"));
    await openExamples(user);
    await user.click(screen.getByRole("button", { name: "Red" }));
    await user.click(screen.getByTestId("play-button"));
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveClass("status-bust", "bust-dead"));
    expect(screen.getByTestId("total-meter")).toHaveTextContent("0.00×");
    expect(screen.getByTestId("payout-meter")).toHaveTextContent("0.00");
    expect(screen.getByTestId("red-strike")).toBeInTheDocument();
    expect(document.querySelectorAll(".stack-card.is-dying").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    const balance = creditsToMicros(STARTING_BALANCE_CREDITS) - creditsToMicros(10);
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(balance)));
  });

  it("opens the celebration only for a high-tier win and lets it be dismissed", async () => {
    const user = userEvent.setup();
    const engine = resolveRound({ seed: "demo-335", stake: 10 });
    expect(engine.tier).toBe("mega");
    render(<App />);
    await user.click(screen.getByTestId("speed-instant"));
    await openExamples(user);
    await user.click(screen.getByRole("button", { name: "Mega" }));
    await user.click(screen.getByTestId("play-button"));
    const overlay = await screen.findByTestId("win-overlay");
    expect(overlay).toHaveTextContent("MEGA WIN");
    expect(overlay).toHaveTextContent(formatMultiplier(engine.multiplierMicros));
    expect(overlay).not.toHaveTextContent(/play again/i);
    expect(screen.getByTestId("total-meter")).toHaveTextContent(formatMultiplier(engine.multiplierMicros));
    await user.click(overlay);
    expect(screen.queryByTestId("win-overlay")).toBeNull();
    expect(document.querySelectorAll(".stack-card").length).toBeGreaterThan(0);
  });

  it("explains Purple and Red in the rules, and keeps the shell on a narrow layout", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Rules" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/PURPLE/);
    expect(screen.getByRole("dialog")).toHaveTextContent(/RED/);
    expect(screen.getByRole("dialog")).toHaveTextContent(/Not a validated RTP/);
    await user.click(screen.getByRole("button", { name: "Close" }));

    const app = screen.getByTestId("app");
    expect(app).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflowX: "hidden" });
  });
});
