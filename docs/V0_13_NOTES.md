# Merge Packs v0.13 — Grey is a large part of the deal

v0.13 keeps the v0.12 table, cards, pack and the two stack milestones. The change is how often Grey is dealt.

Grey is still 0×. It still takes one slot in the pack, still flies into an occupied eligible pile (or any eligible pile if the table is empty), and still counts toward 10 → Stack ×2 and 20 → total Stack ×4. It still draws Purple onto the biggest physical pile. The ×4 tier is still the total factor, not an extra ×4 on top of ×2.

`DEMO_CONFIG_ID` is `merge-packs-demo-v0.13`. Placeholder math. Not a certified RTP.

## Grey weights

The extra Grey weight comes from value cards. Red, Purple and +1 PACK are unchanged. Red was not raised.

| | v0.12 | v0.13 | Where the weight came from |
| --- | ---: | ---: | --- |
| Easy | 180 / 1000 = 18% | **400 / 1000 = 40%** | Green 632 → 399, and 13 of that moved on to Blue (20 → 33) |
| Medium | 180 / 1000 = 18% | **400 / 1000 = 40%** | Green 618 → 375, Blue 22 → 45. Gold stays 5 |
| Hard | 110 / 1000 = 11% | **250 / 1000 = 25%** | Blue 526 → 386 |

Green is still the common value card on Easy and Medium. Blue is a little less rare, because a 40% Grey rate with the old 2% Blue left the mean well under 0.95× even after the greens were lifted inside their band.

## What 40/40/25 did before the retune

50,000 rounds, the v0.12 denomination tables, Grey already at 400 / 400 / 250, and the value weight still sitting on Green (Easy blue still 2.0%, Medium blue 2.2% and gold 0.5%, Hard blue 38.6% at the v0.12 blue table).

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Mean | 0.6556× | 0.7350× | 0.7609× |
| Standard error | ±0.0085× | ±0.0094× | ±0.0132× |
| Red bust | 51.04% | 56.38% | 89.76% |
| Grey per round | 2.601 | 2.383 | 0.783 |
| Rounds with ≥2 Greys | 65.53% | 61.72% | 20.51% |

v0.12's 500k means were 0.9493× / 0.9566× / 0.9563×. Swapping that many value cards for Grey dropped the means by about 0.20× to 0.29×. The stack milestones did not put the value back.

## Denominations

Green stays in 0.10×–1.00× and is still mostly ≤ 0.20×. Blue on Hard stays in 1.00×–3.00×. Gold stays 5.00×–15.00× and its Medium weight stays 5.

| Table | Change | Share ≤ 0.20× | Mean |
| --- | --- | ---: | ---: |
| Easy green | Weight moves from 0.10×–0.13× toward 0.18×–0.20×, with a slightly thicker 0.30×–0.50× tail. 0.75× and 1.00× stay. | 93% → 80% | 0.157× → 0.224× |
| Medium green | The same direction, a smaller step. | 89% → 82% | 0.176× → 0.213× |
| Hard blue | Weight moves from 1.00× toward 2.00×–2.50×. The 3.00× card stays at weight 8. | — | 1.336× → 1.814× |

Medium's green mean in the shipped table is 0.213×. The v0.12 Medium green mean was 0.176×.

Easy also gives Blue 33 per mille instead of 20, and Medium gives Blue 45 instead of 22. That is the relative-color move. Gold was not increased.

## 500,000 rounds of the shipped tables

Seeds `sim-{mode}-0` … `sim-{mode}-499999`, stake 1. Standard error is the sample standard deviation over sqrt(500,000). The range is mean ± 1.96 standard errors.

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Mean | **0.9479×** | **0.9491×** | **0.9500×** |
| Standard error | ±0.0036× | ±0.0034× | ±0.0051× |
| Approx. 95% for the mean | 0.9409–0.9549× | 0.9424–0.9558× | 0.9400–0.9600× |
| Red bust | 50.98% | 56.85% | 90.01% |
| Safe 0× | 0.58% | 0.54% | 0.04% |
| Below 1×, paid | 23.88% | 20.43% | 0.00% |
| Above 1× | 24.03% | 21.81% | 9.91% |
| ≥ 10× | 0.79% | 1.55% | 3.24% |
| ≥ 25× | 0.13% | 0.08% | 0.31% |
| Extra Pack rounds | 27.78% | 24.86% | 9.08% |
| Mean / max packs | 1.315 / 6 | 1.251 / 6 | 1.033 / 5 |
| Grey per round / per opened pack | 2.596 / 1.974 | 2.368 / 1.894 | 0.779 / 0.754 |
| Rounds with ≥1 / ≥2 / ≥3 Greys | 82.79% / 65.28% / 45.74% | 79.99% / 61.16% / 41.71% | 46.14% / 20.36% / 8.00% |
| Stack ×2 triggered / paid | 8.99% / 6.21% | 5.42% / 3.62% | 0.31% / 0.19% |
| Grey was the 10th card | 4.21% | 2.50% | 0.12% |
| Stack ×4 triggered / paid | 0.58% / 0.41% | 0.22% / 0.15% | one round / one round |
| Grey was the 20th card | 0.26% | 0.10% | none in this sample |
| Purple + ×2 paid / Purple + ×4 paid | 1.78% / 0.18% | 0.81% / 0.06% | 0.06% / 0.00% |
| p99 / p99.9 | 8.81× / 28.40× | 12.52× / 23.15× | 17.50× / 35.00× |
| Maximum observed | 267.49× | 224.00× | 187.20× |

Against the v0.12 500k report, Grey per round went from 1.17 / 1.06 / 0.34 to 2.60 / 2.37 / 0.78. Rounds with at least two Greys went from 32% / 29% / 6% to 65% / 61% / 20%. Bust rates stayed on the same Red weights: 50.98% / 56.85% / 90.01%, against 50.88% / 56.91% / 90.01% in v0.12.

All three intervals sit inside 0.94–0.96×. Hard's top edge is 0.9600×.

## Ordinary rounds, not only fixtures

These are natural seeds, drawn with the shipped weights:

| Seed | What a player sees |
| --- | --- |
| `demo-6` Easy | Four Greys in one pack, return 0.38×. |
| `demo-0` Easy | Four Greys, six cards on the piles, return 0.33×. |
| `demo-7` Medium | Two Greys and a 2.41× win. |
| `demo-13` Hard | Four Greys and a resolved 4.50×. |
| `sim-easy-86` | A natural Easy round that reaches Stack ×4. |
| `sim-medium-157` | A natural Medium round that reaches Stack ×4. |
| `sim-hard-177679` | The one Hard ×4 in this 500k sample. |

`?fixture=stack20grey` is still the scripted Grey 10th and Grey 20th, finishing at 25.60×. It is a replay, not the rate.

Hard still busts 90% of rounds and opens 1.03 packs on average, so a 20-card Hard pile remains about one round in 500,000. Easy pays ×4 on 0.41% of rounds. Medium pays it on 0.15%. Grey itself is the 10th card on 4.21% of Easy rounds.

Safe rounds that pay nothing rose to 0.58% Easy and 0.54% Medium, from about 0.01% in v0.12. That is the cost of a pack that can be mostly Grey. Value cards are still the majority of Easy and Medium draws (green 39.9% and 37.5%, plus blue), and a paid Easy finish is above 1× about as often as it is a sub-1× return (24.03% and 23.88%).

## Tail

The highs in this sample are 267.49× Easy (`sim-easy-414941`), 224.00× Medium (`sim-medium-220226`) and 187.20× Hard (`sim-hard-257651`). p99.9 is 28× / 23× / 35×. There is no Max Win cap. The ×4 tier still magnifies a long pile, and a production version needs a separate math review before these figures are treated as economics.
