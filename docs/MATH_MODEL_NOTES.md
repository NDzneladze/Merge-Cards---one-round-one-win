# Merge Packs — Math / RNG Working Notes (v0.1 PROTOTYPE ONLY)

> **NOT a production-certified math model.** These parameters are placeholders to make a meaningful first prototype. Do not advertise RTP, fairness/certification, or real-money readiness. Math owner must approve the distribution and economics before any production wagering implementation.

## Core economic definitions
- **Round = one paid stake**. Extra packs never charge a second stake.
- **One terminal result**: `LOSS` with `finalMultiplier = 0` if any revealed Skull; otherwise `WIN/NO_WIN` with `finalMultiplier = sum(value(card))` over surviving colored cards.
- **Payout** = `stake × finalMultiplier`, once, at terminal resolution only. A 0× outcome returns 0.
- Each color uses the same level value table; card colors are merge categories, not concealed paytable advantages.
- Never label the evolving on-board sum as "Won"; it is `Potential ×` until resolution.

## Demo-only illustrative multiplier ladder
| Level | Value |
|---|---:|
| 1 | 0.10× |
| 2 | 0.25× |
| 3 | 0.60× |
| 4 | 1.50× |
| 5 | 4.00× |
| 6 (maximum) | 10.00× |

Merge example: Red L1 + Red L1 → Red L2. Cascading: four Red L1 → Red L3 via two L2 merges then L2+L2. The bonus relative to two unmerged cards is deliberate gameplay scaffolding, not validated expected value.

## Configurable demo weights (suggestion, NOT targets)
At each card draw while a future pack slot is available:
- Colored cards (four equal color buckets): **68% total** (17% each)
- Grey: **18%**
- Extra Pack +1: **11%**
- Skull: **3%**

At the six-pack cap, disable **new Extra Pack draws**, redistribute using renormalized eligible non-extra weights, and document the resulting changed conditional probabilities. Never draw a bonus that cannot be honored.

**These weights are illustrative, not a balanced 98% RTP.** Do not use to calculate or claim RTP without simulating the entire terminating chain, including Skull and the cap.

## Deterministic engine flow
Suggested types:
```ts
type Color = "red" | "blue" | "green" | "gold";
type Card =
  | { kind: "color"; id: string; color: Color; level: number }
  | { kind: "grey"; id: string }
  | { kind: "extra_pack"; id: string }
  | { kind: "skull"; id: string };

type RoundEvent =
  | { type: "pack_open"; packNo: number }
  | { type: "card_reveal"; card: Card; packNo: number; position: number }
  | { type: "merge"; removed: [string, string]; created: Card }
  | { type: "pack_earned"; pendingPacks: number }
  | { type: "skull"; cardId: string }
  | { type: "round_end"; multiplierMicros: bigint; outcome: "loss" | "resolved" };
```

Use a pure `resolveRound(seed, stake, config)` with no UI, timeouts, DOM or `Math.random()`. It must produce immutable events and a single final settlement. For demo, derive a seed once from a browser RNG at round start and pass the seed into a reproducible PRNG. The display playback **must not draw additional randomness**.

The engine may precompute packs or generate them deterministically in a pure sequence; animations cannot alter outcomes. Event-order precedence: a revealed Skull immediately emits `skull`, clears pending packs, emits `round_end(0)`, and **no further card/pack/merge events**. Even if an Extra Pack was already revealed earlier in that pack, the Skull negates future continuation.

## Finite-chain invariants
- Exactly one initial pack is opened (unless no round is started).
- Each pack has six pre-generated card positions, but on Skull the remaining cards may stay unrevealed.
- At most `maxOpenedPacks = 6` are opened in the demo (tunable, not yet a final rule).
- `openedPacks + pendingPacks <= maxOpenedPacks` at all times.
- Multiple valid Extra Pack cards can add multiple future packs, but never exceed the cap.
- Every round terminates with one event and one settlement; the original wager is debited once.
- No negative pack counts; no pack-removal card.
- Normal settlement happens only when the pending queue is empty and the current pack safely completes.
- `finalMultiplier = 0` on Skull regardless of potential board value.

## Tests / validation
1. Seed reproducibility: same seed + config + stake produces exactly the same transcript.
2. Merge transitivity: four identical L1 → one L3.
3. Mixed color and mixed-level cards do not accidentally merge.
4. Pack 1 can create Pack 2; Pack 2's cards merge with persistent Pack 1 cards.
5. Multiple Extra Pack cards queue multiple packs without rebetting.
6. Skull in Pack 1 ends immediately at 0×; no additional pack opens.
7. Extra Pack followed by Skull in the same pack still ends at 0×.
8. Skull in later packs cancels all earlier potential value.
9. Six-pack cap cannot be exceeded; no 'dead' Extra Pack card is shown.
10. With 0× colored sum, non-Skull round also has 0 payout.
11. Result playback speed / skip cannot change engine transcript or payout.
12. Fixed-point arithmetic produces stable totals and consistent display rounding.

## Production math work required
- Define explicit RTP target/configurations (do not infer any from prototype weights).
- Derive the full distribution across chains with cap-dependent conditional draws.
- Compute hit frequency, zero-win frequency, Skull frequency, average packs per round, tail risk, max win, and confidence intervals.
- Validate payout scaling, potential vs final multiplier copy, player-facing rule accuracy and any fairness/provably-fair commitment.
- Review responsible-gambling concerns for high-throughput rounds and animation skips; apply jurisdictional limits if applicable.
