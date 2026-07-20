// Seeded headless balance simulation. It drives the production Zustand store
// through legal 2-player and 4-player games so a failing run can be reproduced.
import { ABILITIES, maxAbilitySlots, trainableForHero } from '../src/data/abilities.js'
import { GAME } from '../src/data/constants.js'
import { ITEM_LIST, ITEMS } from '../src/data/items.js'
import { QUESTS } from '../src/data/quests.js'
import { REGIONS } from '../src/data/regions.js'
import { talentsForLevel } from '../src/data/talents.js'
import { effStats } from '../src/game/rules.js'
import { reachableRegions, selCurrentPlayer, useGame } from '../src/game/store.js'

const HEROES_BY_FACTION = {
  accord: ['aldric', 'elowen', 'torvald'],
  dominion: ['grosh', 'zyra', 'morvek'],
}

const DEFAULT_GAMES = 100
const DEFAULT_SEED = 'warbound-balance-v1'
const MAX_STEPS = 10_000

function parseArgs(argv) {
  const valueAfter = (flag, fallback) => {
    const index = argv.indexOf(flag)
    return index >= 0 ? argv[index + 1] : fallback
  }
  if (argv.includes('--help')) {
    console.log('Usage: npm run simulate -- [--seed text] [--games count] [--setup 2p|4p|both]')
    process.exit(0)
  }
  const games = Number.parseInt(valueAfter('--games', String(DEFAULT_GAMES)), 10)
  const setup = valueAfter('--setup', 'both')
  const seed = valueAfter('--seed', DEFAULT_SEED)
  if (!Number.isInteger(games) || games < 1) throw new Error('--games must be a positive integer')
  if (!['2p', '4p', 'both'].includes(setup)) throw new Error('--setup must be 2p, 4p, or both')
  return { games, seed, setup }
}

function hashSeed(value) {
  let hash = 2166136261
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = (values, rng) => values[Math.floor(rng() * values.length)]

function shuffled(values, rng) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const swapWith = Math.floor(rng() * (index + 1))
    ;[result[index], result[swapWith]] = [result[swapWith], result[index]]
  }
  return result
}

function assert(condition, message, context) {
  if (condition) return
  const details = context ? ` ${JSON.stringify(context)}` : ''
  throw new Error(`${message}${details}`)
}

function makeRoster(playerCount, rng) {
  const perFaction = playerCount / 2
  const accord = shuffled(HEROES_BY_FACTION.accord, rng).slice(0, perFaction)
  const dominion = shuffled(HEROES_BY_FACTION.dominion, rng).slice(0, perFaction)
  const roster = []
  for (let index = 0; index < perFaction; index++) {
    roster.push({ name: `Accord ${index + 1}`, heroId: accord[index] })
    roster.push({ name: `Dominion ${index + 1}`, heroId: dominion[index] })
  }
  return roster
}

function shortestStep(state, player, targetRegion) {
  if (!targetRegion || player.region === targetRegion) return null
  const queue = [player.region]
  const previous = new Map([[player.region, null]])
  while (queue.length) {
    const regionId = queue.shift()
    if (regionId === targetRegion) break
    for (const next of REGIONS[regionId].adjacent) {
      const destination = REGIONS[next]
      if (previous.has(next)) continue
      if (destination.capital && destination.capital !== player.faction) continue
      if (next === 'blackspire' && !state.bossSpawned) continue
      previous.set(next, regionId)
      queue.push(next)
    }
  }
  if (!previous.has(targetRegion)) return null
  let step = targetRegion
  while (previous.get(step) !== player.region) step = previous.get(step)
  return step
}

function questTarget(state, player) {
  for (const questId of player.quests) {
    const quest = QUESTS.find((candidate) => candidate.id === questId)
    if (!quest) continue
    if (quest.type === 'visit' || quest.region) return quest.region
    if (quest.type === 'killCreature') {
      const entry = Object.entries(state.creatures).find(([, slot]) => slot?.defId === quest.creature)
      if (entry) return entry[0]
    }
  }
  return null
}

function movementTarget(state, player, rng) {
  if (state.bossSpawned && state.bossHp > 0 && player.hp >= 6 && rng() < 0.55) {
    return 'blackspire'
  }
  const quest = questTarget(state, player)
  if (quest && rng() < 0.65) return quest
  const enemies = state.players.filter((candidate) => candidate.faction !== player.faction && !candidate.dead)
  if (enemies.length && rng() < 0.35) return rnd(enemies, rng).region
  return null
}

function affordableItems(state, player) {
  return ITEM_LIST.filter((item) => {
    if (item.cost > player.gold) return false
    if (item.slot === 'consumable') return player.consumables.length < GAME.MAX_CONSUMABLES
    return !player.items.includes(item.id)
  })
}

function validatePlayer(player) {
  const effective = effStats(player)
  assert(player.hp >= 0 && player.hp <= effective.maxHp, 'hp outside bounds', {
    player: player.idx,
    hp: player.hp,
    maxHp: effective.maxHp,
  })
  assert(player.energy >= 0 && player.energy <= effective.maxEnergy, 'energy outside bounds', {
    player: player.idx,
    energy: player.energy,
    maxEnergy: effective.maxEnergy,
  })
  assert(player.level >= 1 && player.level <= 5, 'level outside bounds', {
    player: player.idx,
    level: player.level,
  })
  assert(player.quests.length <= GAME.MAX_ACTIVE_QUESTS, 'too many active quests', {
    player: player.idx,
    quests: player.quests,
  })
  assert(player.abilities.length <= maxAbilitySlots(player.level), 'too many abilities', {
    player: player.idx,
    abilities: player.abilities,
    level: player.level,
  })
  assert(REGIONS[player.region], 'player occupies an unknown region', {
    player: player.idx,
    region: player.region,
  })
}

function playOneGame({ gameIndex, playerCount, runSeed }) {
    const botRng = mulberry32(hashSeed(`${runSeed}:bot`))
    const roster = makeRoster(playerCount, botRng)
    useGame.getState().startGame(roster, {
      seed: hashSeed(`${runSeed}:engine`),
      skipTutorial: true,
    })
    let steps = 0
    let duelStarts = 0

    while (useGame.getState().screen === 'game' && steps < MAX_STEPS) {
      steps++
      const state = useGame.getState()

      // Privacy handoff has precedence over every player-specific decision.
      // The engine intentionally rejects attempts to dismiss/reveal them first.
      if (state.handoffPending) {
        state.confirmHandoff()
        continue
      }
      if (state.eventReveal) {
        state.dismissEventReveal()
        continue
      }
      if (state.eventChoice) {
        assert(state.eventChoice.options.length > 0, 'event choice has no options')
        state.chooseEventOption(rnd(state.eventChoice.options, botRng))
        continue
      }
      if (state.combat) {
        if (state.combat.pvp && ['defender', 'attacker'].includes(state.combat.pvpHandoff)) {
          state.confirmPvpHandoff()
          continue
        }
        if (state.combat.over) {
          state.closeCombat()
          continue
        }
        if (state.combat.pvp && state.combat.pvpDefensePending) {
          state.setPvpDefense(rnd(['brace', 'counter'], botRng))
          continue
        }
        if (state.combat.rolling) {
          // The 460ms lock exists only to keep the rendered dice animation from
          // accepting another click. A headless simulation has no animation.
          useGame.setState((draft) => {
            if (draft.combat) draft.combat.rolling = false
          })
          continue
        }
        const player = state.players[state.combat.playerIdx]
        if (player.hp <= 2 && botRng() < 0.8) {
          state.combatFlee()
          continue
        }
        if (player.consumables.length && botRng() < 0.3) {
          const usable = player.consumables
            .map((itemId, index) => ({ itemId, index, effects: ITEMS[itemId]?.effects || {} }))
            .filter(({ effects }) =>
              (effects.heal && player.hp < effStats(player).maxHp) ||
              effects.combatDice ||
              effects.combatAutoHits ||
              effects.combatArmor
            )
          if (usable.length) state.useConsumable(rnd(usable, botRng).index)
        }
        const abilities = player.abilities
          .map((abilityId) => ABILITIES[abilityId])
          .filter((ability) => ability?.type === 'active' && player.energy >= ability.energy)
        const abilityId = abilities.length && botRng() < 0.45
          ? rnd(abilities, botRng).id
          : null
        state.combatRound(abilityId, state.combat.round)
        continue
      }
      if (state.celebrations.length) {
        state.dismissCelebration()
        continue
      }
      if (state.questDraw) {
        const options = state.questDraw.options
        assert(options.length > 0, 'quest draw has no options')
        state.pickQuest(rnd(options, botRng))
        continue
      }

      const player = selCurrentPlayer(state)
      assert(player, 'current player is missing')
      validatePlayer(player)

      if (player.pendingTalents?.length) {
        const options = talentsForLevel(player.pendingTalents[0], player.heroId)
        assert(options.length > 0, 'pending talent has no options', { level: player.pendingTalents[0] })
        state.chooseTalent(rnd(options, botRng).id)
        continue
      }

      const effective = effStats(player)
      const region = REGIONS[player.region]
      const creature = state.creatures[player.region]
      const bossHere = player.region === 'blackspire' && state.bossSpawned && state.bossHp > 0

      if (!state.actionUsed && bossHere && player.hp > 5) {
        state.startCombat(true)
        continue
      }
      const enemiesHere = region.town
        ? []
        : state.players.filter(
            (candidate) =>
              candidate.faction !== player.faction &&
              !candidate.dead &&
              candidate.region === player.region
          )
      if (!state.actionUsed && enemiesHere.length && player.hp > 4 && botRng() < 0.75) {
        state.startPvp(rnd(enemiesHere, botRng).idx)
        if (useGame.getState().combat?.pvp) duelStarts++
        continue
      }
      if (!state.actionUsed && creature && player.hp > 4 && botRng() < 0.85) {
        state.startCombat(false)
        continue
      }
      if (region.town && player.gold >= 3 && botRng() < 0.55) {
        const freeSlots = maxAbilitySlots(player.level) - player.abilities.length
        const abilities = trainableForHero(player.heroId).filter(
          (ability) => !player.abilities.includes(ability.id) && ability.cost <= player.gold
        )
        if (freeSlots > 0 && abilities.length && botRng() < 0.5) {
          state.buyAbility(rnd(abilities, botRng).id)
          continue
        }
        const items = affordableItems(state, player)
        if (items.length) {
          state.buyItem(rnd(items, botRng).id, {
            turnId: state.turnId,
            requestId: `sim:${runSeed}:${steps}`,
          })
          continue
        }
      }
      if (!state.actionUsed && region.town && player.hp < effective.maxHp - 3 && botRng() < 0.7) {
        state.rest()
        continue
      }
      if (state.movesLeft > 0 && botRng() < 0.8) {
        const reachable = reachableRegions(state)
        if (reachable.length) {
          const target = movementTarget(state, player, botRng)
          const preferred = shortestStep(state, player, target)
          state.moveTo(
            preferred && reachable.includes(preferred) ? preferred : rnd(reachable, botRng)
          )
          continue
        }
      }
      state.endTurn({ playerIdx: player.idx, turnId: state.turnId })
    }

    const end = useGame.getState()
    assert(steps < MAX_STEPS, 'game exceeded step budget', { gameIndex, playerCount, steps })
    assert(end.screen === 'victory', 'game did not reach victory', {
      gameIndex,
      playerCount,
      screen: end.screen,
    })
    assert(end.winner, 'winner is missing', { gameIndex, playerCount })
    return {
      gameIndex,
      runSeed,
      playerCount,
      rounds: Math.min(end.round, GAME.MAX_ROUNDS),
      winner: end.winner.faction ?? 'draw',
      reason: end.winner.slayer ? 'boss-kill' : 'victory-points',
      duelStarts,
      duelWins: end.players.reduce((total, player) => total + (player.pvpWins || 0), 0),
      heroes: end.players.map((player) => ({ heroId: player.heroId, faction: player.faction })),
    }
}

function percentage(count, total) {
  return total ? `${((count / total) * 100).toFixed(1)}%` : '0.0%'
}

function average(results, field) {
  return results.length
    ? (results.reduce((sum, result) => sum + result[field], 0) / results.length).toFixed(2)
    : '0.00'
}

function report(label, expectedGames, results) {
  const wins = { accord: 0, dominion: 0, draw: 0 }
  const reasons = { 'boss-kill': 0, 'victory-points': 0 }
  const heroStats = {}
  for (const result of results) {
    wins[result.winner] = (wins[result.winner] || 0) + 1
    reasons[result.reason] = (reasons[result.reason] || 0) + 1
    for (const hero of result.heroes) {
      heroStats[hero.heroId] ||= { games: 0, factionWins: 0 }
      heroStats[hero.heroId].games++
      if (result.winner === hero.faction) heroStats[hero.heroId].factionWins++
    }
  }
  console.log(`\n${label}: ${results.length}/${expectedGames} games completed`)
  console.log(
    `  wins: Accord ${wins.accord} (${percentage(wins.accord, results.length)}), ` +
      `Dominion ${wins.dominion} (${percentage(wins.dominion, results.length)}), ` +
      `draw ${wins.draw} (${percentage(wins.draw, results.length)})`
  )
  console.log(
    `  endings: boss ${reasons['boss-kill']}, points ${reasons['victory-points']}; ` +
      `avg rounds ${average(results, 'rounds')}; avg duels started ${average(results, 'duelStarts')}; ` +
      `avg duel wins ${average(results, 'duelWins')}`
  )
  const heroes = Object.entries(heroStats)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([heroId, stats]) => `${heroId} ${percentage(stats.factionWins, stats.games)} (${stats.games})`)
  console.log(`  hero faction win rate (appearances): ${heroes.join(', ')}`)
}

const options = parseArgs(process.argv.slice(2))
const setups = options.setup === 'both' ? [2, 4] : [Number.parseInt(options.setup, 10)]
let failed = 0
console.log(`Seed: ${options.seed}`)
console.log(`Games per setup: ${options.games}`)

for (const playerCount of setups) {
  const results = []
  for (let gameIndex = 0; gameIndex < options.games; gameIndex++) {
    const runSeed = `${options.seed}:${playerCount}p:${gameIndex}`
    try {
      results.push(playOneGame({ gameIndex, playerCount, runSeed }))
    } catch (error) {
      failed++
      console.error(`${playerCount}p game ${gameIndex} failed (seed ${runSeed}): ${error.message}`)
    }
  }
  report(`${playerCount}-player`, options.games, results)
  if (results.length !== options.games) process.exitCode = 1
}

if (failed) {
  console.error(`\n${failed} simulation game(s) failed. Re-run with the printed seed and setup.`)
  process.exitCode = 1
}
