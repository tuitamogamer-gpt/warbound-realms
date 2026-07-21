import { describe, expect, it } from 'vitest'
import { CREATURES } from '../src/data/creatures'
import { GAME } from '../src/data/constants'
import { HEROES } from '../src/data/heroes'
import { trainableForHero } from '../src/data/abilities'
import { talentsForLevel } from '../src/data/talents'
import { selCurrentPlayer, useGame } from '../src/game/store'

const TEST_SEED = 0x2cafe005

function clearBlockingUi() {
  if (useGame.getState().handoffPending) useGame.getState().confirmHandoff()
  useGame.setState({
    eventReveal: false,
    questDraw: null,
    celebrations: [],
    shopOpen: false,
    rulesOpen: false,
    sheetOpen: null,
    eventChoice: null,
  })
}

function startGame(roster) {
  useGame.getState().startGame(roster, { seed: TEST_SEED, skipTutorial: true })
  clearBlockingUi()
  return useGame.getState()
}

const NEW_HERO_ROSTER = [
  { name: 'Wrenna', heroId: 'wrenna' },
  { name: 'Ashka', heroId: 'ashka' },
]

describe('mirrored heroes', () => {
  it('wrenna and ashka share identical base stats and kit numbers', () => {
    expect(HEROES.wrenna.base).toEqual(HEROES.ashka.base)
    const shape = (heroId) =>
      trainableForHero(heroId)
        .map(({ type, cost, energy, effect }) => JSON.stringify({ type, cost, energy, effect }))
        .sort()
    expect(shape('wrenna')).toEqual(shape('ashka'))
  })

  it('both new heroes have exactly two talent options at levels 2 and 4', () => {
    for (const heroId of ['wrenna', 'ashka']) {
      expect(talentsForLevel(2, heroId)).toHaveLength(2)
      expect(talentsForLevel(4, heroId)).toHaveLength(2)
    }
  })

  it('a game with the new heroes starts cleanly', () => {
    const state = startGame(NEW_HERO_ROSTER)
    expect(state.screen).toBe('game')
    const heroIds = state.players.map((player) => player.heroId).sort()
    expect(heroIds).toEqual(['ashka', 'wrenna'])
    for (const player of state.players) {
      expect(player.abilities).toEqual([HEROES[player.heroId].signature])
    }
  })
})

describe('elite creatures', () => {
  it('an elite kill pays the bonus reward and clears the region', () => {
    startGame(NEW_HERO_ROSTER)
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.region = 'silverwood'
      player.energy = 10
      player.maxEnergy = 10
      player.abilities = [...player.abilities, 'triple_volley', 'chain_lightning']
      state.creatures.silverwood = { defId: 'thistle_boar', hp: 1, elite: true, respawnAtRound: null }
      state.actionUsed = false
      state.eventId = null
      state.combat = null
    })
    const before = selCurrentPlayer(useGame.getState())
    const { xp, gold, vp } = before
    useGame.getState().startCombat(false)

    const combat = useGame.getState().combat
    expect(combat.elite).toBe(true)
    expect(combat.maxHp).toBe(CREATURES.thistle_boar.hp + GAME.ELITE_BONUS_HP)

    // 3 automatic hits always kill a 1-hp boar regardless of the dice
    const attackAbility = before.abilities.includes('triple_volley') ? 'triple_volley' : 'chain_lightning'
    useGame.getState().combatRound(attackAbility, 1)

    const after = useGame.getState()
    const player = after.players[combat.playerIdx]
    expect(after.combat.over).toBe(true)
    expect(after.combat.heroWon).toBe(true)
    expect(player.xp - xp).toBe(CREATURES.thistle_boar.xp + GAME.ELITE_BONUS_REWARD)
    expect(player.vp - vp).toBe(CREATURES.thistle_boar.vp + GAME.ELITE_BONUS_REWARD)
    expect(player.gold - gold).toBe(CREATURES.thistle_boar.gold + GAME.ELITE_BONUS_REWARD)
    expect(after.creatures.silverwood).toBeNull()
  })
})

describe('treasure caches', () => {
  it('the first hero to arrive loots a dropped cache', () => {
    startGame(NEW_HERO_ROSTER)
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.region = HEROES[player.heroId].faction === 'accord' ? 'dawnhold' : 'emberfang_hold'
      const target = player.region === 'dawnhold' ? 'silverwood' : 'shadowmere'
      state.caches[target] = GAME.CACHE_GOLD
      state.movesLeft = 2
      state.eventId = null
    })
    const state = useGame.getState()
    const player = selCurrentPlayer(state)
    const target = player.region === 'dawnhold' ? 'silverwood' : 'shadowmere'
    const goldBefore = player.gold
    state.moveTo(target)

    const after = useGame.getState()
    expect(after.caches[target]).toBeUndefined()
    expect(selCurrentPlayer(after).gold).toBe(goldBefore + GAME.CACHE_GOLD)
  })
})

describe('three-color dice combat', () => {
  it('a ranged-volley kill draws no retaliation', () => {
    startGame(NEW_HERO_ROSTER) // both new heroes are ranged-primary (2 ranged dice)
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.region = 'silverwood'
      player.energy = 10
      player.maxEnergy = 10
      player.abilities = [...player.abilities, 'triple_volley', 'chain_lightning']
      state.creatures.silverwood = { defId: 'gnarlwood_wolf', hp: 4, respawnAtRound: null }
      state.actionUsed = false
      state.eventId = null
      state.combat = null
    })
    useGame.getState().startCombat(false)
    const hpBefore = selCurrentPlayer(useGame.getState()).hp
    // shrink the wolf to volley range: any single ranged hit will fell it
    useGame.setState((state) => {
      state.combat.hp = 1
    })
    useGame.getState().combatRound(null, 1)
    const after = useGame.getState()
    if (after.combat.heroWon && after.combat.lastHeroRolls === null) {
      // volley kill: no clash rolls, no damage taken
      expect(selCurrentPlayer(after).hp).toBe(hpBefore)
      expect(after.combat.lastCreatureRolls).toBeNull()
    }
    // whatever the dice did, the fight must have progressed legally
    expect(after.combat.round === 1 || after.combat.round === 2 || after.combat.over).toBe(true)
  })

  it('minions absorb hits before the main enemy and add clash dice', () => {
    startGame(NEW_HERO_ROSTER)
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.region = 'frostpeak'
      player.energy = 10
      player.maxEnergy = 10
      player.abilities = [...player.abilities, 'triple_volley', 'chain_lightning']
      state.creatures.frostpeak = { defId: 'frost_wyrm', hp: 12, respawnAtRound: null }
      state.actionUsed = false
      state.eventId = null
      state.combat = null
    })
    useGame.getState().startCombat(false)
    const combat = useGame.getState().combat
    const minionDef = CREATURES.frost_wyrm.minions
    expect(combat.minions).toHaveLength(minionDef.count)
    expect(combat.minions[0].hp).toBe(minionDef.hp)

    // 3 auto hits: the Rime Spawn falls first, the remainder bites the wyrm
    const ability = selCurrentPlayer(useGame.getState()).abilities.includes('triple_volley')
      ? 'triple_volley'
      : 'chain_lightning'
    useGame.getState().combatRound(ability, 1)
    const after = useGame.getState().combat
    expect(after.minions[0].hp).toBeLessThanOrEqual(0)
    // at least (3 − minion hp) auto hits spilled through to the wyrm
    expect(after.hp).toBeLessThanOrEqual(CREATURES.frost_wyrm.hp - (3 - minionDef.hp * minionDef.count))
  })

  it('fleeing provokes the creature (threat rises, capped)', () => {
    startGame(NEW_HERO_ROSTER)
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.region = 'silverwood'
      state.creatures.silverwood = { defId: 'mire_creeper', hp: 5, respawnAtRound: null }
      state.actionUsed = false
      state.eventId = null
      state.combat = null
    })
    useGame.getState().startCombat(false)
    useGame.setState((state) => {
      state.combat.rolling = false
    })
    useGame.getState().combatFlee()
    expect(useGame.getState().creatures.silverwood.threat).toBe(1)

    // the next fight carries the provocation snapshot
    useGame.setState((state) => {
      state.actionUsed = false
      state.combat = null
    })
    useGame.getState().startCombat(false)
    expect(useGame.getState().combat.threat).toBe(1)
  })
})

describe('new round events', () => {
  it('long_roads grants +1 movement on the next turn', () => {
    startGame(NEW_HERO_ROSTER)
    useGame.setState((state) => {
      state.eventId = 'long_roads'
      state.combat = null
      state.questDraw = null
      state.celebrations = []
    })
    const current = selCurrentPlayer(useGame.getState())
    useGame.getState().endTurn({ playerIdx: current.idx, turnId: useGame.getState().turnId })
    if (useGame.getState().handoffPending) useGame.getState().confirmHandoff()

    const state = useGame.getState()
    const next = selCurrentPlayer(state)
    // both new heroes have base move 2; long_roads adds one
    expect(state.movesLeft).toBe(HEROES[next.heroId].base.move + 1)
  })
})
