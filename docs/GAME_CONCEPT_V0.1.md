# 🎴 Merge Packs — Game Concept & Prototype GDD v0.1

**Product:** Rainbet Originals, *concept only*  
**Owner:** Mikalai Dzneladze  
**Phase:** Concept → First playable prototype  
**Reference experience:** https://merge-cards.vercel.app/  
**Thesis:** An automatic, watchable card-merging chain with **one wager, one round, one eventual win/loss**.

> This design derives from the owner's described idea. Do not assume the linked Merge Cards demo uses identical rules.

## 1. Product idea
The player buys **one pack** by placing a single stake. Six cards fly from the pack, turn face-up, and automatically combine. An **Extra Pack** card grants one more full six-card pack **without a new bet**. The next pack can merge into existing cards and can reveal another Extra Pack. A **Skull** can appear at any time and **instantly ends the whole round at 0×**, regardless of the potential multiplier accumulated so far.

**Hero moments:** first pack ripped open → successive merges → surprise +1 Pack → chain of openings → final multiplier **or** instant Skull failure.

## 2. Main game loop
`Set stake → Play → Open initial pack (6) → Reveal cards → Auto-merge → [Extra packs? continue automatically] → Final 1 payout OR Skull 0× → Reset`.

- Exactly **one bet** is committed at the beginning of the round.
- No manual card placement, no optional/mandatory mid-round click, no cashout, and no multiple payouts.
- One game action determines an entire automatic resolution.
- Later packs share a **persistent board** with earlier cards.
- The player may replay only after resolution; replay is a NEW bet.

## 3. Card types

| Type | Appearance | Rule | Status |
| --- | --- | --- | --- |
| Colored card | Clearly colored (e.g., red, blue, green, gold), shows level | Matching cards merge into a higher-level card; contributes to final multiplier | **Core** |
| Extra Pack | Distinct +1 PACK icon / package | Queues exactly **one** additional six-card pack in the same round and bet | **Core** |
| Skull | Dark / danger skull | **Immediately terminates** the entire round; result is **0×** | **Core** |
| Grey | Muted grey / 0× | No value and no merge | **Provisional v0.1** |
| Upgrade | Spark/star | Levels up an existing card | **Future candidate only; exclude from v0.1** |
| +2 Pack | Special deluxe pack token | Queues two additional packs | **Future candidate only; exclude from v0.1** |

**Absolutely forbidden in this concept:** negative pack cards, packs being removed, pay-to-continue, forced multi-action progression, and independent settlements after each pack.

## 4. Merge rules (concrete playable v0.1 assumption)
- A prize card has `color`, `level`, and multiplier value.
- In v0.1, **two cards with the same color AND same level** combine into **one card of that color at level+1**.
- The resulting card can merge again; repeat until no eligible pairs exist.
- Resolve ties in a stable order (oldest card IDs first) for determinism and repeatable animation.
- **Colors do not secretly change odds or values** in v0.1; they indicate matching groups.
- All surviving prize cards contribute to the normal final total. No line wins, no hidden second payout.
- At a configured maximum level, cards do not merge upward; define this visibly in rules.
- Values and levels below are **demo-only**; final math must be signed off before real-money use.

## 5. Extra Pack chain semantics
- Initial `pendingPacks = 1` (this is the purchased starting pack).
- Opening a pending pack decrements pending and increments opened packs.
- Every valid Extra Pack card increases `pendingPacks` by 1, **at no new cost**.
- Multiple Extra Pack cards in a safe pack can queue multiple new packs.
- New packs open automatically, sequentially; they can themselves award more packs.
- **Skull anywhere interrupts immediately**: discard all pending packs, set round loss, set total payout 0.
- The same pack may contain a Skull and Extra Pack cards: **Skull takes precedence**. No new pack opens after Skull.
- Add a **transparent technical cap** to protect the finite duration of demo rounds; use `maxOpenedPacks = 6` as an adjustable placeholder. Do not generate a visible `+1 PACK` token when it cannot award a pack due to the cap (draw another eligible token instead). The final cap/weighting need math review.
- Do not present the chain as player-choice cashout gameplay; there is no cashout decision.

## 6. Reveal and timing order
1. `PLAY` commits the one demo wager and starts a deterministic round.
2. Pack box appears and tears open; six face-down cards fly toward the board.
3. Cards flip with short, readable stagger; as colored cards are revealed, merge events resolve and animate.
4. When an Extra Pack is revealed, show `+1 PACK` and update a **pending packs** indicator. Actual next pack waits until the current pack is safely fully resolved.
5. When Skull is revealed, stop reveals and pending actions **immediately**, play a distinct failure animation, and show `0×` (one terminal result).
6. Otherwise, open pending packs one by one and continue merging with the existing board.
7. When pending packs reach zero, show one definitive final multiplier and payout.

Aim for fast standard-round pacing and a controlled dramatic rhythm for rare chains. Offer `1× / 2× / Instant` playback; these adjust animation only. Never use artificial dead time.

## 7. Board / HUD
- A pack object is the visual anchor; always make it clear which pack is opening.
- Board retains colored stacks/counters for accumulated cards across packs (avoid a wall of 30+ loose cards).
- HUD: **Stake**, **Play**, **Pack #**, **Pending Packs**, and **POTENTIAL ×** (explicitly not guaranteed due to Skull).
- Final result should be clearly labeled `WIN × / PAYOUT` or `SKULL / 0×`.
- On desktop use dark-navy Original-like UI with clear controls. On mobile use thumb-friendly controls, no essential tiny text, legible card levels.
- Do not use actual Rainbet production branding/assets without assets being explicitly provided; visually recognizable concept UI is enough.
- Make success and failure distinguishable not only by color; show icons/copy as well.

## 8. Illustrative round
- Pack 1 (six cards): Red L1, Red L1, Blue L1, Grey, Extra Pack, Green L1.
- Red L1 + Red L1 → Red L2; Extra Pack queues Pack 2. The new pack opens automatically.
- Pack 2 brings more colored cards; they merge into the **same existing board**.
- If Pack 2 has Skull, final result is **0×** no matter what Pack 1 built.
- If Pack 2 has no Skull or Extra Pack, the chain ends and the single final multiplier pays.

## 9. Product success criteria / review
- A first-time player understands the core loop after a single round.
- Every second spent reveals state changes: cards, merges, pack count, or terminal risk.
- No mandatory mid-round inputs; no outcome-changing controls after Play.
- A win or loss resolves unambiguously (no deceptive intermediate win).
- New packs feel like a continuation of the **same** board, not a new paid round.
- Skull is clear, immediate, and never leaves a final payout >0.
- Responsive test on desktop and 375px mobile; no overflow.
- Deterministic game engine test coverage, especially `+1` + Skull precedence.

## 10. Not yet decided
1. Production RTP, volatility, probabilities, max win, hit frequency and distribution. **Never claim validated values.**
2. Card-level paytable, number of colors, upper level / final cap.
3. Whether Grey stays and whether +2 Pack or Upgrade belongs in later versions.
4. Appropriate maximum pack-chain length after simulation and RG/compliance review.
5. Exact target duration and SFX/art direction after prototype playtests.

## 11. Out of scope (v0.1)
Cashout, betting again during a chain, real-money integration, accounts, tournaments, leaderboard, wallet APIs, rewards/quests, autoplay by default, production security certification, and claiming provably fair before it exists.
