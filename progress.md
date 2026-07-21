# WoW Boardgame overhaul progress

Original prompt: `kreni svih 5 faza`

## Scope and decisions

- Implement all five approved phases: integrity, balance, UX/mobile, game depth, and production hardening.
- Preserve the established dark-fantasy art direction and existing user assets.
- Supported competitive setups are 2 players (1v1) and 4 players (2v2). The structurally unfair 3-player mode is disabled until it has a dedicated ruleset.
- Keep changes on `codex/full-game-overhaul`; do not commit or publish without a separate request.

## Progress

- [x] Baseline audit completed; production build passes.
- [x] Five-phase implementation authorized by the user.
- [x] Working branch created.
- [x] Phase 1 — state integrity, deterministic tests, save migration v6, lint/CI.
- [x] Phase 2 — team fairness, rotating initiative, boss/combat/quest and hero balance.
- [x] Phase 3 — private hotseat handoff, onboarding, responsive mobile dock/inspector, accessibility.
- [x] Phase 4 — secret PvP defender agency, creature traits, 24 class talents, ally aid, event choices/objectives.
- [x] Phase 5 — WebP asset pass, lazy 3D loading, WebGL recovery/fallback, automation hooks, comprehensive QA.

## Resolved baseline issues

- Stale/double submissions no longer resolve two combat rounds, purchases, or turns.
- Only balanced 2p and 4p rosters are accepted; faction and teammate initiative rotates.
- Boss armor cannot erase all incoming damage, and regenerated wounds lose contribution credit.
- Combat allows at most one ability and one consumable per round.
- Continue/New War is explicit, destructive replacement is confirmed, and legacy saves are normalized or safely retired.
- Mobile controls remain reachable at 390×844, with keyboard/2D fallbacks and focus-safe dialogs.
- Lint is clean and the game board is split from the large, lazy-loaded Three.js vendor.

## Final verification

- `npm run check`: clean lint, 23/23 regression tests, successful production build.
- Seeded rules simulation: 500/500 completed in both supported setups. Final sample was 50.4% Accord / 49.2% Dominion / 0.4% draw in 2p, and 46% / 54% in 4p.
- Browser QA: desktop 1280×720 and mobile 390×844 have no page overflow, broken images, blocking-dialog collisions, or console errors. Upstream Three.js prints deprecation warnings only.
- Hotseat QA covers global player handoff plus two-sided secret PvP defense, including deferred healing and reload-safe handoff phases.
- All 102 JPG art files were replaced by dimension-matched WebP files; `public/assets` dropped from roughly 36 MB to 12 MB.
- The game-specific lazy `BoardScene` chunk is 14.73 kB minified. The cached Three.js vendor remains 1.04 MB (289 kB gzip) and is the only build-size warning.
- `window.render_game_to_text()` and `window.advanceTime()` were exercised by the standard web-game Playwright client with screenshots/state output and no captured errors.

## Fixed-profile creature combat rework — 2026-07-21

Current prompt: `combat mi izgleda čudan. Kao da enemy block bude overpowered. Napravi dice pools da heroj može imati sve 3 boje, a protivnici ne rolaju nego imaju threat plus garant attack/armor`

- [x] Baseline before the rework: clean lint, 32/32 tests, successful build; 100/100 seeded games completed in both 2p and 4p.
- [x] Every hero now has non-zero blue ranged, red melee, and green guard pools.
- [x] PvE creatures now expose fixed Threat, Attack, and Armor and never roll dice.
- [x] Red successes guard against fixed Attack before dealing delayed melee damage; green successes provide guard only.
- [x] The old dynamic `threat` counter is renamed `provoked` and adds fixed Attack; save schema is migrating to v8.
- [x] Creature/minion/trait/event/ability copy and combat presentation now use fixed Attack semantics.
- [x] Deterministic regression coverage now exercises all three hero pools, Threat/crit behavior, fixed Attack/Armor, volley kills, red/green guard, shared Armor, minion Attack, Provoked persistence/migration, and the shared PvP guard roll.
- [x] Final seeded balance sample: 500/500 games completed in both setups; faction wins were 48.8% Accord / 50.8% Dominion / 0.4% draw in 2p and 49.6% / 50.4% in 4p. Boss wins landed at 25.5% of attempts in 2p and 23.4% in 4p.
- [x] Final verification: `npm run check` passes with clean lint, 41/41 tests, and a successful production build; `git diff --check` is clean.
- [x] Desktop PvE/PvP and 390px mobile Playwright screenshots were visually inspected with no overflow or browser errors. The standard web-game client also captured a clean screenshot plus `render_game_to_text()` state with no error artifact.

## Handoff notes

- The combat rework is complete and remains uncommitted on `codex/full-game-overhaul`.
- Creatures deliberately cap fixed Armor at 1; the same Armor budget is shared by the blue and red phases so it cannot refresh into the former overpowered double block.
- PvP remains hero-vs-hero dice combat. Its defender green pool now rolls once and is shared across the attacker's blue and red phases.
