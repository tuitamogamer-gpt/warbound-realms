// Headless full-game simulation: drives the real zustand store through random
// but legal plays to validate the rules engine end to end.
import { useGame, selCurrentPlayer, reachableRegions } from '../src/game/store.js'
import { REGIONS } from '../src/data/regions.js'
import { ITEM_LIST, ITEMS as ITEMS_LOOKUP } from '../src/data/items.js'
import { talentsForLevel } from '../src/data/talents.js'
import { ABILITIES, trainableForHero, maxAbilitySlots } from '../src/data/abilities.js'
import { effStats } from '../src/game/rules.js'

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)]

function assert(cond, msg, ctx) {
  if (!cond) {
    console.error('ASSERTION FAILED:', msg, ctx ?? '')
    process.exitCode = 1
    throw new Error(msg)
  }
}

function playOneGame(gameIdx) {
  const store = useGame
  const api = store.getState()
  api.startGame([
    { name: 'Alpha', heroId: rnd(['aldric', 'elowen', 'torvald']) },
    { name: 'Bravo', heroId: rnd(['grosh', 'zyra', 'morvek']) },
  ])

  let steps = 0
  const MAX_STEPS = 5000

  while (store.getState().screen === 'game' && steps < MAX_STEPS) {
    steps++
    const s = store.getState()

    if (s.eventReveal) {
      s.dismissEventReveal()
      continue
    }

    if (s.combat) {
      if (s.combat.over) {
        s.closeCombat()
      } else {
        const p = s.players[s.combat.playerIdx]
        // flee if badly wounded, otherwise attack (sometimes with an ability)
        if (p.hp <= 2 && Math.random() < 0.8) {
          s.combatFlee()
        } else {
          // sometimes pop a combat consumable (firebomb / stoneskin / elixir)
          if (Math.random() < 0.3) {
            const ci = p.consumables.findIndex(
              (id) => ITEM_LIST.find((it) => it.id === id)?.effects &&
                (ITEMS_LOOKUP[id].effects.combatDice || ITEMS_LOOKUP[id].effects.combatAutoHits || ITEMS_LOOKUP[id].effects.combatArmor)
            )
            if (ci >= 0) s.useConsumable(ci)
          }
          let abilityId = null
          if (Math.random() < 0.4) {
            const usable = p.abilities
              .map((id) => ABILITIES[id])
              .filter((ab) => ab.type === 'active' && p.energy >= ab.energy)
            if (usable.length) abilityId = rnd(usable).id
          }
          s.combatRound(abilityId)
        }
      }
      continue
    }

    if (s.celebrations.length) {
      s.dismissCelebration()
      continue
    }

    if (s.questDraw) {
      const idx = s.questDraw.playerIdx
      const before = s.players[idx].quests.length
      const celebBefore = s.celebrations.length
      s.pickQuest(rnd(s.questDraw.options))
      const ns = useGame.getState()
      const after = ns.players[idx].quests.length
      // a visit quest for the region you're standing in completes instantly
      const instantComplete = after === before && ns.celebrations.length > celebBefore
      assert(after === before + 1 || instantComplete, 'quest pick adds one quest (or completes instantly)', { before, after })
      continue
    }

    const p = selCurrentPlayer(s)
    assert(p, 'current player exists')

    // spend pending talent choices like a player would
    if (p.pendingTalents?.length) {
      const before = p.pendingTalents.length
      s.chooseTalent(rnd(talentsForLevel(p.pendingTalents[0])).id)
      const after = selCurrentPlayer(useGame.getState()).pendingTalents.length
      assert(after === before - 1, 'talent choice consumed exactly one pending slot', { before, after })
      continue
    }

    const eff = effStats(p)
    assert(p.hp >= 0 && p.hp <= eff.maxHp, 'hp within bounds', { hp: p.hp, max: eff.maxHp })
    assert(p.energy >= 0 && p.energy <= eff.maxEnergy, 'energy within bounds', { e: p.energy })
    assert(p.level >= 1 && p.level <= 5, 'level within bounds', { lvl: p.level })
    assert(p.quests.length <= 2, 'never more than 2 active quests', { q: p.quests.length })
    assert(
      p.abilities.length <= maxAbilitySlots(p.level),
      'abilities within slot limit',
      { a: p.abilities.length, lvl: p.level }
    )
    assert(REGIONS[p.region], 'player on a real region', { r: p.region })

    const region = REGIONS[p.region]
    const creatureHere = s.creatures[p.region]
    const bossHere = p.region === 'blackspire' && s.bossSpawned && s.bossHp > 0

    // action priority: fight boss > duel sometimes > fight creature > shop > rest
    if (!s.actionUsed && bossHere && p.hp > 5) {
      s.startCombat(true)
      continue
    }
    const enemyHere = s.players.find(
      (pl) => pl.faction !== p.faction && !pl.dead && pl.region === p.region
    )
    if (!s.actionUsed && enemyHere && !region.town && p.hp > 4 && Math.random() < 0.7) {
      s.startPvp(enemyHere.idx)
      assert(useGame.getState().combat?.pvp, 'duel opened as pvp combat')
      continue
    }
    if (!s.actionUsed && creatureHere && p.hp > 4 && Math.random() < 0.8) {
      s.startCombat(false)
      continue
    }
    if (region.town && p.gold >= 4 && Math.random() < 0.5) {
      // sometimes train an ability, sometimes buy an item
      const freeSlots = maxAbilitySlots(p.level) - p.abilities.length
      const learnable = trainableForHero(p.heroId).filter(
        (ab) => !p.abilities.includes(ab.id) && ab.cost <= p.gold
      )
      if (freeSlots > 0 && learnable.length && Math.random() < 0.5) {
        s.buyAbility(rnd(learnable).id)
      } else {
        const affordable = ITEM_LIST.filter((i) => i.cost <= p.gold)
        if (affordable.length) s.buyItem(rnd(affordable).id)
      }
    }
    if (!s.actionUsed && p.hp < eff.maxHp - 4 && region.town && Math.random() < 0.7) {
      s.rest()
      continue
    }
    if (s.movesLeft > 0 && Math.random() < 0.75) {
      const opts = reachableRegions(s)
      if (opts.length) {
        s.moveTo(rnd(opts))
        continue
      }
    }
    s.endTurn()
  }

  const end = store.getState()
  assert(steps < MAX_STEPS, 'game finished within step budget', { steps })
  assert(end.screen === 'victory', 'game reached victory screen', { screen: end.screen })
  assert(end.winner, 'winner object set')
  assert(end.round <= 11, 'rounds within limit', { round: end.round })
  return {
    game: gameIdx,
    rounds: Math.min(end.round, 10),
    winner: end.winner.faction ?? 'draw',
    reason: end.winner.slayer ? 'boss-kill' : 'victory-points',
    duels: end.players.reduce((n, p) => n + (p.pvpWins || 0), 0),
    steps,
  }
}

const N = 30
const results = []
for (let i = 0; i < N; i++) {
  try {
    results.push(playOneGame(i))
  } catch (e) {
    console.error(`Game ${i} failed:`, e.message)
  }
}

const byWinner = {}
const byReason = {}
let totalRounds = 0
let totalDuels = 0
for (const r of results) {
  byWinner[r.winner] = (byWinner[r.winner] || 0) + 1
  byReason[r.reason] = (byReason[r.reason] || 0) + 1
  totalRounds += r.rounds
  totalDuels += r.duels
}
console.log(`\n${results.length}/${N} games completed cleanly`)
console.log('winners:', byWinner)
console.log('end condition:', byReason)
console.log('avg rounds:', (totalRounds / results.length).toFixed(1))
console.log('avg duel wins per game:', (totalDuels / results.length).toFixed(1))
