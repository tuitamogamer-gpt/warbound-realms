// Every hero ability in the game. Each hero starts with their signature
// ability; three more class abilities can be bought with gold from a town
// Trainer, into slots that unlock at levels 2 and 4.
//
// Active abilities are used during a combat round (cost energy).
// `anytime` actives can also be cast outside combat.
// Passive abilities apply permanently while owned.
export const ABILITIES = {
  // ---- Berserker (Grosh) ----
  rage: {
    id: 'rage', heroId: 'grosh', signature: true, type: 'active', energy: 2,
    name: 'Blood Rage', desc: '+3 attack dice this combat round.',
    effect: { bonusDice: 3 },
  },
  whirlwind: {
    id: 'whirlwind', heroId: 'grosh', type: 'active', cost: 5, energy: 3,
    name: 'Whirlwind', desc: 'Deal 2 automatic hits this combat round.',
    effect: { autoHits: 2 },
  },
  thick_hide: {
    id: 'thick_hide', heroId: 'grosh', type: 'passive', cost: 6,
    name: 'Thick Hide', desc: '+1 armor.',
    effect: { armor: 1 },
  },
  bloodthirst: {
    id: 'bloodthirst', heroId: 'grosh', type: 'passive', cost: 5,
    name: 'Bloodthirst', desc: 'Heal 2 whenever you slay a creature.',
    effect: { killHeal: 2 },
  },

  // ---- Flame Sorceress (Zyra) ----
  fireball: {
    id: 'fireball', heroId: 'zyra', signature: true, type: 'active', energy: 3,
    name: 'Fireball', desc: 'Deal 3 automatic hits this combat round.',
    effect: { autoHits: 3 },
  },
  cinder_shield: {
    id: 'cinder_shield', heroId: 'zyra', type: 'active', cost: 6, energy: 2,
    name: 'Cinder Shield', desc: 'Take no damage this combat round.',
    effect: { noDamage: true },
  },
  ember_focus: {
    id: 'ember_focus', heroId: 'zyra', type: 'passive', cost: 6,
    name: 'Ember Focus', desc: '+1 max energy and +1 extra energy at the end of your turn.',
    effect: { energy: 1, regen: 1 },
  },
  pyroclasm: {
    id: 'pyroclasm', heroId: 'zyra', type: 'active', cost: 8, energy: 4,
    name: 'Pyroclasm', desc: 'Deal 5 automatic hits this combat round.',
    effect: { autoHits: 5 },
  },

  // ---- Shadowstalker (Morvek) ----
  ambush: {
    id: 'ambush', heroId: 'morvek', signature: true, type: 'active', energy: 2,
    name: 'Ambush', desc: 'The enemy does not strike back this combat round.',
    effect: { noRetaliation: true },
  },
  venom_blades: {
    id: 'venom_blades', heroId: 'morvek', type: 'active', cost: 6, energy: 2,
    name: 'Venom Blades', desc: '+2 dice this round, and 5s also count as critical hits.',
    effect: { bonusDice: 2, critOn5: true },
  },
  fleetfoot: {
    id: 'fleetfoot', heroId: 'morvek', type: 'passive', cost: 5,
    name: 'Fleetfoot', desc: '+1 movement.',
    effect: { move: 1 },
  },
  opportunist: {
    id: 'opportunist', heroId: 'morvek', type: 'passive', cost: 5,
    name: 'Opportunist', desc: '+1 attack die on the first round of every combat.',
    effect: { firstRoundDice: 1 },
  },

  // ---- Knight (Aldric) ----
  shield_wall: {
    id: 'shield_wall', heroId: 'aldric', signature: true, type: 'active', energy: 2,
    name: 'Shield Wall', desc: 'Take no damage this combat round.',
    effect: { noDamage: true },
  },
  valor_strike: {
    id: 'valor_strike', heroId: 'aldric', type: 'active', cost: 5, energy: 2,
    name: 'Valor Strike', desc: '+2 attack dice this combat round.',
    effect: { bonusDice: 2 },
  },
  plate_mastery: {
    id: 'plate_mastery', heroId: 'aldric', type: 'passive', cost: 6,
    name: 'Plate Mastery', desc: '+1 armor.',
    effect: { armor: 1 },
  },
  lay_on_hands: {
    id: 'lay_on_hands', heroId: 'aldric', type: 'active', cost: 6, energy: 3, anytime: true,
    name: 'Lay on Hands', desc: 'Heal 4 health. Usable in and out of combat.',
    effect: { heal: 4 },
  },

  // ---- Arcanist (Elowen) ----
  arcane_bolt: {
    id: 'arcane_bolt', heroId: 'elowen', signature: true, type: 'active', energy: 2,
    name: 'Arcane Bolt', desc: 'Deal 2 automatic hits this combat round.',
    effect: { autoHits: 2 },
  },
  mind_spring: {
    id: 'mind_spring', heroId: 'elowen', type: 'passive', cost: 5,
    name: 'Mind Spring', desc: '+2 max energy.',
    effect: { energy: 2 },
  },
  time_warp: {
    id: 'time_warp', heroId: 'elowen', type: 'active', cost: 7, energy: 4,
    name: 'Time Warp', desc: 'The enemy does not strike back, and +1 die this round.',
    effect: { noRetaliation: true, bonusDice: 1 },
  },
  starfire: {
    id: 'starfire', heroId: 'elowen', type: 'active', cost: 7, energy: 3,
    name: 'Starfire', desc: 'Deal 3 automatic hits this combat round.',
    effect: { autoHits: 3 },
  },

  // ---- Cleric (Torvald) ----
  mend: {
    id: 'mend', heroId: 'torvald', signature: true, type: 'active', energy: 2, anytime: true,
    name: 'Blessed Mend', desc: 'Heal 3 health. Usable in and out of combat.',
    effect: { heal: 3 },
  },
  smite: {
    id: 'smite', heroId: 'torvald', type: 'active', cost: 5, energy: 2,
    name: 'Smite', desc: 'Deal 2 automatic hits this combat round.',
    effect: { autoHits: 2 },
  },
  aegis: {
    id: 'aegis', heroId: 'torvald', type: 'active', cost: 6, energy: 3,
    name: 'Aegis', desc: 'Take no damage this combat round.',
    effect: { noDamage: true },
  },
  devotion: {
    id: 'devotion', heroId: 'torvald', type: 'passive', cost: 6,
    name: 'Devotion', desc: '+3 max health.',
    effect: { maxHp: 3 },
  },
}

export const ABILITY_LIST = Object.values(ABILITIES)
export const abilitiesForHero = (heroId) => ABILITY_LIST.filter((a) => a.heroId === heroId)
export const trainableForHero = (heroId) =>
  ABILITY_LIST.filter((a) => a.heroId === heroId && !a.signature)
export const abilityArt = (id) => `/assets/abilities/${id}.jpg`

// slot 1 = signature; slots 2 and 3 unlock at levels 2 and 4
export const maxAbilitySlots = (level) => 1 + (level >= 2 ? 1 : 0) + (level >= 4 ? 1 : 0)
