# Merge Packs v0.10 — rules, math and layout notes

**Demo simulation only. Not a certified RTP. Not approved production math.**

v0.10 changes two rules (Grey, Stack Bonus), the table layout, the pack, and the HUD. The draw weights, the denominations, the 6-pack cap, Purple, Red and +1 PACK are the v0.8 ones. `DEMO_CONFIG_ID` is `merge-packs-demo-v0.10` because the rules changed.

## Rules that changed

### Grey 0× joins a pile

A grey card is still 0×. It is not a bust, a boost or a pack. It no longer leaves the table:

- If at least one eligible pile already holds a card, the grey joins a random one of those piles.
- If every eligible pile is empty, it joins a random eligible pile.

"Holds a card" means any card, so a pile that only holds a grey counts as non-empty for the next grey.

The pile is picked from a separate seeded stream, `createRng(seed + "#grey-route")`. The main stream is not touched, so every seed deals exactly the cards it dealt in v0.8 and v0.9. Only where a grey lands, and what Stack Bonus does with it, is new. A scripted round can name the pile: `{ kind: "grey", target: "green" }`.

### Stack Bonus ×2 counts every card in the pile

```
pile  = sum(value cards in the pile) × (2 ^ purples on the pile) × (stackBonus ? 2 : 1)
final = sum(piles)
```

- A pile unlocks Stack Bonus when it reaches **10 cards**. Green, Blue, Gold and Grey cards count. Purple, Red and +1 PACK never count: they never join a pile.
- It unlocks once per pile per round. Cards after the 10th stay doubled. A second pile unlocks on its own.
- It multiplies with Purple. 3.20× of cards, one Purple, then the bonus: 3.20 → 6.40 → 12.80×. The order does not matter.
- Red clears it with everything else.

Six greys and no red is still a safe 0× "no win". Ten greys in one pile unlock the bonus and still pay 0×.

### One decision to confirm: Purple ignores greys

Purple targets the pile with the most **value** cards, then the highest pile total, then the leftmost pile. This is the v0.8 rule and v0.10 keeps it. Grey cards are not counted for it, so a pile padded with greys does not pull a Purple away from the pile that holds the prizes, and a pile that holds only greys is picked only when no pile holds a value card. The brief did not ask for a change here. If Purple should count greys too, it is a one-line change in `chooseBoostTarget`.

## What the rule change does to the numbers

100,000 deterministic rounds per difficulty, seeds `sim-{difficulty}-{0..99999}`, stake 1, `npm run simulate -- 100000`. The weights are the same in both columns. Only the two rules above differ.

| | Easy v0.9 | Easy v0.10 | Medium v0.9 | Medium v0.10 | Hard v0.9 | Hard v0.10 |
|---|---:|---:|---:|---:|---:|---:|
| Mean multiplier | 0.971× | **1.017×** | 0.935× | **0.968×** | 0.979× | **0.992×** |
| Red bust | 51.20% | 51.20% | 56.66% | 56.66% | 89.96% | 89.96% |
| Profitable (>1×) | 25.91% | 26.03% | 22.39% | 22.51% | 10.04% | 10.04% |
| ≥10× | 0.78% | 0.80% | 1.51% | 1.54% | 3.12% | 3.12% |
| Stack Bonus triggered | 8.79% | 12.12% | 6.25% | 8.89% | 0.28% | 0.41% |
| Stack Bonus still paid | 6.12% | 8.65% | 4.19% | 6.15% | 0.17% | 0.25% |
| Purple + Stack Bonus paid | 1.53% | 2.35% | 0.78% | 1.25% | 0.04% | 0.08% |
| Pile held a grey when it unlocked | n/a | 7.69% | n/a | 5.76% | n/a | 0.22% |
| A grey was the 10th card | n/a | 1.24% | n/a | 0.96% | n/a | 0.03% |
| p90 / p99 | 2.80 / 8.91× | 3.00 / 9.08× | 2.60 / 12.28× | 2.78 / 12.40× | 4.00 / 17.05× | 4.00 / 17.20× |
| Maximum observed | 120.58× | 120.58× | 50.23× | 50.23× | 151.20× | 151.20× |

Read this plainly:

- **Easy's placeholder mean is now above 1.00×** (1.017×). The bonus lands on about 12% of Easy rounds instead of 9%, because greys now help a green pile reach 10. Nothing was rebalanced to hide that. The brief said the difficulties stay as they are, so the weights were left alone. If the mean has to come back under 1.00×, the knobs are Easy's grey weight, the 10-card threshold, or the bonus factor, and that is a math decision, not a layout one.
- Medium moves from 0.935× to 0.968×.
- Hard moves from 0.979× to 0.992× and keeps its 89.96% bust rate. Red is still 290 per-mille. Hard was not made safer.
- Bust rates are identical in both columns because the card streams are identical.

## Table layout

Measured on the same Medium table. "Piles" is the width of the pile row against the felt.

| Viewport | v0.9 card | v0.9 piles | v0.10 card | v0.10 piles |
|---|---:|---:|---:|---:|
| 1440×900 | 184px | 54% | **222px** | **67%** |
| 1920×1080 | 184px | 38% | **274px** | **66%** |
| 1168×1012 | 184px | 71% | 221px | 88% |
| 1280×720 | 176px | 60% | 175px | 62% |
| 390×844 | 106px | 93% | 109px | 96% |

- A 720p window is height-bound in both versions, so the card is the same size there and only the spacing changes.
- The card grows until the height of the play area stops it, up to 280px (300px with two piles). v0.9 stopped at 184px on every desktop.
- The brand and the credits moved into the top of the rail, and the rail is 228px, so the felt runs the full height of the window.
- The legend is off the table. It is a closed "Cards" block in the rail, and a "Cards" section at the top of the Rules dialog.
- The HUD is one centred bar, at most 600px wide: Pack, Result, Payout. The verdict (Win, Bust, Big win …) is a chip inside the Result cell. The floating "Round over" badge is gone; the caption line under the HUD is hidden once the round has settled.
- Empty piles are a faint slot with a small glyph and no footer.
- After a bust the wells keep their height and the empty slots come back. In v0.9 the pile row collapsed and the pack jumped up.

## Pack

- A near-square foil booster, 0.94 wide to 1 tall (v0.9 was 1.17 wide). It is slightly narrower than a card.
- Saw-tooth crimps top and bottom. The top crimp is the lid: it tears away when the pack opens.
- One typeset **RAINBET** wordmark in the foot band. There is still no logo file in the repo.
- Bonus packs are gold foil with a "Bonus" tag.
- Waiting packs are real packs under the active one. Each sits one step down and to the right (13% of a card across, 5.5% down) and turns 2.4° more than the one above, with its own shadow. Up to three are drawn. A gold chip shows the exact count.
- **+1 PACK** reveals, swings out to the right, turns into a sealed gold pack and slides under the active pack into the first waiting slot. The step lasts 450 ms at game tempo, three times a normal flight.
- When the active pack is empty, the top waiting pack rises into the active slot and the rest move up one.

## Stack Bonus on the table

- While a pile builds: ten pips and `n/10` in the pile footer. From 7 cards the marker turns gold and pulses.
- On the 10th card: the card lands at the old total, then a gold "STACK BONUS ×2" ribbon drops across the pile, rays flash behind it, the pile gets a gold rim, and the pile total counts up from the old figure to the doubled one. The step lasts 750 ms at game tempo.
- After that: a "STACK ×2" badge next to the pile name and the gold rim stay until the round ends. The footer shows the card count again.

## Two playback bugs fixed on the way

Both were already in v0.9. Both changed what the new animations looked like, so they are fixed here.

1. **Each step was shown for the next step's delay.** The scheduler waited `delayFor(next step)` before applying it. A card flight (150 ms) was followed by a landing (25 ms), so the flight was on screen for about 25 ms and the landing for the next card's eject time. `holdBefore` in `src/playback/timing.ts` now waits for the step that is on screen. The delays in `LEGACY_1X_MS` were re-set to the time each step should be visible. An average Medium round is 2.3 s, was 2.1 s.
2. **The flying card ignored the fitted card size.** `--fly-w` and four other lengths were computed on `:root` from the default 156px card. They are now computed on the stage, so a card in flight is the size of the card it lands on.

## QA entry points

A normal visit has no query and opens the idle table. These only script the existing resolver. They do not change weights.

- `?fixture=showcase` — Medium, three packs: +1 PACK, a grey into the green pile, Purple on green (3.20 → 6.40×), a grey as the 10th card (6.40 → 12.80×), final 18.20×.
- `&at=end`, `&at=full_stack`, `&at=earn:2`, `&at=37` — open the round at that step.
- `&slow=4` — slow motion, 1 to 12. It stretches the step delays and the CSS clock together and never changes the deal.
