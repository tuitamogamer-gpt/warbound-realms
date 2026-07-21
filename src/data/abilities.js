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
    name: 'Blood Rage', desc: '+2 attack dice this combat round.',
    effect: { bonusDice: 2 },
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
  warcry: {
    id: 'warcry', heroId: 'grosh', type: 'active', cost: 6, energy: 2,
    name: 'War Cry', desc: 'Reduce the foe\'s Attack by 2 this combat round.',
    effect: { enemyAttackDown: 2 },
  },
  iron_will: {
    id: 'iron_will', heroId: 'grosh', type: 'passive', cost: 7,
    name: 'Iron Will', desc: '+2 max health, +1 max energy.',
    effect: { maxHp: 2, energy: 1 },
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
  living_flame: {
    id: 'living_flame', heroId: 'zyra', type: 'active', cost: 7, energy: 3,
    name: 'Living Flame', desc: '+2 dice this round, and 5s also count as critical hits.',
    effect: { bonusDice: 2, critOn5: true },
  },
  inner_fire: {
    id: 'inner_fire', heroId: 'zyra', type: 'passive', cost: 7,
    name: 'Inner Fire', desc: '+1 max energy; +1 attack die on the first round of every combat.',
    effect: { energy: 1, firstRoundDice: 1 },
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
  garrote: {
    id: 'garrote', heroId: 'morvek', type: 'active', cost: 7, energy: 3,
    name: 'Garrote', desc: 'Deal 3 automatic hits this combat round.',
    effect: { autoHits: 3 },
  },
  uncanny_reflexes: {
    id: 'uncanny_reflexes', heroId: 'morvek', type: 'passive', cost: 6,
    name: 'Uncanny Reflexes', desc: '+1 armor.',
    effect: { armor: 1 },
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
  crusade: {
    id: 'crusade', heroId: 'aldric', type: 'active', cost: 7, energy: 3,
    name: 'Crusade', desc: '+2 attack dice and heal 2 this combat round.',
    effect: { bonusDice: 2, heal: 2 },
  },
  standard_bearer: {
    id: 'standard_bearer', heroId: 'aldric', type: 'passive', cost: 6,
    name: 'Standard Bearer', desc: '+1 extra energy at the end of your turn.',
    effect: { regen: 1 },
  },

  // ---- Arcanist (Elowen) ----
  arcane_bolt: {
    id: 'arcane_bolt', heroId: 'elowen', signature: true, type: 'active', energy: 2,
    name: 'Arcane Bolt', desc: 'Deal 3 automatic hits this combat round.',
    effect: { autoHits: 3 },
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
  frost_nova: {
    id: 'frost_nova', heroId: 'elowen', type: 'active', cost: 6, energy: 2,
    name: 'Frost Nova', desc: 'Reduce the foe\'s Attack by 2 this combat round.',
    effect: { enemyAttackDown: 2 },
  },
  archmage_focus: {
    id: 'archmage_focus', heroId: 'elowen', type: 'passive', cost: 9,
    name: 'Archmage Focus', desc: '+1 attack die.',
    effect: { dice: 1 },
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
  radiance: {
    id: 'radiance', heroId: 'torvald', type: 'active', cost: 7, energy: 3,
    name: 'Radiance', desc: '2 automatic hits and heal 2 this combat round.',
    effect: { autoHits: 2, heal: 2 },
  },
  benediction: {
    id: 'benediction', heroId: 'torvald', type: 'passive', cost: 6,
    name: 'Benediction', desc: '+1 extra energy at the end of your turn.',
    effect: { regen: 1 },
  },

  // ---- Wildkeeper Ranger (Wrenna) — mirrored with Ashka's kit ----
  pinning_shot: {
    id: 'pinning_shot', heroId: 'wrenna', signature: true, type: 'active', energy: 2,
    name: 'Pinning Shot', desc: '+1 die, and reduce the foe\'s Attack by 1 this round.',
    effect: { bonusDice: 1, enemyAttackDown: 1 },
  },
  triple_volley: {
    id: 'triple_volley', heroId: 'wrenna', type: 'active', cost: 7, energy: 3,
    name: 'Triple Volley', desc: 'Deal 3 automatic hits this combat round.',
    effect: { autoHits: 3 },
  },
  thornguard: {
    id: 'thornguard', heroId: 'wrenna', type: 'active', cost: 6, energy: 2,
    name: 'Thornguard', desc: 'Take no damage this combat round.',
    effect: { noDamage: true },
  },
  trailblazer: {
    id: 'trailblazer', heroId: 'wrenna', type: 'passive', cost: 5,
    name: 'Trailblazer', desc: '+1 movement.',
    effect: { move: 1 },
  },
  predators_rhythm: {
    id: 'predators_rhythm', heroId: 'wrenna', type: 'passive', cost: 5,
    name: "Predator's Rhythm", desc: 'Heal 2 whenever you slay a creature.',
    effect: { killHeal: 2 },
  },
  keen_instincts: {
    id: 'keen_instincts', heroId: 'wrenna', type: 'passive', cost: 7,
    name: 'Keen Instincts', desc: '+1 max energy; +1 attack die on the first round of every combat.',
    effect: { energy: 1, firstRoundDice: 1 },
  },

  // ---- Orc Stormseer (Ashka) — mirrored with Wrenna's kit ----
  static_lash: {
    id: 'static_lash', heroId: 'ashka', signature: true, type: 'active', energy: 2,
    name: 'Static Lash', desc: '+1 die, and reduce the foe\'s Attack by 1 this round.',
    effect: { bonusDice: 1, enemyAttackDown: 1 },
  },
  chain_lightning: {
    id: 'chain_lightning', heroId: 'ashka', type: 'active', cost: 7, energy: 3,
    name: 'Chain Lightning', desc: 'Deal 3 automatic hits this combat round.',
    effect: { autoHits: 3 },
  },
  earthhide_ward: {
    id: 'earthhide_ward', heroId: 'ashka', type: 'active', cost: 6, energy: 2,
    name: 'Earthhide Ward', desc: 'Take no damage this combat round.',
    effect: { noDamage: true },
  },
  windwalk: {
    id: 'windwalk', heroId: 'ashka', type: 'passive', cost: 5,
    name: 'Windwalk', desc: '+1 movement.',
    effect: { move: 1 },
  },
  spirit_feast: {
    id: 'spirit_feast', heroId: 'ashka', type: 'passive', cost: 5,
    name: 'Spirit Feast', desc: 'Heal 2 whenever you slay a creature.',
    effect: { killHeal: 2 },
  },
  storm_omen: {
    id: 'storm_omen', heroId: 'ashka', type: 'passive', cost: 7,
    name: 'Storm Omen', desc: '+1 max energy; +1 attack die on the first round of every combat.',
    effect: { energy: 1, firstRoundDice: 1 },
  },
}

export const ABILITY_LIST = Object.values(ABILITIES)
export const abilitiesForHero = (heroId) => ABILITY_LIST.filter((a) => a.heroId === heroId)
export const trainableForHero = (heroId) =>
  ABILITY_LIST.filter((a) => a.heroId === heroId && !a.signature)
export const abilityArt = (id) => `/assets/abilities/${id}.webp`

// slot 1 = signature; slots 2, 3 and 4 unlock at levels 2, 4 and 5
export const maxAbilitySlots = (level) =>
  1 + (level >= 2 ? 1 : 0) + (level >= 4 ? 1 : 0) + (level >= 5 ? 1 : 0)

// An ability whose ONLY effect is healing — pointless to cast at full health.
// Mixed abilities (e.g. dice + heal) stay useful even at full HP.
export const isHealOnly = (ab) => {
  if (!ab?.effect?.heal) return false
  return Object.keys(ab.effect).every((k) => k === 'heal')
}
