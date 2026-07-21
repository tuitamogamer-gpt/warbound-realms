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
