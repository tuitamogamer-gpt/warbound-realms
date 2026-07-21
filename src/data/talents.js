// Heroes choose one talent at level 2 and one at level 4.
export const TALENTS = {
  ironblood: {
    id: 'ironblood',
    level: 2,
    icon: '🛡️',
    name: 'Ironblood',
    desc: '+3 max health.',
    effects: { maxHp: 3 },
  },
  deep_focus: {
    id: 'deep_focus',
    level: 2,
    icon: '🔮',
    name: 'Deep Focus',
    desc: '+2 max energy.',
    effects: { maxEnergy: 2 },
  },
  bulwark: {
    id: 'bulwark',
    level: 4,
    icon: '⛨',
    name: 'Bulwark',
    desc: '+1 armor.',
    effects: { armor: 1 },
  },
  brutality: {
    id: 'brutality',
    level: 4,
    icon: '⚔️',
    name: 'Brutality',
    desc: '+1 attack die.',
    effects: { dice: 1 },
  },

  // Hero-specific paths. Legacy generic talents above remain valid for saves
  // created before the class trees were introduced.
  grosh_unbroken: {
    id: 'grosh_unbroken', heroId: 'grosh', level: 2, icon: '🩸',
    name: 'The Unbroken', desc: '+4 max health.', effects: { maxHp: 4 },
  },
  grosh_warpath: {
    id: 'grosh_warpath', heroId: 'grosh', level: 2, icon: '👣',
    name: 'Warpath', desc: '+1 movement.', effects: { move: 1 },
  },
  grosh_ironhide: {
    id: 'grosh_ironhide', heroId: 'grosh', level: 4, icon: '🛡️',
    name: 'Ironhide', desc: '+1 armor.', effects: { armor: 1 },
  },
  grosh_skullsplitter: {
    id: 'grosh_skullsplitter', heroId: 'grosh', level: 4, icon: '🪓',
    name: 'Skullsplitter', desc: '+1 attack die.', effects: { dice: 1 },
  },

  zyra_flameheart: {
    id: 'zyra_flameheart', heroId: 'zyra', level: 2, icon: '🔥',
    name: 'Flameheart', desc: '+3 max health.', effects: { maxHp: 3 },
  },
  zyra_emberwell: {
    id: 'zyra_emberwell', heroId: 'zyra', level: 2, icon: '🔶',
    name: 'Emberwell', desc: '+2 max energy.', effects: { maxEnergy: 2 },
  },
  zyra_dragonfire: {
    id: 'zyra_dragonfire', heroId: 'zyra', level: 4, icon: '🐉',
    name: 'Dragonfire', desc: '+1 attack die.', effects: { dice: 1 },
  },
  zyra_ash_ward: {
    id: 'zyra_ash_ward', heroId: 'zyra', level: 4, icon: '◈',
    name: 'Ash Ward', desc: '+1 armor.', effects: { armor: 1 },
  },

  morvek_nightstride: {
    id: 'morvek_nightstride', heroId: 'morvek', level: 2, icon: '🌙',
    name: 'Nightstride', desc: '+1 movement.', effects: { move: 1 },
  },
  morvek_nine_lives: {
    id: 'morvek_nine_lives', heroId: 'morvek', level: 2, icon: '🐾',
    name: 'Nine Lives', desc: '+3 max health.', effects: { maxHp: 3 },
  },
  morvek_deathmark: {
    id: 'morvek_deathmark', heroId: 'morvek', level: 4, icon: '🎯',
    name: 'Deathmark', desc: '+1 attack die.', effects: { dice: 1 },
  },
  morvek_shadowmail: {
    id: 'morvek_shadowmail', heroId: 'morvek', level: 4, icon: '🌑',
    name: 'Shadowmail', desc: '+1 armor.', effects: { armor: 1 },
  },

  aldric_oathbound: {
    id: 'aldric_oathbound', heroId: 'aldric', level: 2, icon: '☀️',
    name: 'Oathbound', desc: '+4 max health.', effects: { maxHp: 4 },
  },
  aldric_commanders_focus: {
    id: 'aldric_commanders_focus', heroId: 'aldric', level: 2, icon: '⚜️',
    name: "Commander's Focus", desc: '+2 max energy.', effects: { maxEnergy: 2 },
  },
  aldric_vanguard: {
    id: 'aldric_vanguard', heroId: 'aldric', level: 4, icon: '⚔️',
    name: 'Vanguard', desc: '+1 attack die.', effects: { dice: 1 },
  },
  aldric_aegis: {
    id: 'aldric_aegis', heroId: 'aldric', level: 4, icon: '⛨',
    name: 'Living Aegis', desc: '+1 armor.', effects: { armor: 1 },
  },

  elowen_starlit_mind: {
    id: 'elowen_starlit_mind', heroId: 'elowen', level: 2, icon: '✨',
    name: 'Starlit Mind', desc: '+2 max energy.', effects: { maxEnergy: 2 },
  },
  elowen_phasewalk: {
    id: 'elowen_phasewalk', heroId: 'elowen', level: 2, icon: '🌀',
    name: 'Phasewalk', desc: '+1 movement.', effects: { move: 1 },
  },
  elowen_battle_magus: {
    id: 'elowen_battle_magus', heroId: 'elowen', level: 4, icon: '🔷',
    name: 'Battle Magus', desc: '+1 armor.', effects: { armor: 1 },
  },
  elowen_arcane_mastery: {
    id: 'elowen_arcane_mastery', heroId: 'elowen', level: 4, icon: '🔮',
    name: 'Arcane Mastery', desc: '+1 attack die.', effects: { dice: 1 },
  },

  torvald_stonefaith: {
    id: 'torvald_stonefaith', heroId: 'torvald', level: 2, icon: '🪨',
    name: 'Stonefaith', desc: '+4 max health.', effects: { maxHp: 4 },
  },
  torvald_deep_prayer: {
    id: 'torvald_deep_prayer', heroId: 'torvald', level: 2, icon: '🙏',
    name: 'Deep Prayer', desc: '+2 max energy.', effects: { maxEnergy: 2 },
  },
  torvald_hammer_saint: {
    id: 'torvald_hammer_saint', heroId: 'torvald', level: 4, icon: '🔨',
    name: 'Hammer Saint', desc: '+1 attack die.', effects: { dice: 1 },
  },
  torvald_blessed_plate: {
    id: 'torvald_blessed_plate', heroId: 'torvald', level: 4, icon: '✝️',
    name: 'Blessed Plate', desc: '+1 armor.', effects: { armor: 1 },
  },

  wrenna_thistleheart: {
    id: 'wrenna_thistleheart', heroId: 'wrenna', level: 2, icon: '🌿',
    name: 'Thistleheart', desc: '+3 max health.', effects: { maxHp: 3 },
  },
  wrenna_fernpath: {
    id: 'wrenna_fernpath', heroId: 'wrenna', level: 2, icon: '🍃',
    name: 'Fernpath', desc: '+1 movement.', effects: { move: 1 },
  },
  wrenna_deadeye: {
    id: 'wrenna_deadeye', heroId: 'wrenna', level: 4, icon: '🏹',
    name: 'Deadeye', desc: '+1 attack die.', effects: { dice: 1 },
  },
  wrenna_barkweave: {
    id: 'wrenna_barkweave', heroId: 'wrenna', level: 4, icon: '🪵',
    name: 'Barkweave', desc: '+1 armor.', effects: { armor: 1 },
  },

  ashka_stormblood: {
    id: 'ashka_stormblood', heroId: 'ashka', level: 2, icon: '⛈️',
    name: 'Stormblood', desc: '+3 max health.', effects: { maxHp: 3 },
  },
  ashka_galestep: {
    id: 'ashka_galestep', heroId: 'ashka', level: 2, icon: '💨',
    name: 'Galestep', desc: '+1 movement.', effects: { move: 1 },
  },
  ashka_thunderfist: {
    id: 'ashka_thunderfist', heroId: 'ashka', level: 4, icon: '⚡',
    name: 'Thunderfist', desc: '+1 attack die.', effects: { dice: 1 },
  },
  ashka_stoneward: {
    id: 'ashka_stoneward', heroId: 'ashka', level: 4, icon: '🗿',
    name: 'Stoneward', desc: '+1 armor.', effects: { armor: 1 },
  },
}

export const talentsForLevel = (level, heroId = null) =>
  Object.values(TALENTS).filter((t) =>
    t.level === level && (heroId ? t.heroId === heroId : !t.heroId)
  )
