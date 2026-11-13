# 🎴 Merge Packs — One Round, One Win

**Status:** Concept / v0.1 prototype specification · **Product:** Rainbet Originals (concept, not a released Rainbet game) · **Owner:** Mikalai Dzneladze

**Reference:** [Merge Cards demo](https://merge-cards.vercel.app/). This is a new one-bet, one-round adaptation, **not** a claim that the original demo already has these rules.

## Elevator pitch
Open one pack of six cards. Matching colored cards automatically merge into higher-value cards. An **Extra Pack** card continues the **same bet** with another six-card pack, whose cards can merge with everything already on the board. The chain can repeat. A **Skull** card ends the round immediately at **0×**, wiping out the potential win. Otherwise, the final set of cards determines **one final payout**.

**One bet → One starting pack → Auto-merge → Extra Pack chain (if triggered) → One final win OR Skull 0×.**

## Player-facing rules (agreed concept)
1. One bet starts exactly one round and opens one pack of **six cards**.
2. Cards animate out of the pack, flip, and resolve automatically. The player does **not** drag, pick or cash out during the round.
3. **Colored cards** merge with matching colored cards; the resulting upgraded cards remain available for further merging with later packs.
4. **Extra Pack (+1)** grants **one additional pack within the same round**, at **no additional wager**. An Extra Pack in that pack can extend the chain again.
5. **Skull ☠** is a terminal failure: reveal → stop round → **final multiplier 0×**, regardless of prior potential win or earned Extra Packs.
6. No negative/pack-removal cards (no −1, −2, −3 packs).
7. If no Skull occurs and no packs remain, calculate and show **one final multiplier and payout**. Do not issue intermediate payouts.

## Working assumptions for a first playable demo (NOT approved production math)
- Matching rule: same **color and level** makes one card of the same color at the next level, with cascading merges. The original concept requires same-color merging; this level rule is a provisional implementation detail.
- **Grey** cards have **0×**, do not merge (provisional).
- The upgraded card's value is taken from a simple demo paytable; merge values must be explained and are **not** an RTP model.
- A configurable limit (initial suggestion: **6 total opened packs**) bounds animation/runtime. Extra Pack eligibility at the cap must be transparent.
- **Upgrade** and **+2 Pack** are possible *future* features, **not v0.1 requirements**.
- Skull has priority over scoring and Extra Pack continuation within its pack.
- At all times, a displayed running multiplier is **potential**, never a cashout or guaranteed win.

## v0.1 prototype scope
- Responsive **desktop + mobile** playable, Vite + React + TypeScript if starting from an empty repository.
- Clean, readable dark-navy Originals-inspired UI; animated pack opening, six-card reveal, merges, chain and Skull.
- A **pure seeded TypeScript demo engine**, separate from UI/animation, with unit tests for merges, chains, cap, Skull precedence, one-bet/one-result.
- Fake/demo credits only. **No real-money backend, no claimed RTP, no provably-fair claim, no production launch.**
- Faster playback / skip can only change animation, never the precomputed outcome.

## Documentation and next steps
- [Game Concept & GDD v0.1](docs/GAME_CONCEPT_V0.1.md) — exact loop, feature rules, UX and acceptance criteria.
- [Math / RNG Working Notes](docs/MATH_MODEL_NOTES.md) — demo-only paytable, seeded engine and invariants.
- [Cursor implementation prompt](docs/CURSOR_PROMPT_V0_1.md) — copy-paste build brief.
- [GitHub About metadata](docs/GITHUB_ABOUT_METADATA.md) — description and topic suggestions for manual GitHub settings.

**Delivery practice:** implement future changes in a dedicated branch; open a PR; don't merge or claim a public deployment until verified.

## Open product questions
- Final color palette, card naming, level count and exact merge paytable.
- Skull/Extra Pack probabilities; RTP, volatility, hit frequency, max win, and formal RNG/compliance model.
- Whether Grey, Upgrade or +2 Pack belongs in a later version.
- Actual final cap and how extra-pack availability is displayed near the cap.

---
This is a product concept and demo design document. All multiplier examples are illustrative until a math owner validates them.
