export const GAME = {
  MAX_ROUNDS: 10,
  BOSS_ROUND: 6,
  MAX_PLAYERS: 4,
  MIN_PLAYERS: 2,
  MAX_ACTIVE_QUESTS: 2,
  MAX_CONSUMABLES: 3,
  REST_HP: 4,
  REST_ENERGY: 2,
  ENERGY_REGEN_PER_TURN: 1,
  DEATH_GOLD_LOSS: 0.5, // fraction of gold lost on death
  PVP_VP: 2, // victory points for winning a duel
  PVP_XP: 2, // experience for winning a duel
  BOSS_RETREAT_REGEN: 5,
  ALLY_ASSIST_HP: 3,
  ALLY_ASSIST_ENERGY: 1,
  QUEST_REROLL_COST: 1,
}

// cumulative XP needed to reach level 1..5
export const XP_THRESHOLDS = [0, 4, 9, 15, 22]

export const LEVEL_BONUSES = {
  2: { hp: 2, energy: 1, dice: 1 },
  3: { hp: 2, energy: 1, armor: 1 },
  4: { hp: 2, energy: 1, dice: 1 },
  5: { hp: 3, energy: 1, dice: 1 },
}

export const FACTIONS = {
  accord: {
    id: 'accord',
    name: 'Radiant Accord',
    color: '#3b82f6',
    colorDark: '#1e40af',
    capital: 'dawnhold',
    blurb: 'Knights, mages and priests sworn to shield the free realms of the west.',
  },
  dominion: {
    id: 'dominion',
    name: 'Emberclaw Dominion',
    color: '#ef4444',
    colorDark: '#991b1b',
    capital: 'emberfang_hold',
    blurb: 'Warclans of the burning east, forged in fire and bound by blood-oath.',
  },
}
