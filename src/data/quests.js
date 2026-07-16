import { creatureArt } from './creatures'
import { regionArt } from './regions'

// Quest types:
//  killCreature — slay the named creature anywhere
//  killTier     — slay any creature of the tier (optionally in a specific region)
//  visit        — end a move in the region

// Card art: hunt quests show their prey, travel quests show the destination.
export const questArt = (quest) =>
  quest.type === 'killCreature' ? creatureArt(quest.creature) : regionArt(quest.region)
export const QUESTS = [
  {
    id: 'wolves_at_the_door',
    name: 'Wolves at the Door',
    type: 'killCreature',
    creature: 'gnarlwood_wolf',
    text: 'Slay a Gnarlwood Wolf.',
    reward: { xp: 2, gold: 2, vp: 1 },
  },
  {
    id: 'roads_made_safe',
    name: 'Roads Made Safe',
    type: 'killCreature',
    creature: 'bandit_marauder',
    text: 'Slay a Bandit Marauder.',
    reward: { xp: 2, gold: 3, vp: 1 },
  },
  {
    id: 'drain_the_mire',
    name: 'Drain the Mire',
    type: 'killTier',
    tier: 2,
    region: 'mirefen',
    text: 'Slay a creature in Mirefen Swamp.',
    reward: { xp: 3, gold: 3, vp: 2 },
  },
  {
    id: 'the_sleeping_stone',
    name: 'The Sleeping Stone',
    type: 'killCreature',
    creature: 'stone_golem',
    text: 'Slay a Stone Golem.',
    reward: { xp: 4, gold: 3, vp: 2 },
  },
  {
    id: 'queen_of_talons',
    name: 'Queen of Talons',
    type: 'killCreature',
    creature: 'harpy_matriarch',
    text: 'Slay a Harpy Matriarch.',
    reward: { xp: 4, gold: 3, vp: 2 },
  },
  {
    id: 'rest_for_the_fallen',
    name: 'Rest for the Fallen',
    type: 'killCreature',
    creature: 'gravebound_knight',
    text: 'Slay a Gravebound Knight.',
    reward: { xp: 4, gold: 3, vp: 2 },
  },
  {
    id: 'cold_blood',
    name: 'Cold Blood',
    type: 'killCreature',
    creature: 'frost_wyrm',
    text: 'Slay the Frost Wyrm.',
    reward: { xp: 6, gold: 5, vp: 3 },
  },
  {
    id: 'heart_of_cinders',
    name: 'Heart of Cinders',
    type: 'killCreature',
    creature: 'infernal_colossus',
    text: 'Slay the Infernal Colossus.',
    reward: { xp: 6, gold: 5, vp: 3 },
  },
  {
    id: 'silence_the_void',
    name: 'Silence the Void',
    type: 'killCreature',
    creature: 'void_shrike',
    text: 'Slay the Void Shrike.',
    reward: { xp: 6, gold: 5, vp: 3 },
  },
  {
    id: 'ashes_and_echoes',
    name: 'Ashes and Echoes',
    type: 'killTier',
    tier: 2,
    region: 'scorched_vale',
    text: 'Slay a creature in the Scorched Vale.',
    reward: { xp: 3, gold: 3, vp: 2 },
  },
  {
    id: 'scout_the_ruins',
    name: 'Scout the Ruins',
    type: 'visit',
    region: 'ruins_eldara',
    text: 'Travel to the Ruins of Eldara.',
    reward: { xp: 1, gold: 2, vp: 1 },
  },
  {
    id: 'chart_the_coast',
    name: 'Chart the Coast',
    type: 'visit',
    region: 'shadowmere',
    text: 'Travel to the Shadowmere Coast.',
    reward: { xp: 1, gold: 2, vp: 1 },
  },
  {
    id: 'pilgrimage_of_frost',
    name: 'Pilgrimage of Frost',
    type: 'visit',
    region: 'frostpeak',
    text: 'Travel to the Frostpeak Mountains.',
    reward: { xp: 2, gold: 2, vp: 1 },
  },
  {
    id: 'embassy_of_trade',
    name: 'Embassy of Trade',
    type: 'visit',
    region: 'wayfarers_rest',
    text: "Travel to Wayfarer's Rest.",
    reward: { xp: 1, gold: 3, vp: 1 },
  },
]
