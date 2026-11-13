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

async function pinSeed(user: ReturnType<typeof userEvent.setup>, seed: string) {
  await user.click(screen.getByText("Examples & seed"));
  const input = screen.getByTestId("seed-input");
  await user.clear(input);
  await user.type(input, seed);
}

describe("App", () => {
  it("plays a pinned seed, shows the engine result, and debits the stake once per round", async () => {
    const user = userEvent.setup();
    const seed = "ui-round";
    const stake = 10;
    const engine = resolveRound({ seed, stake });
    render(<App />);

    expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(creditsToMicros(STARTING_BALANCE_CREDITS)));
    await user.click(screen.getByTestId("speed-instant"));
    await pinSeed(user, seed);
    await user.click(screen.getByTestId("play-button"));

    const title = skullTitle(engine);
    expect(await screen.findByTestId("result-title")).toHaveTextContent(title);
    expect(screen.getByTestId("result-payout")).toHaveTextContent(
      `Payout ${formatMicros(engine.payoutMicros)} credits`,
    );
    expect(screen.getByTestId("round-seed")).toHaveTextContent(seed);

    const afterOne = creditsToMicros(STARTING_BALANCE_CREDITS) - creditsToMicros(stake) + engine.payoutMicros;
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(afterOne)));

    await user.click(screen.getByTestId("play-again"));
    expect(await screen.findByTestId("result-title")).toHaveTextContent(title);
    const afterTwo = afterOne - creditsToMicros(stake) + engine.payoutMicros;
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(afterTwo)));
  });

  it("plays the featured Skull seed to an instant 0× wipe with dead lanes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("speed-instant"));
    await user.click(screen.getByText("Examples & seed"));
    await user.click(screen.getByRole("button", { name: "Skull" }));
    await user.click(screen.getByTestId("play-button"));
    expect(await screen.findByTestId("result-title")).toHaveTextContent("SKULL 0.00×");
    expect(screen.getByTestId("result-payout")).toHaveTextContent("Payout 0.00 credits");
    expect(screen.getByTestId("stage")).toHaveClass("status-skull", "skull-dead");
    expect(screen.getByTestId("pending-meter")).toHaveTextContent("0");
    expect(screen.getByTestId("potential")).toHaveTextContent("0.00×");
    const dying = document.querySelectorAll(".pile-card.is-dying");
    expect(dying.length).toBeGreaterThan(0);
    const balance = creditsToMicros(STARTING_BALANCE_CREDITS) - creditsToMicros(10);
    await waitFor(() => expect(screen.getByTestId("balance")).toHaveTextContent(formatMicros(balance)));
  });

  it("builds the chain example into stacked lanes with six packs and no pending packs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTestId("speed-instant"));
    await user.click(screen.getByText("Examples & seed"));
    await user.click(screen.getByRole("button", { name: "Chain" }));
    await user.click(screen.getByTestId("play-button"));
    expect(await screen.findByTestId("result-title")).toHaveTextContent("FINAL WIN 3.85×");
    expect(screen.getByTestId("pack-meter")).toHaveTextContent("6");
    expect(screen.getByTestId("pending-meter")).toHaveTextContent("0");
    expect(screen.getByTestId("stage")).toHaveClass("status-won");
    const piles = document.querySelectorAll(".pile-card");
    expect(piles.length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".pile-card.is-dying")).toHaveLength(0);
    expect(document.querySelector(".flyer")).toBeNull();
  });

  it("explains Extra Pack and Skull in the rules, and keeps the shell on a narrow layout", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Rules" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/\+1 PACK/);
    expect(screen.getByRole("dialog")).toHaveTextContent(/SKULL/);
    expect(screen.getByRole("dialog")).toHaveTextContent(/Not a validated RTP/);
    await user.click(screen.getByRole("button", { name: "Close" }));

    const app = screen.getByTestId("app");
    expect(app).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflowX: "hidden" });
  });
});

function skullTitle(engine: ReturnType<typeof resolveRound>): string {
  if (engine.outcome === "loss") return `SKULL ${formatMultiplier(0n)}`;
  if (engine.multiplierMicros === 0n) return `NO WIN ${formatMultiplier(0n)}`;
  return `FINAL WIN ${formatMultiplier(engine.multiplierMicros)}`;
}
