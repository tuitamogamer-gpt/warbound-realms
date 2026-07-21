// Six heroes of Aetheria. Base stats are level 1.
// Each hero starts with their signature ability (see data/abilities.js);
// more class abilities can be trained in towns.
export const HEROES = {
  grosh: {
    id: 'grosh',
    name: 'Grosh Ironhide',
    title: 'Orc Berserker',
    faction: 'dominion',
    base: { hp: 10, dice: 3, armor: 0, energy: 2, move: 2 },
    signature: 'rage',
    blurb: 'A warchief who answers every question with an axe. Usually both axes.',
  },
  zyra: {
    id: 'zyra',
    name: 'Zyra Cinderweave',
    title: 'Flame Sorceress',
    faction: 'dominion',
    base: { hp: 8, dice: 2, armor: 0, energy: 5, move: 2 },
    signature: 'fireball',
    blurb: 'Her hair caught fire the day she was born. The fire never lost.',
  },
  morvek: {
    id: 'morvek',
    name: 'Morvek Nightfang',
    title: 'Panther-folk Shadowstalker',
    faction: 'dominion',
    base: { hp: 8, dice: 3, armor: 0, energy: 3, move: 3 },
    signature: 'ambush',
    blurb: 'You will hear his purr exactly once, and it will be too late.',
  },
  aldric: {
    id: 'aldric',
    name: 'Ser Aldric Dawnshield',
    title: 'Human Knight',
    faction: 'accord',
    base: { hp: 9, dice: 2, armor: 1, energy: 2, move: 2 },
    signature: 'shield_wall',
    blurb: 'The last shield between the dark and the dawn — and he knows it.',
  },
  elowen: {
    id: 'elowen',
    name: 'Elowen Starbrook',
    title: 'Elf Arcanist',
    faction: 'accord',
    base: { hp: 8, dice: 2, armor: 0, energy: 4, move: 2 },
    signature: 'arcane_bolt',
    blurb: 'She has read every book in Eldara. Twice. In the original starlight.',
  },
  torvald: {
    id: 'torvald',
    name: 'Torvald Lightmend',
    title: 'Dwarf Cleric',
    faction: 'accord',
    base: { hp: 10, dice: 2, armor: 0, energy: 4, move: 2 },
    signature: 'mend',
    blurb: 'Half priest, half anvil. His prayers hit like hammers.',
  },
  // Wrenna and Ashka are deliberate stat-mirrors of each other (identical
  // numbers, mirrored kits) so adding them cannot tilt faction balance.
  wrenna: {
    id: 'wrenna',
    name: 'Wrenna Thistledown',
    title: 'Wildkeeper Ranger',
    faction: 'accord',
    base: { hp: 9, dice: 2, armor: 0, energy: 4, move: 2 },
    signature: 'pinning_shot',
    blurb: 'The forest told her everything. She only had to stop talking first.',
  },
  ashka: {
    id: 'ashka',
    name: 'Ashka Stormcaller',
    title: 'Orc Stormseer',
    faction: 'dominion',
    base: { hp: 9, dice: 2, armor: 0, energy: 4, move: 2 },
    signature: 'static_lash',
    blurb: 'The sky owes her a debt. She collects it one bolt at a time.',
  },
}

export const HERO_LIST = Object.values(HEROES)
export const heroArt = (id) => `/assets/heroes/${id}.webp`
