# Merge Packs v0.12 — More Grey, two stack milestones

v0.12 keeps the v0.11 table, pack, HUD and card art. Two rules change.

Grey 0× is dealt more often. It still pays nothing and still joins a pile. A bigger pile is how a player reaches the new second milestone.

Stack Bonus is no longer a one-shot boolean. Each Green, Blue or Gold pile has a **total** stack factor:

| Physical cards in this pile, Grey included | Total stack factor |
| --- | --- |
| 0–9 | ×1 |
| 10–19 | ×2 |
| 20 or more | ×4 |

On the 20th card the existing ×2 **becomes** ×4. It is not an extra ×4 on top of ×2, so the milestones alone never make ×8. The 11th card does not award again. The 21st, 30th and 40th do not add a tier.

Purple stays separate and multiplies on top:

`pile = sum(value cards) × (2 ^ purple count) × stack factor`

Worked path, one Purple: 3.20× → 6.40× → **12.80× at 10 cards** → **25.60× at 20 cards**. Two Purples on that same 3.20× pile are ×4 Purple and ×4 stack, which is 51.20×. That second case is two different multipliers, and it is correct.

A Grey can be the 10th or the 20th card. The card itself stays 0×. The prize is the milestone: the pile total counts up because the factor changed. A pile of only Greys can sit at ×4 and still show 0× until a value card joins. Red still ends the round at 0× and cancels every queued pack, every Purple and every stack tier.

`DEMO_CONFIG_ID` is `merge-packs-demo-v0.12`. Placeholder math. Not a certified RTP.

## Grey weights

Grey's extra weight was taken from value cards. Red, Purple, Gold and +1 PACK are the v0.11 weights. Red was not raised to pull the mean down.

| | v0.11 Grey | v0.12 Grey | Taken from |
| --- | ---: | ---: | --- |
| Easy | 88 / 1000 = 8.8% | **180 / 1000 = 18.0%** | Green 724 → 632 |
| Medium | 94 / 1000 = 9.4% | **180 / 1000 = 18.0%** | Green 704 → 618 |
| Hard | 50 / 1000 = 5.0% | **110 / 1000 = 11.0%** | Blue 586 → 526 |

Red stays 78 / 96 / 290 per mille (7.8% / 9.6% / 29.0%).

Shipped draw, 500,000 rounds, seeds `sim-{mode}-0` … `499999`. A red card stops the pack early, so Greys per opened pack sit below `6 × weight`.

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Grey per round | 1.170 | 1.064 | 0.343 |
| Grey per opened pack | 0.890 | 0.851 | 0.333 |
| Rounds with ≥1 Grey | 62.63% | 59.35% | 26.72% |
| ≥2 Grey | 31.84% | 28.81% | 6.21% |
| ≥3 Grey | 13.43% | 11.43% | 1.19% |

On Easy and Medium a player sees a Grey in most rounds that are not an immediate red. Hard still shows one often enough to read, and still busts about 90% of rounds.

## What the new rules did before the denomination retune

100,000 rounds, the v0.11 denomination tables, the new Grey weights and the 10/20 factors already on. Standard error is the sample standard deviation over sqrt(100,000).

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Mean | 0.9046× | 0.9061× | 0.8714× |
| Standard error | ±0.0085× | ±0.0077× | ±0.0104× |
| Red bust | 51.02% | 56.63% | 90.00% |
| Stack ×4 still paid | 0.60% | 0.32% | none in this sample |

v0.11's 500k means were 0.9495× / 0.9522× / 0.9507×. Replacing value cards with Grey pulled the means down by about 0.04× to 0.08×. The ×4 tier did not put that value back, because 20 cards is uncommon. Hard did not pay a ×4 pile once in this 100k sample.

## Denominations

Red was left alone. The retune is inside the existing value bands.

| Table | Change | Mean |
| --- | --- | --- |
| Easy green | 0.10× weight 36 → 27. 0.20× weight 3 → 12. 93% are still ≤ 0.20×. 0.75× and 1.00× stay. | 0.148× → 0.157× |
| Medium green | 0.10× weight 31 → 12. 0.20× weight 3 → 22. 89% are still ≤ 0.20×. | 0.157× → 0.176× |
| Hard blue | Still 1.00×–3.00×. 1.00× weight 48 → 30, 1.50× 7 → 13, 2.00× 4 → 16. The 3.00× card stays at weight 2. | 1.186× → 1.336× |

## 500,000 rounds of the shipped tables

Seeds `sim-{mode}-0` … `sim-{mode}-499999`, stake 1. Standard error is the sample standard deviation over sqrt(500,000). The range is mean ± 1.96 standard errors, a normal approximation for the mean only.

| | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Mean | **0.9493×** | **0.9566×** | **0.9563×** |
| Standard error | ±0.0040× | ±0.0035× | ±0.0050× |
| Approx. 95% for the mean | 0.9415–0.9570× | 0.9497–0.9635× | 0.9466–0.9661× |
| Red bust | 50.88% | 56.91% | 90.01% |
| Safe 0× | 0.01% | 0.01% | 0.00% |
| Below 1×, paid | 26.64% | 21.53% | 0.00% |
| Above 1× | 22.16% | 21.20% | 9.99% |
| ≥ 10× | 0.86% | 1.63% | 2.92% |
| ≥ 25× | 0.17% | 0.11% | 0.27% |
| Rounds with an Extra Pack | 27.82% | 24.90% | 9.07% |
| Mean / max packs | 1.315 / 6 | 1.251 / 6 | 1.033 / 5 |
| Stack ×2 triggered / still paid | 11.46% / 8.07% | 8.23% / 5.59% | 0.36% / 0.21% |
| Grey was the 10th card | 2.37% | 1.66% | 0.06% |
| Stack ×4 triggered / still paid | 0.89% / 0.61% | 0.44% / 0.29% | ~0.0002% / ~0.0002% |
| Grey was the 20th card | 0.18% | 0.08% | none in this sample |
| Purple + Stack ×2 still paid | 2.21% | 1.16% | 0.06% |
| Purple + Stack ×4 still paid | 0.27% | 0.10% | 0.00% |
| p99 / p99.9 | 9.12× / 31.25× | 12.81× / 25.88× | 16.90× / 34.15× |
| Maximum observed | 305.28× | 131.72× | 212.80× |

Side by side with the v0.11 500k report:

| | Easy v0.11 | Easy v0.12 | Medium v0.11 | Medium v0.12 | Hard v0.11 | Hard v0.12 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mean | 0.9495× | 0.9493× | 0.9522× | 0.9566× | 0.9507× | 0.9563× |
| Red bust | 51.00% | 50.88% | 56.85% | 56.91% | 89.98% | 90.01% |
| ≥ 10× | 0.68% | 0.86% | 1.54% | 1.63% | 3.00% | 2.92% |
| Stack ×2 still paid | 8.59% | 8.07% | 6.12% | 5.59% | 0.22% | 0.21% |
| Maximum observed | 613.12× | 305.28× | 80.41× | 131.72× | 142.00× | 212.80× |

Bust rates moved by less than a fifth of a point. Red's weight did not change. Medium's interval reaches 0.9635× and Hard's reaches 0.9661×, a few thousandths past 0.96. Both point estimates are inside 0.94–0.96×. Easy's whole interval sits inside that band.

## 20 cards is real, and it is rare

The six-pack cap is 36 cards. A pile of 20 is a chain of extra packs plus most of those cards landing in one pile.

Reproducible natural seeds from the 500k sample:

| Seed | What happened |
| --- | --- |
| `sim-easy-70` | Resolved at 88.77×. Five packs. Green holds 20 cards and pays ×4. |
| `sim-medium-127` | Resolved at 11.96×. A Grey was the 10th card and the 20th card. Green finishes at 21 cards, ×4. |
| `sim-hard-172559` | Resolved at 110.80×. Five packs. Blue holds 26 cards. A Grey was the 10th card. This is the one Hard ×4 in the 500k sample. |
| `sim-easy-481466` | The Easy maximum, 305.28×. Six packs, 27 cards on Green, six Purples' worth of factor on that pile, and a Grey was the 20th card. |

Easy pays the ×4 tier on about 0.61% of rounds. Medium pays it on about 0.29%. Those are uncommon, and a player who chains packs can actually see them. Hard's ×4 is about one round in 500,000 here. Hard opens 1.03 packs on average, busts 90% of the time, and splits the surviving cards between Blue and Gold. A 20-card Hard pile is a curiosity, not a feature a player should expect. The scripted `?fixture=stack20` and `?fixture=stack20grey` rounds show the upgrade on purpose. They are not the natural rate.

## Tail risk

The ×4 tier magnifies a pile that is already large. In this 500k sample the highs were 305.28× Easy (`sim-easy-481466`), 131.72× Medium (`sim-medium-432054`) and 212.80× Hard (`sim-hard-46294`). p99.9 is 31× / 26× / 34×, so the extremes are thin. There is no Max Win cap in this prototype. A production version should have a separate math review, including whether a cap is required, before anyone treats these figures as economics. This note is not that review and it is not a certification.

## On the table

Each pile shows both goals before the first card: **10→×2** and **20→×4**, with a count that keeps going (`11/20`, `15/20`, `19/20`). At 10 the badge reads **Stack ×2** and the next goal stays visible. At 20 it reads **Stack ×4** and **MAX**. The 10th card keeps the short Stack Bonus ribbon. The 20th card plays a shorter, brighter Super Stack ribbon: the ×2 strikes through into ×4, the pile rim flares, and the pile total counts up. A Grey that crosses either line is labelled 0×. The caption says the count filled and names the tier. The card face stays the card's own multiplier. The footer is the pile total.

Playable fixtures, same resolver as the tests:

- `?fixture=showcase` still walks +1 PACK, Grey, Purple and the ×2 award.
- `?fixture=stack20` is twenty 0.20× greens. The 20th card upgrades ×2 to ×4. Final 32.00×.
- `?fixture=stack20grey` is the 3.20× example. A Grey is the 10th card and the 20th card. Final 25.60×, not 51.20×.
- `?fixture=purplecount` and `?fixture=purplegrey` are unchanged.

## Checks

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run simulate -- 500000`
- Desktop 1440×900, compact 1280×720 and 375×812: names fully visible, no legend on the felt, no pile total spilling into the next pile.
- Real-time recording of `?fixture=stack20grey`: Grey cards fly in, Stack Bonus ×2, then Super Stack ×4, settle at 25.60×.
