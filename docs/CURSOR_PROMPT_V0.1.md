# Cursor Build Prompt — Merge Packs v0.1 (copy everything below)

You are a senior frontend/gameplay engineer and product-minded game developer. Build a **first playable demo** of **Merge Packs — One Round, One Win** in this repository.

Repository: https://github.com/NDzneladze/Merge-Cards---one-round-one-win

**Before coding**: the documentation currently lives on the unmerged `docs/merge-packs-v0-1-spec` branch (Draft PR #1). Fetch and check out that branch, then read `README.md`, `docs/GAME_CONCEPT_V0.1.md`, and `docs/MATH_MODEL_NOTES.md`. Create your feature branch FROM this docs branch, not from an empty/default-only checkout. If a rule below conflicts with the GDD, use the GDD. The reference https://merge-cards.vercel.app/ is visual/inspiration only; if unavailable, do not block or guess hidden rules. This is an **original instant-game adaptation** for a Rainbet Originals concept.

## Outcome
A responsive, attractive, actually playable **one-bet / one-round / one-outcome** card-pack merging instant-game DEMO. Prioritize the **working mechanic**, readable state transitions, and tests over decoration.

### Non-negotiable mechanic
1. Player sets one demo stake and clicks **PLAY**. Deduct the stake **once**.
2. One starting **pack contains exactly six card positions**. Show the pack opening, cards flying out and flipping.
3. Prize cards have a color and level. Merge **two cards of the same color AND level** into a single card one level higher, repeat cascading automatically.
4. Cards and upgraded cards from earlier packs **remain on the same board** and merge with cards from new packs. Use compact grouped stacks, not dozens of loose cards.
5. A card with **+1 PACK** queues **one extra complete six-card pack**, automatically within the same round, **without charging another stake**. Each subsequent pack can trigger more packs. Multiple +1 symbols can grant multiple pending packs.
6. A **SKULL** card **instantly ends the entire round** on reveal with **0× payout**. It cancels all pending packs and all potential value, even if previous packs already built a huge multiplier. No further reveal, merge, extra pack or payout actions after Skull.
7. Grey card: neutral, **0×**, non-mergeable (provisional demo rule).
8. If all packs finish safely and no extra packs remain, calculate **one single final multiplier** from the sum of surviving prize-card values; award exactly **one payout**.
9. **Never** include `−1 Pack`, `−2 Pack` or any pack-removing card. No cashout, no hold-to-continue, no second payment during a chain.
10. At most **six opened packs per round** as a **configurable prototype cap**, not a certified business rule. Never reveal an Extra Pack card that cannot actually grant another pack; gate eligible draws before drawing.

### Initial demo defaults (not balanced math)
- Four prize card colors: red, blue, green, gold (color semantics are equal).
- Level values: L1 0.10×, L2 0.25×, L3 0.60×, L4 1.50×, L5 4.00×, L6 10.00× (maximum level).
- Draw weights at non-capped state: colored 17% each (68% total), grey 18%, extra pack +1 11%, skull 3%. Condition/re-normalize the eligible pool when Extra Pack is not allowed. **These are placeholders, NOT production RTP or approved math**.
- A matching pair at max level stays separate; no L7.
- Stake and payouts are fake demo credits only; use precise fixed-point math to avoid rounding glitches.
- Display `POTENTIAL ×` during the chain, **never** call it `WIN` until safe termination.

### Exact reveal semantics
- Determine the outcome using a **seeded, pure TypeScript game engine**, separate from React/animations; no `Math.random()`, DOM or timers in engine.
- Generate one immutable event log for a round when Play is clicked; React replays the log.
- Open one pack, animate six cards entering. Flip/reveal sequentially with short stagger.
- For normal prize cards: add to persistent board and resolve eligible merges with readable animation.
- For +1 Pack: visually flag that a new pack was earned; queue it. Do not open the next pack until the current pack safely finishes.
- For Skull: play unmistakable skull impact, terminate immediately at `0×`, discard pending packs. If a +1 was revealed earlier in the same pack, Skull still cancels the chain.
- When there are pending packs after a safe pack, automatically open the next one, keeping the board.
- When no packs remain, display a single final result overlay `FINAL WIN: N×` and `PAYOUT: N credits`. If normal result is 0×, display `NO WIN: 0×`, not a Skull loss.
- `1× / 2× / Instant` speed controls may change timing ONLY, not the computed event transcript or payout. Instant must preserve intelligible final state.

### UX / art
Use a polished, dark-navy desktop/mobile Originals-inspired style with bright blue interactive accents, orange/gold multiplier highlights, green PLAY CTA and red/purple Skull danger. Make the opening **pack** the visual hero, not a generic card grid. Prefer CSS animations + SVG/CSS card assets; no external paid art or unapproved Rainbet logos. Use sound hooks/mute control if reasonable, but do not delay the core mechanic for sound work.

Desktop: bet/play control panel with accessible dimensions and one spacious card stage. Mobile: 375px width and above; thumb-friendly controls, readable card levels/counters, no page horizontal scroll.

HUD should show: Stake / Pack # / Pending Packs / POTENTIAL × / Play / playback speed. Disable new betting actions during active resolution. Include an Info modal describing +1 and Skull. Add a clear replay/new-round path.

### Architecture
If repository has no app code, scaffold **Vite + React + TypeScript**.
Recommended organization:
- `src/engine/types.ts`
- `src/engine/config.ts`
- `src/engine/rng.ts` (pure seeded PRNG)
- `src/engine/merge.ts`
- `src/engine/round.ts`
- `src/engine/round.test.ts`
- `src/components/PackStage.tsx`
- `src/components/CardBoard.tsx`
- `src/components/BetPanel.tsx`
- `src/components/ResultOverlay.tsx`
- `src/App.tsx`

Represent events explicitly (`pack_open`, `card_reveal`, `merge`, `pack_earned`, `skull`, `round_end`), keep animation/UI separate from result computation, never re-roll in a render/effect, and implement a readable, minimal animation sequence. React event playback must support pause/restart-free speed changes without stale timers or duplicate payout. If using timeouts for UI, clean them up.

### Required tests
- Same seed/config -> same event transcript/result.
- 2 same-color/same-level cards -> 1 upgraded card.
- 4 L1 same-color cards -> 1 L3 card; different colors do not merge.
- Later pack merges with previous pack's board.
- +1 adds a pack, no extra bet debit; multiple +1 cards can queue multiple packs.
- Skull in first or later pack -> 0× and no further effects.
- +1 before Skull in the same pack -> Skull wins and cancels queue.
- Never >6 packs; never draw unfulfillable +1.
- No Skull + empty/grey-only board -> normal 0× result.
- Exactly one settlement for all paths.
- Speed changes do not affect results.
- Basic UI test: Play / result / replay; mobile overflow.

### Delivery workflow
1. Fetch the docs branch and create **`feat/merge-packs-v0-1` FROM `origin/docs/merge-packs-v0-1-spec`**. Keep `main` unchanged. If docs PR #1 has already merged, you may instead branch from the updated `main`.
2. Implement a complete first playable, not just a mockup. Keep placeholders in `config.ts` and label unapproved math in UI/docs.
3. Run `npm install`, typecheck, tests and build; report actual results. Fix failures before delivery.
4. Add useful README run/test instructions; document assumptions and known limitations.
5. Commit and push the feature branch. While docs PR #1 is unmerged, create a **stacked Draft PR targeting `docs/merge-packs-v0-1-spec`** to avoid duplicating the docs diff; after docs PR #1 merges, retarget the feature PR to `main`. If docs are already merged, target `main` directly. **Do not merge without approval.**
6. If Vercel is connected/authorized, provide a **genuinely public preview URL** accessible without Vercel login (verify it). If not available, say so explicitly; never invent a URL or call a protected preview public.
7. Finish with short summary: files/architecture changed, tests passed/failed, PR URL, deployment URL if verified, unresolved math/design questions.

### Acceptance criterion
A user can stake once, watch six cards emerge and merge, occasionally receive an automatic additional pack, experience a dramatic Skull instant loss, or receive exactly one final payout. All of this works repeatedly on desktop and mobile, independent of whether any animations are skipped.

**Do not** add other game mechanics, real-money integrations, autoplay or a production RTP claim. Do not substitute a description or static UI for a working game.
