import { ITEMS } from '../data/items'
import { HEROES } from '../data/heroes'
import { XP_THRESHOLDS, LEVEL_BONUSES } from '../data/constants'

// Effective stats = leveled base stats (stored on the player) + equipped items.
export function effStats(player) {
  const eff = {
    dice: player.dice,
    armor: player.armor,
    move: player.move,
    maxHp: player.maxHp,
    maxEnergy: player.maxEnergy,
    goldPerKill: 0,
    firstStrike: false,
  }
  for (const itemId of player.items) {
    const fx = ITEMS[itemId]?.effects || {}
    if (fx.dice) eff.dice += fx.dice
    if (fx.armor) eff.armor += fx.armor
    if (fx.move) eff.move += fx.move
    if (fx.hp) eff.maxHp += fx.hp
    if (fx.energy) eff.maxEnergy += fx.energy
    if (fx.goldPerKill) eff.goldPerKill += fx.goldPerKill
    if (fx.firstStrike) eff.firstStrike = true
  }
  return eff
}

export function makePlayer(idx, name, heroId) {
  const hero = HEROES[heroId]
  return {
    idx,
    name: name || hero.name,
    heroId,
    faction: hero.faction,
    // leveled base stats (mutated on level up)
    maxHp: hero.base.hp,
    hp: hero.base.hp,
    dice: hero.base.dice,
    armor: hero.base.armor,
    maxEnergy: hero.base.energy,
    energy: hero.base.energy,
    move: hero.base.move,
    xp: 0,
    level: 1,
    gold: 3,
    vp: 0,
    region: null, // set at game start (faction capital)
    items: [],
    consumables: [],
    quests: [],
    completed: [],
    talents: [],
    pendingTalents: [],
    dead: false,
    kills: 0,
  }
}

// Applies XP and levels the player up through any thresholds crossed.
// Returns a list of levels gained (e.g. [2] or [2,3]).
export function applyXp(player, amount) {
  player.xp += amount
  const gained = []
  while (player.level < 5 && player.xp >= XP_THRESHOLDS[player.level]) {
    player.level += 1
    const b = LEVEL_BONUSES[player.level]
    if (b.hp) {
      player.maxHp += b.hp
      player.hp += b.hp
    }
    if (b.energy) {
      player.maxEnergy += b.energy
      player.energy += b.energy
    }
    if (b.dice) player.dice += b.dice
    if (b.armor) player.armor += b.armor
    gained.push(player.level)
  }
  return gained
}

export const xpForNextLevel = (player) =>
  player.level >= 5 ? null : XP_THRESHOLDS[player.level]
