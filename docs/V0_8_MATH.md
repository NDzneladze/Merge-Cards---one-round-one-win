# Merge Packs v0.8 — experimental math notes

**Demo simulation only. Not a certified RTP. Not approved production math.**

v0.7 samples do not describe this build. Grey removes prize cards, and Full Stack doubles a pile of 10 value cards. The weights below are a new experimental set.

## Pile formula

```
pilePayoutMultiplier = sum(value cards in that pile) × (2 ^ purpleBoostsOnPile) × (fullStack ? 2 : 1)
finalMultiplier      = sum(pilePayoutMultiplier)
```

`2 ^ purpleBoosts` is the stored `factor` (each purple is ×2 and they compound). Full Stack does not change the card count. It unlocks once, on the 10th value card of that colour, and stays on for every later value card in the pile. An 11th or 20th card does not unlock it again. A second colour unlocks on its own. Purple, red, +1 PACK and grey never count toward the 10.

Purple still targets the most value cards, then the highest current pile total (purple and Full Stack included), then the leftmost pile.

A red card sets the final multiplier to 0, clears every pile (including Full Stack) and cancels every queued pack. One stake is debited. One `round_end` is emitted.

## Grey

Grey is its own draw weight on every difficulty. It is not a copy of that mode's green weight. A grey card occupies one of the six slots, pays 0×, and does not bust, join a pile, earn a pack, change purple targeting, or count toward Full Stack.

Six greys and no red is a safe **0× no win / zero return**. It is not a bust. A safe result with payout above 0 and below 1× is a **return**.

## Weights (per-mille, sum 1000)

| | Green | Blue | Gold | Grey | Purple | Red | +1 PACK |
|---|---:|---:|---:|---:|---:|---:|---:|
| Easy | 724 | 20 | 0 | 88 | 24 | 78 | 66 |
| Medium | 704 | 22 | 5 | 94 | 18 | 96 | 61 |
| Hard | 0 | 586 | 16 | 50 | 26 | 290 | 32 |

Hard's red weight is 290, the same per-card rate as v0.7. Grey on Hard was taken from Blue, not from Red. Green denominations are unchanged (88% of green cards are ≤ 0.20×). Blue on Hard stays weighted toward 1.00×–1.25×. Gold stays 5.00×–15.00×.

The 0.94–0.96× band is a prototype tuning hypothesis. The 100,000-round run below landed next to it, not on a certified target.

## 100,000 deterministic rounds per difficulty

Seeds `sim-{difficulty}-{0..99999}`, stake 1. Fixed engine, no UI randomness.

| | Easy | Medium | Hard |
|---|---:|---:|---:|
| Mean multiplier | 0.971× | 0.935× | 0.979× |
| Red bust | 51.20% | 56.66% | 89.96% |
| Safe 0× (no win) | 0 observed | 0 observed | 0 observed |
| Safe sub-1× return | 22.48% | 20.62% | 0.00% |
| Exactly 1× | 0.41% | 0.34% | 0.00% |
| Profitable (>1×) | 25.91% | 22.39% | 10.04% |
| ≥10× | 0.78% | 1.51% | 3.12% |
| Rounds with a bonus pack | 27.79% | 24.89% | 9.14% |
| Grey cards / round | 0.573 | 0.556 | 0.159 |
| Full Stack triggered | 8.79% | 6.25% | 0.28% |
| Full Stack still paid | 6.12% | 4.19% | 0.17% |
| Purple on that pile (triggered) | 2.31% | 1.25% | 0.06% |
| Purple + Full Stack paid | 1.53% | 0.78% | 0.04% |
| Mean / max packs opened | 1.313 / 6 | 1.251 / 6 | 1.033 / 4 |
| p50 / p90 / p99 / p99.9 | 0 / 2.80 / 8.91 / 24.24× | 0 / 2.60 / 12.28 / 22.00× | 0 / 4.00 / 17.05 / 32.10× |
| Maximum observed | 120.58× `sim-easy-25770` | 50.23× `sim-medium-71400` | 151.20× `sim-hard-43278` |

### Why this is not the v0.7 picture

v0.7 had no grey and no Full Stack, and its comment described a placeholder mean near 0.93–0.94×. Those weights are not reused. Easy's 100k mean is 0.971× (just above the hypothesis) because a green Full Stack is common enough, about 9% of rounds, to put back more than the 8.8% grey cards take out. Medium is 0.935×, just under the band: gold is still rare, red is 9.6%, and Full Stack pays on about 4% of rounds. Hard is 0.979× with a 89.96% red bust. That mean is a tail (p90 is still 0× until the 4.00× mark, max 151.20×). Cutting Hard's red weight would have been the direct way to pin 0.95×, and it was not done.

### Is 10 cards a meaningful bonus under the 6-pack cap?

On Easy and Medium, yes. A round can open up to 6 packs (36 cards). Green is about 70% of draws, so a pile of 10 greens happens on roughly 6–9% of rounds and is paid when red does not arrive later. Featured natural seeds: `demo-2` on Easy (Full Stack, no purple, 2.50×) and `demo-104` on Easy (Full Stack and purple on the same pile, 10.80×).

On Hard it is a tail, not a regular feature. Red is 29% per card, so about 90% of rounds die in the opening pack, and a second pack opens on only about 3% of rounds. Ten blue cards inside that window showed up on 0.28% of 100,000 rounds (`sim-hard-80` triggers it; `sim-hard-682` also puts purple on that pile). That is the cost of keeping Hard's bust rate. Softening red to make Full Stack common would stop Hard being the extreme mode.

A safe all-grey 0× did not appear in these 100,000 rounds. Non-red cards are still mostly prizes, so a whole pack of blanks is far inside the tail. The engine test for six scripted greys is what locks the "no win", not "bust", label.
