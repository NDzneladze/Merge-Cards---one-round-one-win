# Merge Packs v0.13 — Grey is a large part of the pack

v0.13 keeps the v0.12 table, pack, HUD, card art and both stack milestones. The change is how often Grey is dealt, and the denomination retune that keeps the prototype near 0.95× after that.

Grey is still a 0× card. It still takes one of the six positions, still flies into a pile that already holds a card (or any eligible pile when the table is empty), and still counts toward 10 → Stack ×2 and 20 → total Stack ×4. It still draws Purple onto the biggest physical pile. It still pays nothing, and it is still not a bust, a boost or a pack. ×4 still replaces ×2. It does not become ×8. Red still ends the round at 0×.

`DEMO_CONFIG_ID` is `merge-packs-demo-v0.13`. Placeholder math. Not a certified RTP.

## Grey weights

The product target was about 40% of Easy draws, 40% of Medium draws and 25% of Hard draws. That is what shipped. The extra weight was taken from value cards. Red, Purple, Gold and +1 PACK are the v0.12 weights. Red was not raised.

| | v0.12 | v0.13 | Taken from |
| --- | ---: | ---: | --- |
| Easy | 180 / 1000 = 18.0% | **400 / 1000 = 40.0%** | Green 632 → 383, and 29 of that green weight moved to Blue |
| Medium | 180 / 1000 = 18.0% | **400 / 1000 = 40.0%** | Green 618 → 369, and 29 of that green weight moved to Blue |
| Hard | 110 / 1000 = 11.0% | **250 / 1000 = 25.0%** | Blue 526 → 386 |

Each Grey weight is more than double v0.12 (2.22× / 2.22× / 2.27×).

Blue's draw weight rose because a green-only denomination retune could not put Easy or Medium back near 0.95× while green stayed mostly 0.10×–0.20×. Blue keeps the same uniform 1.00×–3.00× table. It is still the uncommon card: 4.9% on Easy (was 2.0%) and 5.1% on Medium (was 2.2%). Gold stays 0.5% on Medium and 1.6% on Hard.

Shipped draw, 500,000 rounds, seeds `sim-{mode}-0` … `499999`. A red card stops the pack early, so Greys per opened pack sit below `6 × weight`.

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Grey per round | **2.596** | **2.368** | **0.779** |
| Grey per opened pack | 1.974 | 1.894 | 0.754 |
| Rounds with ≥1 Grey | 82.79% | 79.99% | 46.14% |
| ≥2 Grey | **65.28%** | **61.16%** | **20.36%** |
| ≥3 Grey | 45.74% | 41.71% | 8.00% |

Against the v0.12 500k report (1.170 / 1.064 / 0.343 Greys per round, and ≥2 Grey on 31.8% / 28.8% / 6.2% of rounds). A non-busted Easy or Medium opening now usually shows two or more Greys. Hard shows one in almost half of rounds and two or more in one round in five, while still busting 90%.

## What 40/40/25 did before the retune

200,000 rounds, the v0.12 denomination tables, Grey at 400 / 400 / 250, and Blue, Gold, Purple, Red and +1 PACK left at the v0.12 weights. Standard error is the sample standard deviation over sqrt(200,000).

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Mean | 0.6658× | 0.7368× | 0.7351× |
| Standard error | ±0.0043× | ±0.0048× | ±0.0064× |
| Approx. 95% for the mean | 0.657–0.674× | 0.727–0.746× | 0.723–0.748× |
| Red bust | 50.99% | 56.74% | 90.04% |

v0.12's 500k means were 0.9493× / 0.9566× / 0.9563×. Swapping value cards for Grey, and changing nothing else, pulled the means down by about 0.22× to 0.28×. A 12,000-round look at the neighbouring Grey rates, still on the v0.12 denominations, sat in the same place: 35/35/20% at about 0.71× / 0.80× / 0.82×, and 45/45/30% at about 0.59× / 0.70× / 0.69×. The gap is the missing value cards, not the sample. 40/40/25 is the rate that was tuned.

## Denominations

Red was left alone. Gold's weight was left alone. The retune stays inside the existing value bands, plus the Blue frequency shift above.

| Table | Change | Mean |
| --- | --- | --- |
| Easy green | 0.10× weight 27 → 12. 0.20× weight 12 → 20. A little more 0.25×–0.50×. 86% are still ≤ 0.20× (was 93%). 0.75× and 1.00× stay at weight 1. | 0.157× → 0.184× |
| Medium green | 0.10× weight 12 → 6. 0.20× weight 22 → 26. 84% are still ≤ 0.20× (was 89%). | 0.176× → 0.195× |
| Hard blue | Still 1.00×–3.00×. 1.00× weight 30 → 11, 2.00× 16 → 26, 2.50× 2 → 17, 3.00× 2 → 10. 47% are still ≤ 1.50×, against about 27% of the flat Easy/Medium blue table. | 1.336× → 1.825× |

Green is still mostly a small card. The 0.75× and 1.00× greens were not turned into a common prize. Gold odds did not move.

## 500,000 rounds of the shipped tables

Seeds `sim-{mode}-0` … `sim-{mode}-499999`, stake 1. Standard error is the sample standard deviation over sqrt(500,000). The range is mean ± 1.96 standard errors, a normal approximation for the mean only.

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Mean | **0.9474×** | **0.9521×** | **0.9550×** |
| Standard error | ±0.0032× | ±0.0034× | ±0.0051× |
| Approx. 95% for the mean | 0.9411–0.9538× | 0.9455–0.9587× | 0.9449–0.9650× |
| Red bust | 50.98% | 56.85% | 90.01% |
| Safe 0× | 0.58% | 0.54% | 0.04% |
| Below 1×, paid | 24.09% | 20.69% | 0.00% |
| Above 1× | 24.05% | 21.66% | 9.92% |
| ≥ 10× | 0.70% | 1.54% | 3.29% |
| ≥ 25× | 0.10% | 0.07% | 0.31% |
| Rounds with an Extra Pack | 27.78% | 24.86% | 9.08% |
| Mean / max packs | 1.315 / 6 | 1.251 / 6 | 1.033 / 5 |
| Stack ×2 triggered / still paid | 8.10% / 5.58% | 5.19% / 3.45% | 0.31% / 0.19% |
| Grey was the 10th card | 3.80% | 2.41% | 0.12% |
| Stack ×4 triggered / still paid | 0.47% / 0.34% | 0.20% / 0.14% | one seed / under 0.01% |
| Grey was the 20th card | 0.20% | 0.09% | under 0.01% |
| Purple + Stack ×2 still paid | 1.59% | 0.78% | 0.06% |
| Purple + Stack ×4 still paid | 0.15% | 0.05% | 0.00% |
| p99 / p99.9 | 8.48× / 25.14× | 12.46× / 22.84× | 17.50× / 35.20× |
| Maximum observed | 202.85× | 198.40× | 195.20× |

Easy's whole interval sits inside 0.94–0.96×. Medium's does too. Hard's point estimate is inside the band. Hard's interval reaches 0.9650×, about half a hundredth past 0.96, the same shape of uncertainty as the v0.12 Hard report.

Side by side with the v0.12 500k report and the raw 40/40/25 run:

| | Easy v0.12 | Easy raw 40% | Easy v0.13 | Medium v0.12 | Medium raw 40% | Medium v0.13 | Hard v0.12 | Hard raw 25% | Hard v0.13 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Sample | 500k | 200k | 500k | 500k | 200k | 500k | 500k | 200k | 500k |
| Mean | 0.9493× | 0.6658× | **0.9474×** | 0.9566× | 0.7368× | **0.9521×** | 0.9563× | 0.7351× | **0.9550×** |
| Red bust | 50.88% | 50.99% | 50.98% | 56.91% | 56.74% | 56.85% | 90.01% | 90.04% | 90.01% |
| ≥2 Grey | 31.84% | 65.41% | **65.28%** | 28.81% | 61.23% | **61.16%** | 6.21% | 20.34% | **20.36%** |
| ≥ 10× | 0.86% | 0.47% | 0.70% | 1.63% | 1.39% | 1.54% | 2.92% | 2.00% | 3.29% |
| Extra Pack rounds | 27.82% | — | 27.78% | 24.90% | — | 24.86% | 9.07% | — | 9.08% |
| Stack ×2 still paid | 8.07% | — | 5.58% | 5.59% | — | 3.45% | 0.21% | — | 0.19% |

Bust rates and +1 PACK rates match v0.12. Red's weight did not change. Rounds that pay nothing without a red stay under 1%. The player still sees a value card. Above-1× finishes are 24% / 22% / 10%, close to v0.12's 22% / 21% / 10%.

Stack ×2 is paid a bit less often than in v0.12. Easy and Medium still have the same share of physical cards, but more of those cards are Grey, and more of the value cards are Blue, which sits on its own pile. One pile fills a little less often. Grey is more often the card that crosses the line: 3.80% of Easy rounds and 2.41% of Medium rounds (v0.12 was 2.37% and 1.66%).

## 20 cards is still rare, and Grey is in the rounds that get there

The six-pack cap is 36 cards. A pile of 20 is still a chain of extra packs.

Reproducible natural seeds from the 500k sample:

| Seed | What happened |
| --- | --- |
| `sim-easy-86` | Resolved at 18.19×. Six packs, 14 Greys, both milestones. |
| `sim-medium-157` | Resolved at 13.68×. Five packs, 14 Greys, both milestones. |
| `sim-hard-177679` | Resolved at 85.60×. Four packs, 7 Greys, both milestones. This is the Hard ×4 the 500k sample found. |
| `sim-easy-414941` | The Easy maximum, 202.85×. |
| `sim-medium-220226` | The Medium maximum, 198.40×. |
| `sim-hard-257651` | The Hard maximum, 195.20×. |

Hard still opens 1.03 packs on average and busts 90% of rounds. A 20-card Hard pile is still about one round in this 500k sample. It is not a regular Hard feature. `?fixture=stack20grey` shows the upgrade on purpose: a Grey is the 10th card and the 20th card, and the pile settles at 25.60×.

## Tail risk

The highs in this 500k sample were 202.85× Easy, 198.40× Medium and 195.20× Hard. p99.9 is 25× / 23× / 35×. Hard's ≥10× rate moved from 2.92% to 3.29% because the surviving blue cards are richer. There is no Max Win cap in this prototype. A production version needs a separate math review, including whether a cap is required, before anyone treats these figures as economics. This note is not that review and it is not a certification.

## On the table

Nothing in the layout changed. Each pile still shows **10→×2** and **20→×4** before the first card. A Grey lands as 0×, the count steps, and the milestone bar updates. There is no new popup and no speed control.

Ordinary seeded rounds used for the recording, drawn from the same resolver as play, not a script:

- Easy `demo-11`, two packs, three Greys, settles at 4.66×.
- Medium `demo-35`, three packs, six Greys, a natural Stack ×2, settles at 7.72×.
- Hard `demo-13`, one pack, four Greys, settles at 4.20×.

## Checks

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run simulate -- 500000`
