// One event is revealed at the start of each round and lasts the whole round.
// `instant` effects fire on reveal; `mod` effects are read during the round.
export const EVENTS = {
  blood_moon: {
    id: 'blood_moon',
    name: 'Blood Moon',
    desc: 'All creatures roll +1 die this round.',
    mod: { creatureDice: 1 },
  },
  merchant_caravan: {
    id: 'merchant_caravan',
    name: 'Merchant Caravan',
    desc: 'Items cost 2 less gold this round (minimum 1).',
    mod: { shopDiscount: 2 },
  },
  wandering_sage: {
    id: 'wandering_sage',
    name: 'Wandering Sage',
    desc: 'Every hero immediately gains 1 experience.',
    instant: { xpAll: 1 },
  },
  storm_winds: {
    id: 'storm_winds',
    name: 'Storm Winds',
    desc: 'All heroes have -1 movement this round (minimum 1).',
    mod: { movePenalty: 1 },
  },
  gold_rush: {
    id: 'gold_rush',
    name: 'Gold Rush',
    desc: 'Every hero immediately gains 2 gold.',
    instant: { goldAll: 2 },
  },
  restless_dead: {
    id: 'restless_dead',
    name: 'Restless Dead',
    desc: 'All slain creatures immediately return to their regions.',
    instant: { respawnAll: true },
  },
  heroic_inspiration: {
    id: 'heroic_inspiration',
    name: 'Heroic Inspiration',
    desc: 'All heroes roll +1 attack die this round.',
    mod: { heroDice: 1 },
  },
  fell_omen: {
    id: 'fell_omen',
    name: 'Fell Omen',
    desc: 'Every hero immediately suffers 1 damage (cannot drop below 1 health).',
    instant: { damageAll: 1 },
  },
  crossroads_ultimatum: {
    id: 'crossroads_ultimatum',
    art: 'storm_winds',
    name: 'Crossroads Ultimatum',
    desc: 'The first hero must choose whether to shelter or press the march.',
    choices: [
      {
        id: 'shelter',
        name: 'Shelter the Company',
        desc: 'Recover 3 health.',
        effect: { healCurrent: 3 },
      },
      {
        id: 'press_on',
        name: 'Press On',
        desc: 'Suffer 1 damage and gain +1 movement this turn.',
        effect: { damageCurrent: 1, movesCurrent: 1 },
      },
    ],
  },
  shattered_relic: {
    id: 'shattered_relic',
    art: 'fell_omen',
    name: 'The Shattered Relic',
    desc: 'A dangerous relic offers immediate power at a price.',
    choices: [
      {
        id: 'sell_shards',
        name: 'Sell the Shards',
        desc: 'Gain 3 gold and suffer 2 damage.',
        effect: { goldCurrent: 3, damageCurrent: 2 },
      },
      {
        id: 'study_runes',
        name: 'Study the Runes',
        desc: 'Gain 2 experience.',
        effect: { xpCurrent: 2 },
      },
    ],
  },
  leyline_surge: {
    id: 'leyline_surge',
    art: 'heroic_inspiration',
    name: 'Leyline Surge',
    desc: 'The first hero to reach the Ruins of Eldara claims 2 victory points.',
    objective: {
      region: 'ruins_eldara',
      text: 'Reach the Ruins of Eldara first.',
      reward: { vp: 2 },
    },
  },
  gilded_courier: {
    id: 'gilded_courier',
    name: 'The Gilded Courier',
    desc: 'A royal courier crosses the realm — the first hero decides what to do with the satchel.',
    choices: [
      {
        id: 'take_purse',
        name: 'Take the Purse',
        desc: 'Gain 2 gold.',
        effect: { goldCurrent: 2 },
      },
      {
        id: 'carry_word',
        name: 'Carry the Word',
        desc: 'Gain 1 experience.',
        effect: { xpCurrent: 1 },
      },
    ],
  },
  war_drums: {
    id: 'war_drums',
    name: 'War Drums',
    desc: 'The first hero to reach Stormwatch Bridge claims 2 victory points.',
    objective: {
      region: 'stormwatch_bridge',
      text: 'Reach Stormwatch Bridge first.',
      reward: { vp: 2 },
    },
  },
  long_roads: {
    id: 'long_roads',
    name: 'Long Roads',
    desc: 'All heroes have +1 movement this round.',
    mod: { moveBonus: 1 },
  },
  kindled_spirits: {
    id: 'kindled_spirits',
    name: 'Kindled Spirits',
    desc: 'Every hero immediately gains 1 energy.',
    instant: { energyAll: 1 },
  },
}

export const EVENT_LIST = Object.values(EVENTS)
export const eventArt = (id) => `/assets/events/${EVENTS[id]?.art || id}.webp`
