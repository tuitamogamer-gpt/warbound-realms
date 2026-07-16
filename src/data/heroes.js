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
    base: { hp: 7, dice: 2, armor: 0, energy: 5, move: 2 },
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
    base: { hp: 11, dice: 2, armor: 1, energy: 2, move: 2 },
    signature: 'shield_wall',
    blurb: 'The last shield between the dark and the dawn — and he knows it.',
  },
  elowen: {
    id: 'elowen',
    name: 'Elowen Starbrook',
    title: 'Elf Arcanist',
    faction: 'accord',
    base: { hp: 7, dice: 2, armor: 0, energy: 4, move: 2 },
    signature: 'arcane_bolt',
    blurb: 'She has read every book in Eldara. Twice. In the original starlight.',
  },
  torvald: {
    id: 'torvald',
    name: 'Torvald Lightmend',
    title: 'Dwarf Cleric',
    faction: 'accord',
    base: { hp: 9, dice: 2, armor: 0, energy: 4, move: 2 },
    signature: 'mend',
    blurb: 'Half priest, half anvil. His prayers hit like hammers.',
  },
}

export const HERO_LIST = Object.values(HEROES)
export const heroArt = (id) => `/assets/heroes/${id}.jpg`
