# Merge Packs v0.11 — Purple follows the physical pile

**Demo simulation only. Not a certified RTP. Not approved production math.**

v0.11 changes one rule and three denomination tables. The table, the pack, the HUD, the seven card types, Purple ×2, Stack Bonus ×2 at 10 physical cards, the +1 PACK chain, the six-pack cap, and the single final settlement are the v0.10 ones. `DEMO_CONFIG_ID` is `merge-packs-demo-v0.11`.

There is no speed control, no cashout, and no win popup below 10×.

## The rule

Purple targets the pile with the most **physical cards**. Green, Blue, Gold and Grey all count. Purple, Red and +1 PACK never join a pile, so they never add to the count.

1. Highest physical count.
2. Tie: the highest current total, with Purple factors and Stack Bonus already applied.
3. Tie: the leftmost eligible pile.
4. If every eligible pile is empty, the leftmost pile. That is Green on Easy and Medium, Blue on Hard.

A pile of only Grey cards is occupied. Purple can land on it. The pile stays 0× until a value card joins, and that card is multiplied. Grey still adds no prize of its own.

Grey routing is unchanged: a random occupied eligible pile, or any eligible pile when the table is empty, from the separate `seed + "#grey-route"` stream. The card stream is untouched, so a seed deals the same kinds as in v0.10.

### Worked example

Green holds three 0.10× cards and two greys: **5 cards, 0.30×**. Blue holds four 3.00× cards: **4 cards, 12.00×**. Purple goes to Green. Green becomes 0.60×. The next green, 0.10×, is doubled too, so Green finishes at 0.80× and the board at 12.80×.

Open it on the preview:

- `?fixture=purplecount` plays the round
- `?fixture=purplecount&at=boost:1` stops on the Purple landing
- `?fixture=purplecount&slow=4` is the same round, four times slower

Grey-only: two greys sit on Blue, Green is empty, Purple lands on Blue at **0.00×**. The 1.00× blue that follows becomes 2.00×. Two 0.50× greens stay unboosted. The board finishes at 3.00×.

- `?fixture=purplegrey`
- `?fixture=purplegrey&at=boost:1`

## What the rule did to the v0.10 weights

100,000 rounds, seeds `sim-{mode}-0` … `sim-{mode}-99999`, stake 1. Same weights, same denominations. Only Purple's count changed, from value cards to physical cards.

On those seeds Purple chose a different pile on **1.16%** of Easy purples (179 of 15,462), **1.92%** of Medium purples (203 of 10,548) and **1.23%** of Hard purples (100 of 8,139).

| | Easy v0.10 | Easy, new rule | Medium v0.10 | Medium, new rule | Hard v0.10 | Hard, new rule |
|---|---:|---:|---:|---:|---:|---:|
| Mean | 1.017× | 1.0164× | 0.968× | 0.9674× | 0.992× | 0.9910× |
| Standard error | | ±0.0071× | | ±0.0072× | | ±0.0117× |
| Red bust | 51.20% | 51.20% | 56.66% | 56.66% | 89.96% | 89.96% |
| Above 1× | 26.03% | 26.00% | 22.51% | 22.48% | 10.04% | 10.04% |
| ≥ 10× | 0.80% | 0.80% | 1.54% | 1.54% | 3.12% | 3.12% |
| Stack Bonus triggered | 12.12% | 12.12% | 8.89% | 8.89% | 0.41% | 0.41% |
| Stack Bonus still paid | 8.65% | 8.65% | 6.15% | 6.15% | 0.25% | 0.25% |
| Purple + Stack Bonus paid | 2.35% | 2.35% | 1.25% | 1.25% | 0.08% | 0.08% |
| p99 | 9.08× | 9.08× | 12.40× | 12.40× | 17.20× | 17.20× |
| Maximum observed | 120.58× | 120.58× | 50.23× | 44.16× | 151.20× | 151.20× |

The mean moved by about 0.001×, which is smaller than the standard error of a 100k sample. Bust, Extra Pack and Stack Bonus counts did not move, because those depend on which cards are drawn, not on where Purple lands. One Medium round did: the largest Medium result in that 100k fell from 50.23× to 44.16× because its Purple landed on a different pile.

Easy was still above 1.00× (1.016×). That is the figure the rebalance below starts from.

## What was retuned, and why

Draw weights were left alone, including Red. A one-point cut to Medium's Gold weight (5 → 4 per-mille, given to Green) dropped a 100k mean from 0.967× to 0.934× and skipped the band, so Gold stayed at 5 per-mille and 5.00×–15.00×.

Easy's value is mostly Green, so Easy and Medium do not share a green table any more. The same green shift that brings Easy to 0.95× pushes Medium under the band.

### Easy green — weights out of 100

| Value | v0.10 | v0.11 |
|---:|---:|---:|
| 0.10× | 30 | **36** |
| 0.12× | 23 | 23 |
| 0.13× | 19 | 19 |
| 0.15× | 9 | 9 |
| 0.18× | 4 | **3** |
| 0.20× | 3 | 3 |
| 0.25× | 3 | **1** |
| 0.30× | 3 | **2** |
| 0.40× | 2 | **1** |
| 0.50× | 2 | **1** |
| 0.75× | 1 | 1 |
| 1.00× | 1 | 1 |

Mean 0.1610× → **0.1482×**. Share at or below 0.20×: 88% → **93%**. The 0.75× and 1.00× cards are still in the table. Easy needed about 0.067× off a 1.016× mean, and Green is where that value sits.

### Medium green — weights out of 100

| Value | v0.10 | v0.11 |
|---:|---:|---:|
| 0.10× | 30 | **31** |
| 0.50× | 2 | **1** |
| every other denomination | unchanged | unchanged |

Mean 0.1610× → **0.1570×**. Share at or below 0.20×: 88% → **89%**. Medium only needed about 0.017× off 0.967×. One card of weight moved from 0.50× to 0.10×.

### Hard blue — weights out of 100, still 1.00×–3.00×

| Value | v0.10 | v0.11 |
|---:|---:|---:|
| 1.00× | 46 | **48** |
| 1.05× | 14 | 14 |
| 1.10× | 12 | 12 |
| 1.20× | 9 | **11** |
| 1.50× | 8 | **7** |
| 2.00× | 6 | **4** |
| 2.50× | 3 | **2** |
| 3.00× | 2 | 2 |

Mean 1.222× → **1.186×**. Hard has no Green. Red stayed at 290 per-mille. The common blue cards got a little smaller and the 3.00× card kept its weight, so a safe Hard round is still a hit and the bust rate stays near 90%.

A lower table (blue mean 1.1675×) looked like 0.954× on 100k rounds and came out at 0.938× on 500k. That is under the band, so the shipped table is the milder one above. The 100k figure was not treated as final.

Unchanged: every draw weight, Easy and Medium blue (uniform 1.00×–3.00×), Gold (uniform 5.00×–15.00×), Purple ×2, Stack Bonus at 10 cards ×2, six cards per pack, six packs maximum.

## 500,000 rounds of the shipped tables

Seeds `sim-{mode}-0` … `sim-{mode}-499999`, stake 1, `npm run simulate -- 500000`. The standard error is the sample standard deviation divided by sqrt(500,000). The range next to it is mean ± 1.96 standard errors, a normal approximation for the **mean only**. The payout distribution is skewed. This is not a certified RTP.

| | Easy | Medium | Hard |
|---|---:|---:|---:|
| Mean | **0.9495×** | **0.9522×** | **0.9507×** |
| Standard error | ±0.0033× | ±0.0032× | ±0.0049× |
| Approx. 95% for the mean | 0.9431–0.9559× | 0.9458–0.9585× | 0.9411–0.9603× |
| Red bust | 51.00% | 56.85% | 89.98% |
| Safe 0× | 0.00% | 0.00% | 0.00% |
| Safe, below 1× | 25.17% | 21.36% | 0.00% |
| Exactly 1× | 0.30% | 0.30% | 0.00% |
| Above 1× | 23.54% | 21.49% | 10.02% |
| ≥ 10× | 0.68% | 1.54% | 3.00% |
| ≥ 25× | 0.08% | 0.06% | 0.25% |
| Rounds with an Extra Pack | 27.81% | 24.94% | 9.06% |
| Extra Packs earned per round | 0.426 | 0.360 | 0.100 |
| Stack Bonus triggered | 12.12% | 8.87% | 0.38% |
| Stack Bonus still paid | 8.59% | 6.12% | 0.22% |
| Purple + Stack Bonus paid | 2.29% | 1.23% | 0.06% |
| Mean / max packs | 1.315 / 6 | 1.251 / 6 | 1.033 / 5 |
| p99 / p99.9 | 8.44× / 22.88× | 12.45× / 21.60× | 16.70× / 33.55× |
| Maximum observed | 613.12× | 80.41× | 142.00× |

All three point estimates sit inside the exploratory 0.94–0.96× band. Hard's interval reaches 0.960×, just past the top of that band. The point estimate is 0.951×.

Bust versus the v0.10 100k report: Easy −0.20 points, Medium +0.19 points, Hard +0.02 points. Red's weight did not change, so that gap is the longer sample of the same red odds. It is inside the ±1 point bound. Hard still busts about 90% of rounds. A safe Hard finish still pays at least 1×, because every Hard prize card is at least 1×.

Extra Pack and Stack Bonus still happen. Easy still triggers Stack Bonus on 12% of rounds. Hard still reaches 10× on 3% of rounds and 25× on 0.25%. Easy's ≥10× rate fell from 0.80% to 0.68% because the green cards inside those piles are smaller, not because the bonus stopped.

The maxima are single rounds. Easy's 613.12× (`sim-easy-481466`) is six packs, 25 greens, six Purples on that pile (×64) and one Stack Bonus (×2). p99.9 on Easy is 22.88×. A 500k sample reaches further into that tail than the v0.10 100k sample, so the maxima are not a like-for-like comparison with 120.58× / 50.23× / 151.20×.
