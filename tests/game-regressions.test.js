import { beforeEach, describe, expect, it } from 'vitest'
import { CREATURES } from '../src/data/creatures'
import { GAME } from '../src/data/constants'
import { ITEMS } from '../src/data/items'
import { selCurrentPlayer, useGame } from '../src/game/store'
import { effStats } from '../src/game/rules'
import { nextRandom } from '../src/game/rng'

const ROSTER_2 = [
  { name: 'Aldric', heroId: 'aldric' },
  { name: 'Grosh', heroId: 'grosh' },
]

const ROSTER_4 = [
  { name: 'Aldric', heroId: 'aldric' },
  { name: 'Grosh', heroId: 'grosh' },
  { name: 'Elowen', heroId: 'elowen' },
  { name: 'Zyra', heroId: 'zyra' },
]

const TEST_SEED = 0x1badb002

function seedForPattern(predicates) {
  for (let seed = 1; seed < 1_000_000; seed++) {
    let state = seed
    let valid = true
    for (const accepts of predicates) {
      const result = nextRandom(state)
      state = result.state
      const face = 1 + Math.floor(result.value * 8)
      if (!accepts(face)) {
        valid = false
        break
      }
    }
    if (valid) return seed
  }
  throw new Error('could not find a deterministic dice seed')
}

function seedForRolls(count, accepts) {
  return seedForPattern(Array.from({ length: count }, () => accepts))
}

function advanceSeed(seed, count) {
  let state = seed
  for (let index = 0; index < count; index++) state = nextRandom(state).state
  return state
}

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

function startGame(roster = ROSTER_2) {
  useGame.getState().startGame(roster, { seed: TEST_SEED, skipTutorial: true })
  clearBlockingUi()
  return useGame.getState()
}

function configureCreatureCombat({
  regionId = 'mirefen',
  defId = 'infernal_colossus',
  hp = CREATURES[defId].hp,
} = {}) {
  useGame.setState((state) => {
    const player = selCurrentPlayer(state)
    player.region = regionId
    player.energy = 10
    player.maxEnergy = 10
    state.creatures[regionId] = { defId, hp, respawnAtRound: null }
    state.actionUsed = false
    state.eventId = null
    state.eventReveal = false
    state.questDraw = null
    state.combat = null
  })
  useGame.getState().startCombat(false)
}

function configureBossCombat() {
  useGame.setState((state) => {
    const player = selCurrentPlayer(state)
    player.region = 'blackspire'
    state.actionUsed = false
    state.eventId = null
    state.eventReveal = false
    state.questDraw = null
    state.combat = null
    state.bossSpawned = true
    state.bossHp = CREATURES.vhalrax.hp
  })
  useGame.getState().startCombat(true)
}

function finishCurrentRound() {
  const round = useGame.getState().round
  let safety = 0
  while (useGame.getState().round === round) {
    if (++safety > GAME.MAX_PLAYERS + 1) throw new Error('round did not advance')
    clearBlockingUi()
    const state = useGame.getState()
    const actor = selCurrentPlayer(state)
    state.endTurn({ playerIdx: actor.idx, turnId: state.turnId })
  }
  clearBlockingUi()
}

beforeEach(() => {
  useGame.setState(useGame.getInitialState(), true)
})

describe('competitive setup and initiative', () => {
  it.each([
    ['2-player 1v1', ROSTER_2, 1],
    ['4-player 2v2', ROSTER_4, 2],
  ])('accepts a legal %s roster', (_label, roster, playersPerFaction) => {
    const state = startGame(roster)

    expect(state.screen).toBe('game')
    expect(state.players).toHaveLength(roster.length)
    expect(new Set(state.players.map((player) => player.heroId)).size).toBe(roster.length)
    expect(state.players.filter((player) => player.faction === 'accord')).toHaveLength(playersPerFaction)
    expect(state.players.filter((player) => player.faction === 'dominion')).toHaveLength(playersPerFaction)
  })

  it.each([
    ['three players', [...ROSTER_2, { name: 'Elowen', heroId: 'elowen' }]],
    [
      'an unbalanced 3v1 roster',
      [
        { name: 'Aldric', heroId: 'aldric' },
        { name: 'Elowen', heroId: 'elowen' },
        { name: 'Torvald', heroId: 'torvald' },
        { name: 'Grosh', heroId: 'grosh' },
      ],
    ],
  ])('rejects %s without leaving the menu', (_label, roster) => {
    expect(() => useGame.getState().startGame(roster)).not.toThrow()
    const state = useGame.getState()
    expect(state.screen).toBe('menu')
    expect(state.players).toHaveLength(0)
  })

  it('rotates the first player while preserving faction alternation', () => {
    startGame(ROSTER_4)
    const roundStarters = []

    for (let round = 0; round < ROSTER_4.length; round++) {
      const state = useGame.getState()
      roundStarters.push(selCurrentPlayer(state).idx)
      const factions = state.turnOrder.map((idx) => state.players[idx].faction)
      for (let idx = 1; idx < factions.length; idx++) {
        expect(factions[idx]).not.toBe(factions[idx - 1])
      }
      finishCurrentRound()
    }

    expect(new Set(roundStarters).size).toBe(ROSTER_4.length)
  })
})

describe('stale user intent and duplicate submissions', () => {
  it('does not let one double-click resolve two combat rounds or cast twice', () => {
    startGame()
    configureCreatureCombat()
    useGame.setState((state) => {
      selCurrentPlayer(state).dice = 0
    })

    const { combatRound } = useGame.getState()
    const submittedRound = useGame.getState().combat.round
    combatRound('shield_wall', submittedRound)
    combatRound('shield_wall', submittedRound)

    const state = useGame.getState()
    const player = state.players[state.combat.playerIdx]
    expect(state.combat.round).toBe(submittedRound + 1)
    expect(player.energy).toBe(8)
  })

  it("does not let a stale End Turn click skip the next player's turn", () => {
    const initial = startGame()
    const firstPlayer = selCurrentPlayer(initial)
    const secondPlayerIdx = initial.turnOrder[1]
    const submittedRound = initial.round
    const { endTurn } = initial

    const intent = { playerIdx: firstPlayer.idx, turnId: initial.turnId }
    endTurn(intent)
    endTurn(intent)

    const state = useGame.getState()
    expect(state.round).toBe(submittedRound)
    expect(selCurrentPlayer(state).idx).toBe(secondPlayerIdx)
  })

  it('does not charge twice for duplicate equipment purchases', () => {
    startGame()
    const item = ITEMS.ironfang_blade
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.gold = 20
      player.region = 'dawnhold'
      state.eventId = null
    })

    const { buyItem } = useGame.getState()
    const intent = { turnId: useGame.getState().turnId, requestId: 'double-click-equipment' }
    buyItem(item.id, intent)
    buyItem(item.id, intent)

    const player = selCurrentPlayer(useGame.getState())
    expect(player.gold).toBe(20 - item.cost)
    expect(player.items.filter((id) => id === item.id)).toHaveLength(1)
  })

  it('keeps private decisions locked until the next player confirms handoff', () => {
    startGame()
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      state.handoffPending = { fromPlayerIdx: 1, toPlayerIdx: player.idx, turnId: state.turnId }
      state.eventReveal = false
      state.eventChoice = {
        eventId: 'crossroads_ultimatum',
        playerIdx: player.idx,
        options: ['shelter', 'press_on'],
      }
    })

    const before = useGame.getState()
    const playerBefore = selCurrentPlayer(before)
    const hpBefore = playerBefore.hp
    const movesBefore = before.movesLeft
    before.chooseEventOption('press_on')
    before.openSheet(playerBefore.idx)
    before.openShop(true)

    const locked = useGame.getState()
    expect(locked.eventChoice).not.toBeNull()
    expect(selCurrentPlayer(locked).hp).toBe(hpBefore)
    expect(locked.movesLeft).toBe(movesBefore)
    expect(locked.sheetOpen).toBeNull()
    expect(locked.shopOpen).toBe(false)
  })

  it('keeps the mobile dock and character sheet mutually exclusive', () => {
    startGame()
    const player = selCurrentPlayer(useGame.getState())

    useGame.getState().openMobilePanel('hero')
    useGame.getState().openSheet(player.idx)
    expect(useGame.getState().mobilePanel).toBe('hero')
    expect(useGame.getState().sheetOpen).toBeNull()

    useGame.getState().openMobilePanel(null)
    useGame.getState().openSheet(player.idx)
    expect(useGame.getState().mobilePanel).toBeNull()
    expect(useGame.getState().sheetOpen).toBe(player.idx)
  })
})

describe('combat, quests, and inventory invariants', () => {
  it('keeps a PvP defense hidden until the next duel roll', () => {
    startGame()
    useGame.setState((state) => {
      state.players[0].region = 'mirefen'
      state.players[1].region = 'mirefen'
      state.players[0].dice = 0
      state.players[1].dice = 0
      state.actionUsed = false
    })

    useGame.getState().startPvp(1)
    useGame.getState().confirmPvpHandoff()
    useGame.getState().setPvpDefense('brace')

    expect(useGame.getState().combat.log[0].text).toMatch(/secret response/i)
    expect(useGame.getState().combat.log.map((entry) => entry.text).join(' ')).not.toMatch(/brace/i)

    useGame.getState().combatRound(null, 1)
    expect(useGame.getState().combat.round).toBe(1)
    expect(useGame.getState().combat.log.map((entry) => entry.text).join(' ')).not.toMatch(/brace/i)

    useGame.getState().confirmPvpHandoff()
    useGame.getState().combatRound(null, 1)
    expect(useGame.getState().combat.log.map((entry) => entry.text).join(' ')).toMatch(/reveals Brace/i)
  })

  it('defers a secret PvP healing consumable until the roll reveals it', () => {
    startGame()
    useGame.setState((state) => {
      state.players[0].region = 'mirefen'
      state.players[1].region = 'mirefen'
      state.players[0].dice = 0
      state.players[1].dice = 0
      state.players[1].hp -= 3
      state.players[1].consumables = ['healing_draught']
      state.actionUsed = false
    })

    useGame.getState().startPvp(1)
    useGame.getState().confirmPvpHandoff()
    const hiddenHp = useGame.getState().players[1].hp
    useGame.getState().setPvpDefense({ type: 'consumable', index: 0 })

    expect(useGame.getState().players[1].hp).toBe(hiddenHp)
    expect(useGame.getState().players[1].consumables).toEqual(['healing_draught'])
    useGame.getState().confirmPvpHandoff()
    useGame.getState().combatRound(null, 1)
    expect(useGame.getState().players[1].hp).toBeGreaterThan(hiddenHp)
    expect(useGame.getState().players[1].consumables).toEqual([])
  })

  it('rolls the PvP defender green pool once and shares it across blue and red', () => {
    startGame()
    useGame.setState((state) => {
      state.players[0].region = 'mirefen'
      state.players[1].region = 'mirefen'
      state.players[0].items = []
      state.players[1].items = []
      state.players[0].armor = 0
      state.players[1].armor = 0
      state.actionUsed = false
      state.eventId = null
    })

    useGame.getState().startPvp(1)
    useGame.getState().confirmPvpHandoff()
    useGame.getState().setPvpDefense('counter')
    useGame.getState().confirmPvpHandoff()

    const before = useGame.getState()
    const attacker = before.players[before.combat.playerIdx]
    const defender = before.players[before.combat.targetIdx]
    const attackerEff = effStats(attacker)
    const defenderEff = effStats(defender)
    const defenderCounterPool = defenderEff.rangedDice + defenderEff.meleeDice + 1
    const predicates = [
      ...Array.from({ length: defenderEff.defenseDice }, (_, index) =>
        index === 0 ? (face) => face >= 6 : (face) => face < 6),
      ...Array.from({ length: attackerEff.rangedDice }, (_, index) =>
        index === 0 ? (face) => face >= 5 && face < 8 : (face) => face < 5),
      ...Array.from({ length: attackerEff.meleeDice }, (_, index) =>
        index === 0 ? (face) => face >= 5 && face < 8 : (face) => face < 5),
      ...Array.from({ length: defenderCounterPool }, () => (face) => face < 5),
      ...Array.from({ length: attackerEff.defenseDice }, () => () => true),
    ]
    useGame.setState((state) => {
      state.rngState = seedForPattern(predicates)
    })

    const defenderHp = defender.hp
    useGame.getState().combatRound(null, 1)

    const after = useGame.getState()
    expect(after.combat.lastDefenderDefenseRolls).toHaveLength(defenderEff.defenseDice)
    expect(after.combat.lastDefenderDefenseRolls.filter((face) => face >= 6)).toHaveLength(1)
    // The single green guard stops blue; it is spent, so the red hit lands.
    expect(after.players[after.combat.targetIdx].hp).toBe(defenderHp - 1)
  })

  it('resolves fixed creature Attack without consuming a foe roll', () => {
    startGame()
    configureCreatureCombat({ defId: 'bandit_marauder' })
    const before = useGame.getState()
    const player = before.players[before.combat.playerIdx]
    const effective = effStats(player)
    const heroRollCount = effective.rangedDice + effective.meleeDice + effective.defenseDice
    const seed = seedForRolls(heroRollCount, (face) => face === 1)
    const hpBefore = player.hp
    useGame.setState((state) => {
      state.rngState = seed
    })

    useGame.getState().combatRound(null, 1)

    const after = useGame.getState()
    const attack = after.combat.lastEnemyAttack
    expect(after.rngState).toBe(advanceSeed(seed, heroRollCount))
    expect(after.combat.lastCreatureRolls).toBeNull()
    expect(attack.total).toBe(CREATURES.bandit_marauder.attack)
    expect(after.players[after.combat.playerIdx].hp).toBe(hpBefore - attack.damage)
  })

  it('lets a blue success kill before fixed Attack resolves', () => {
    startGame()
    configureCreatureCombat({ defId: 'gnarlwood_wolf', hp: 1 })
    const before = useGame.getState()
    const player = before.players[before.combat.playerIdx]
    const effective = effStats(player)
    const threat = CREATURES.gnarlwood_wolf.threat
    const predicates = [
      ...Array.from({ length: effective.rangedDice }, (_, index) =>
        index === 0 ? (face) => face >= threat : (face) => face < threat),
      ...Array.from({ length: effective.meleeDice }, () => (face) => face < threat),
      ...Array.from({ length: effective.defenseDice }, () => (face) => face < threat),
    ]
    const hpBefore = player.hp
    useGame.setState((state) => {
      state.rngState = seedForPattern(predicates)
    })

    useGame.getState().combatRound(null, 1)

    const after = useGame.getState()
    expect(after.combat.heroWon).toBe(true)
    expect(after.combat.lastEnemyAttack).toBeNull()
    expect(after.combat.lastCreatureRolls).toBeNull()
    expect(after.players[after.combat.playerIdx].hp).toBe(hpBefore)
  })

  it('uses a red success as guard before dealing its delayed damage', () => {
    startGame()
    configureCreatureCombat({ defId: 'mire_creeper' })
    const before = useGame.getState()
    const player = before.players[before.combat.playerIdx]
    const effective = effStats(player)
    const threat = CREATURES.mire_creeper.threat
    const predicates = [
      ...Array.from({ length: effective.rangedDice }, () => (face) => face < threat),
      ...Array.from({ length: effective.meleeDice }, (_, index) =>
        index === 0 ? (face) => face === 8 : (face) => face < threat),
      ...Array.from({ length: effective.defenseDice }, () => (face) => face < threat),
    ]
    useGame.setState((state) => {
      const actor = state.players[state.combat.playerIdx]
      actor.armor = 0
      actor.items = []
      state.rngState = seedForPattern(predicates)
    })
    const hpBefore = useGame.getState().players[before.combat.playerIdx].hp

    useGame.getState().combatRound(null, 1)

    const after = useGame.getState()
    expect(after.combat.lastEnemyAttack.redGuard).toBe(1)
    expect(after.combat.lastEnemyAttack.greenGuard).toBe(0)
    expect(after.combat.lastEnemyAttack.damage).toBe(1)
    expect(after.players[after.combat.playerIdx].hp).toBe(hpBefore - 1)
    // One successful red die guards once, then its critical deals two delayed
    // hits; fixed Armor absorbs one of those hits.
    expect(after.combat.hp).toBe(CREATURES.mire_creeper.hp - 1)
  })

  it('uses green successes as guard against fixed Attack', () => {
    startGame()
    configureCreatureCombat({ defId: 'bandit_marauder' })
    const before = useGame.getState()
    const player = before.players[before.combat.playerIdx]
    const effective = effStats(player)
    const threat = CREATURES.bandit_marauder.threat
    const predicates = [
      ...Array.from({ length: effective.rangedDice }, () => (face) => face < threat),
      ...Array.from({ length: effective.meleeDice }, () => (face) => face < threat),
      ...Array.from({ length: effective.defenseDice }, (_, index) =>
        index === 0 ? (face) => face >= threat : (face) => face < threat),
    ]
    useGame.setState((state) => {
      const actor = state.players[state.combat.playerIdx]
      actor.armor = 0
      actor.items = []
      state.rngState = seedForPattern(predicates)
    })
    const hpBefore = useGame.getState().players[before.combat.playerIdx].hp

    useGame.getState().combatRound(null, 1)

    const after = useGame.getState()
    expect(after.combat.lastEnemyAttack.redGuard).toBe(0)
    expect(after.combat.lastEnemyAttack.greenGuard).toBe(1)
    expect(after.combat.lastEnemyAttack.damage).toBe(CREATURES.bandit_marauder.attack - 1)
    expect(after.players[after.combat.playerIdx].hp).toBe(
      hpBefore - after.combat.lastEnemyAttack.damage,
    )
  })

  it('spends fixed enemy Armor once across the blue and red pools', () => {
    startGame()
    configureCreatureCombat({ defId: 'mire_creeper' })
    const before = useGame.getState()
    const player = before.players[before.combat.playerIdx]
    const effective = effStats(player)
    const threat = CREATURES.mire_creeper.threat
    const predicates = [
      ...Array.from({ length: effective.rangedDice }, (_, index) =>
        index === 0 ? (face) => face === 8 : (face) => face < threat),
      ...Array.from({ length: effective.meleeDice }, (_, index) =>
        index === 0 ? (face) => face === 8 : (face) => face < threat),
      ...Array.from({ length: effective.defenseDice }, () => (face) => face < threat),
    ]
    useGame.setState((state) => {
      state.rngState = seedForPattern(predicates)
    })

    useGame.getState().combatRound(null, 1)

    // Blue critical: 2 - Armor 1 = 1. Red critical then deals its full 2.
    expect(useGame.getState().combat.hp).toBe(CREATURES.mire_creeper.hp - 3)
  })

  it('only claims a round travel objective after movement, not quest acceptance', () => {
    startGame()
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.region = 'ruins_eldara'
      state.eventId = 'heroic_inspiration'
      state.eventObjective = {
        region: 'ruins_eldara',
        text: 'Reach the ruins.',
        reward: { vp: 2 },
        claimedBy: null,
      }
      state.questDraw = { playerIdx: player.idx, options: ['scout_the_ruins'] }
      state.questDeck = []
    })

    useGame.getState().pickQuest('scout_the_ruins')
    expect(useGame.getState().eventObjective.claimedBy).toBeNull()

    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.region = 'frostpeak'
      state.movesLeft = 1
      state.celebrations = []
      state.questDraw = null
    })
    useGame.getState().moveTo('ruins_eldara')
    expect(useGame.getState().eventObjective.claimedBy).toBe(selCurrentPlayer(useGame.getState()).idx)
  })

  it('caps the satchel and does not charge for a rejected fourth consumable', () => {
    startGame()
    const itemIds = ['healing_draught', 'elixir_of_fury', 'firebomb', 'stoneskin_draught']
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.gold = 100
      player.region = 'dawnhold'
      state.eventId = null
    })

    for (const [index, itemId] of itemIds.entries()) {
      const state = useGame.getState()
      state.buyItem(itemId, { turnId: state.turnId, requestId: `satchel-${index}` })
    }

    const player = selCurrentPlayer(useGame.getState())
    expect(player.consumables).toHaveLength(GAME.MAX_CONSUMABLES)
    const acceptedCost = itemIds
      .slice(0, GAME.MAX_CONSUMABLES)
      .reduce((total, itemId) => total + ITEMS[itemId].cost, 0)
    expect(player.gold).toBe(100 - acceptedCost)
  })

  it('keeps Vhalrax minimum damage dangerous against fixed hero armor', () => {
    startGame()
    configureBossCombat()
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      const effective = effStats(player)
      const heroRollCount = effective.rangedDice + effective.meleeDice + effective.defenseDice
      player.armor = CREATURES.vhalrax.attack + CREATURES.vhalrax.trait.armorPierce
      state.combat.minions = []
      state.rngState = seedForRolls(heroRollCount, (face) => face < CREATURES.vhalrax.threat)
    })

    const before = selCurrentPlayer(useGame.getState()).hp
    useGame.getState().combatRound(null, 1)

    expect(selCurrentPlayer(useGame.getState()).hp).toBeLessThan(before)
    expect(useGame.getState().combat.lastCreatureRolls).toBeNull()
  })

  it('restores Vhalrax after a hero retreats instead of allowing safe chip damage', () => {
    startGame()
    configureBossCombat()
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.armor = 99
      // this test exercises retreat regeneration, not the minion screen —
      // clear the Bone Thralls so the seeded hits land on Vhalrax himself
      state.combat.minions = []
      state.rngState = seedForRolls(player.dice, (face) => face === 8)
    })

    useGame.getState().combatRound(null, 1)
    expect(useGame.getState().combat.hp).toBeLessThan(CREATURES.vhalrax.hp)
    useGame.setState((state) => {
      state.combat.rolling = false
    })
    useGame.getState().combatFlee()

    expect(useGame.getState().bossHp).toBe(CREATURES.vhalrax.hp)
    expect(Object.values(useGame.getState().bossDamageByFaction).reduce((sum, value) => sum + value, 0)).toBe(0)
  })

  it('removes regenerated Vhalrax damage from faction contribution credit', () => {
    startGame()
    configureBossCombat()
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      const otherFaction = player.faction === 'accord' ? 'dominion' : 'accord'
      state.combat.hp = 10
      state.bossHp = 10
      state.bossDamageByFaction[player.faction] = 10
      state.bossDamageByFaction[otherFaction] = 5
      state.combat.rolling = false
    })

    useGame.getState().combatFlee()

    const state = useGame.getState()
    const credited = state.bossDamageByFaction.accord + state.bossDamageByFaction.dominion
    expect(state.bossHp).toBe(15)
    expect(credited).toBe(CREATURES.vhalrax.hp - state.bossHp)
  })

  it('does not complete a tier-II quest for a tier-I kill in the named region', () => {
    startGame()
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.quests = ['drain_the_mire']
    })
    configureCreatureCombat({ regionId: 'mirefen', defId: 'gnarlwood_wolf', hp: 1 })
    useGame.setState((state) => {
      state.rngState = seedForRolls(1, (face) => face === 8)
    })

    useGame.getState().combatRound(null, 1)

    const player = selCurrentPlayer(useGame.getState())
    expect(player.quests).toContain('drain_the_mire')
    expect(player.completed).not.toContain('drain_the_mire')
  })

  it('does complete the same quest for a tier-II kill in the named region', () => {
    startGame()
    useGame.setState((state) => {
      const player = selCurrentPlayer(state)
      player.quests = ['drain_the_mire']
    })
    configureCreatureCombat({ regionId: 'mirefen', defId: 'stone_golem', hp: 1 })
    useGame.setState((state) => {
      state.rngState = seedForRolls(selCurrentPlayer(state).dice, (face) => face === 8)
    })

    useGame.getState().combatRound(null, 1)

    const player = selCurrentPlayer(useGame.getState())
    expect(player.quests).not.toContain('drain_the_mire')
    expect(player.completed).toContain('drain_the_mire')
  })
})

describe('persisted save compatibility', () => {
  it('publishes a versioned migration and restores safe defaults', async () => {
    const options = useGame.persist.getOptions()
    expect(options.version).toBe(8)
    expect(options.migrate).toEqual(expect.any(Function))
    expect(options.merge).toEqual(expect.any(Function))

    const migrated = await options.migrate(null, 3)
    const recovered = options.merge(migrated, useGame.getInitialState())

    expect(recovered.screen).toBe('menu')
    expect(recovered.players).toEqual([])
    expect(recovered.saveVersion).toBe(8)
    expect(recovered.rngState).toEqual(expect.any(Number))
    expect(recovered.handoffPending).toBe(false)
    expect(recovered.tutorialCompleted).toBe(true)
  })

  it('migrates an active legacy match without replaying transient locks', async () => {
    const { migrate } = useGame.persist.getOptions()
    const legacy = {
      screen: 'game',
      players: [
        { idx: 0, heroId: 'aldric', faction: 'accord' },
        { idx: 1, heroId: 'grosh', faction: 'dominion' },
      ],
      turnOrder: [0, 1],
      turnPos: 0,
      round: 4,
      creatures: {
        mirefen: {
          defId: 'stone_golem',
          hp: CREATURES.stone_golem.hp,
          threat: 2,
          respawnAtRound: null,
        },
      },
      bossThreat: 1,
      handoffPending: { fromPlayerIdx: 1, toPlayerIdx: 0 },
      combat: {
        playerIdx: 0,
        defId: 'stone_golem',
        regionId: 'mirefen',
        round: 2,
        threat: 2,
        minionDice: 1,
        rolling: true,
      },
    }

    const migrated = await migrate(legacy, 3)

    expect(migrated.screen).toBe('game')
    expect(migrated.players).toHaveLength(2)
    expect(migrated.round).toBe(4)
    expect(migrated.combat.id).toEqual(expect.any(Number))
    expect(migrated.combat.rolling).toBe(false)
    // A legacy mid-creature-fight save must never rehydrate into PvP handoff,
    // and its old escalation counters must not collide with fixed Threat.
    expect(migrated.combat.pvp).toBe(false)
    expect(migrated.combat.pvpDefensePending).toBe(false)
    expect(migrated.combat.pvpHandoff).toBeNull()
    expect(migrated.combat.provoked).toBe(2)
    expect(migrated.combat.threat).toBeUndefined()
    expect(migrated.combat.minionAttack).toBe(1)
    expect(migrated.combat.minionDice).toBeUndefined()
    expect(migrated.creatures.mirefen.provoked).toBe(2)
    expect(migrated.creatures.mirefen.threat).toBeUndefined()
    expect(migrated.bossProvoked).toBe(1)
    expect(migrated.bossThreat).toBeUndefined()
    expect(migrated.handoffPending).toBe(false)
    expect(migrated.tutorialCompleted).toBe(true)
  })

  it('repairs a valid legacy roster with missing player fields and a broken turn order', async () => {
    const { migrate, merge } = useGame.persist.getOptions()
    const migrated = await migrate(
      {
        screen: 'game',
        players: [
          { heroId: 'aldric', name: 'Old Aldric' },
          { heroId: 'grosh' },
        ],
        turnOrder: [99],
        turnPos: 8,
        round: 4,
        combat: { playerIdx: 9, defId: 'stone_golem', round: 1 },
      },
      3,
    )

    expect(migrated.players.map((player) => player.idx)).toEqual([0, 1])
    expect(migrated.players[0].region).toBeTruthy()
    expect(migrated.players[0].abilities.length).toBeGreaterThan(0)
    expect(migrated.turnOrder).toHaveLength(2)
    expect(new Set(migrated.turnOrder)).toEqual(new Set([0, 1]))
    expect(migrated.turnPos).toBe(0)
    expect(migrated.combat).toBeNull()

    const recovered = merge(migrated, useGame.getInitialState())
    useGame.setState(recovered, true)
    expect(selCurrentPlayer(useGame.getState())).toBeTruthy()
    expect(() => useGame.getState().endTurn()).not.toThrow()
  })

  it('retires an invalid legacy three-player match instead of hydrating it', async () => {
    const { migrate } = useGame.persist.getOptions()
    const migrated = await migrate(
      {
        screen: 'game',
        players: [
          { idx: 0, heroId: 'aldric', faction: 'accord' },
          { idx: 1, heroId: 'grosh', faction: 'dominion' },
          { idx: 2, heroId: 'elowen', faction: 'accord' },
        ],
        turnOrder: [0, 1, 2],
        turnPos: 2,
        round: 7,
        combat: { playerIdx: 2, round: 1, rolling: true },
      },
      3
    )

    expect(migrated.screen).toBe('menu')
    expect(migrated.players).toEqual([])
    expect(migrated.turnOrder).toEqual([])
    expect(migrated.round).toBe(0)
    expect(migrated.combat).toBeNull()
    expect(migrated.setupError).toMatch(/retired safely/i)
  })
})
