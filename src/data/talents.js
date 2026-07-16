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
}

export const talentsForLevel = (level) =>
  Object.values(TALENTS).filter((t) => t.level === level)
