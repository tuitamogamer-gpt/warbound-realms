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
}

export const EVENT_LIST = Object.values(EVENTS)
export const eventArt = (id) => `/assets/events/${id}.jpg`
