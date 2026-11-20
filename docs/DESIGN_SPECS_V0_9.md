# Merge Packs v0.9 — Rainbet card table

Visual rebuild of the playable screen. The v0.8 math, weights, and round rules are unchanged. `DEMO_CONFIG_ID` is still `merge-packs-demo-v0.8`. This is not a certified RTP.

## What changed, measured

Same round, seed `scan-2647`, Medium, viewport **1168×1012**.

| | v0.8 | v0.9 |
|---|---:|---:|
| Stage width | 1136px | 884px (the rest is the 252px rail) |
| Pile row | 404px, **36%** of the stage | 604px, **68%** of the stage, **71%** of the card table |
| Card | 124px, flat gradient | **184×258**, illustrated |
| 26 green cards | one compressed slab | **5 faces** plus a thickness ridge; 22 cards stay in the round and sit under the last peek |
| Empty Gold | framed ghost card | faint dashed silhouette |
| Pack | separate blue "bonus pack" block | foil **Merge Packs** booster, same width family as a card (206×177) |
| Controls | full-width bar under the stage | left rail; the bar is gone on desktop |

The 65–80% target is the pile row against the **card table** (the felt inside the stage), not the whole window. At 1168×1012 that table is 852px wide and the three piles occupy **70.9%** of it. The felt margin on each side is about 140px. It is green cloth, not a black gutter.

## Hierarchy

1. **Left rail** (252px from 860px up): difficulty, stake, Play, examples, Rules. Sound and credits stay in the thin top bar.
2. **Felt**. HUD (pack, result, payout) sits on the cloth. Piles are centered. The pack is bottom-center, opens upward, and queued packs peek underneath on the same axis.
3. **Legend**. A 132px key is drawn only when a side gutter is already at least 150px. It does not change the card size. It is off at 1168 and on at 1280×720 and 1440×900.

Below 860px the rail moves under the felt. On 375×812 the card is **102×143** (94% of the phone table) and the controls scroll inside a 188px tray so they do not squash the cards.

## Sizing rules

`fitStage` in `src/components/fitStage.ts` sizes from the live action box.

- Three piles aim at 74% of the table, capped at 184px (188px when the window is 760px tall or shorter).
- Two piles aim at 72% and may grow to 260px. Easy and Hard at 1168 use **260×364** cards, 66% of the table.
- Phone cap is 115px. Floor that still fits the height. Measured 375×812 Medium: **102px**.
- 1280×720 Medium: **176×246**. Shorter than the desktop cap because the felt is shorter, still in the readable band.
- 1440×900 keeps the 184px card and spends the extra width on felt plus the legend.
- A pile shows the front card and 4 nameplate peeks (`VISIBLE_FACES = 5`). Older cards keep their engine values and are parked under the last peek.
- Pack width is 1.12× the card. Pack height is 0.96× on a tall 3-pile table, 0.78× when two piles have grown, 0.8× on a short window, 0.9× on a phone.

## Art tokens

One material: warm black room, green felt, cream type, gold foil.

| Token | Value | Use |
|---|---|---|
| Room | `#090a0c` | page behind the felt and the rail |
| Rail | `#12141a` | betting column |
| Felt | `#18764c` → `#071910` | one spotlight, cloth grain |
| Gold | `#e6c36a` | frames, totals, foil, wordmark |
| Cream | `#f6f1e4` | type on the felt |
| Display | Iowan Old Style, Palatino | card values, pack name |
| UI | Avenir Next, Segoe UI | rail, HUD |

Card faces are 5:7. Shared frame: dark rim, gold inner line, parchment field, nameplate (this is the peek), illustrated hero, dark value chip. Green is a sprout and spark, Blue a cut crystal, Gold a trophy. Purple is two overlapping cards, Teal is a sealed pack with +1, Grey is an empty dashed plaque, Red is one skull with a single STOP and a 0× chip. Card backs use the same navy and gold, with a diamond-in-star monogram and no wordmark. The pack is the same navy and gold, with a flap, a mouth, and a gold crimp that is what queued packs show underneath.

There is no Rainbet logo file in the repo. The pack sets **RAINBET** in type.

## Do / Don't

**Do** take the *idea* of a collectible card from games like Stake Stack: a large illustrated face, a clear denomination, and a table that is mostly cards. **Do** take the *idea* of a complete screen from the older Rainbet card mock: cards big enough to read, controls gathered on one side, a small legend only where space is left over.

**Don't** copy either layout. This is not a 2×3 static grid, and it is not a cashout table. **Don't** copy their characters, food, gems, potions, or logos. **Don't** draw a pile as one full-width stripe per card. **Don't** put the pile total on the card face; the card shows its own multiplier and the footer shows the count and the pile total. **Don't** add a speed control, a Play Again popup, or a second stake.

Screenshot fixtures (`?fixture=green27&at=end`, and the same for `partial`, `waiting`, `bust`, `grey`, `fullstack`, `easy`, `hard`) only exist so a reload can open a settled board. A normal visit has no query and stays on the idle table. A fixture calls the existing resolver with a script. It does not change weights.

## Playback

Tempo is still the former 2× (`PLAYBACK_SCALE = 0.5`). Cards leave the mouth, turn in the air, and tuck. Red is on stage only during the strike, then the settled bust is the HUD at 0.00×, struck pile totals, and a closed pack. Big, Huge, and Mega (10× / 25× / 50×) still use the short celebration and nothing else does.
