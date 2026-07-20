# Warbound Realms — The Board Game

A fully playable **3D digital fantasy adventure board game** for exactly 2 players (1v1) or 4 players (2v2, hotseat), inspired by classic 2000s adventure board game mechanics. Built with React, react-three-fiber and zustand. All artwork was AI-generated (OpenArt / Nano Banana 2) and all sound effects were AI-generated (ElevenLabs sound-generation API); the world, names and rules are original.

## The game

Two factions — the **Radiant Accord** and the **Emberclaw Dominion** — race across the realm of Aetheria:

- **19 regions** on a 3D tabletop map — an outer ring joined by two inner crossroads and four far-corner wilds, so every capital has several roads out and there is always more than one way across
- **6 unique heroes** (3 per faction), each with a signature ability and a **class pool of 5 trainable abilities** — buy them with gold at town Trainers, into slots that unlock at levels 2, 4 and 5
- **Dice combat** against 9 creature types across three danger tiers — each with a distinct trait; use up to one ability and one consumable per combat round
- **26 quests with live targets** — draw two, keep one, and reroll or abandon contracts in town
- **XP and levels (1–5)**, talents, gold, and a **20-item shop** (weapons, armor, trinkets, and combat consumables)
- **Round events with choices and shared objectives** that reshape each round (blood moons, caravans, storms...)
- **PvP duels from round 1** — share a region with an enemy hero and spend your action to duel them: win for VP, XP and their dropped gold (towns are sanctuaries)
- **24 class-specific talents** — at levels 2 and 4 every hero picks a permanent upgrade
- **Character sheet** (press `C`) — equipment slots, satchel, abilities, talents, record
- At round 6, **Vhalrax the Undying** awakens — the faction with the greatest persistent damage contribution wins when he falls (final blow breaks a tie), or out-score the enemy faction in victory points by the end of round 10
- **Auto-save** — the war resumes exactly where you left it, even after closing the tab

### Camera

Drag to rotate, scroll to zoom, right-drag to pan — or use the on-screen camera cluster.
Hotkeys: `Q`/`E` rotate, `W`/`S` tilt, `+`/`−` zoom, `F` focus your hero, `R` reset view.
Hover any region or creature for a detailed tooltip.

## Running locally

```bash
npm install
npm run dev
```

## Tech

- [Vite](https://vite.dev) + React 19
- [react-three-fiber](https://r3f.docs.pmnd.rs) + drei — 3D board, standee-style tokens, orbit camera
- [zustand](https://zustand.docs.pmnd.rs) + immer — the whole rules engine lives in `src/game/store.js`
- Headless rules validation: `npm run simulate -- --games 100 --setup 2p --seed 20260720` (or `--setup 4p`) plays seeded full games through the real engine and asserts invariants

## Project layout

```
src/
  data/    factions, heroes, creatures, items, quests, events, regions
  game/    rules engine (store, combat, dice, leveling)
  three/   3D scene (board, tiles, tokens, camera)
  ui/      menu, HUD, combat/shop/event modals, rules reference
public/assets/  AI-generated artwork (heroes, creatures, regions, items, events, UI)
```
