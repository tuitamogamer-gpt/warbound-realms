import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import { TALENTS } from '../data/talents'
import { ABILITIES, maxAbilitySlots } from '../data/abilities'
import { GAME, FACTIONS } from '../data/constants'
import { REGIONS } from '../data/regions'
import { CREATURES, creaturesOfTier } from '../data/creatures'
import { ITEMS } from '../data/items'
import { EVENTS, EVENT_LIST } from '../data/events'
import { QUESTS } from '../data/quests'
import { rollDice, heroHits, creatureHits, shuffle, pick } from './dice'
import { effStats, makePlayer, applyXp } from './rules'

const CREATURE_REGIONS = Object.values(REGIONS)
  .filter((r) => r.tier >= 1 && r.tier <= 3)
  .map((r) => r.id)

const questById = (id) => QUESTS.find((q) => q.id === id)

let toastSeq = 1

// ---- internal helpers that mutate the immer draft ----

const addLog = (s, text, cls = '') => {
  s.log.unshift({ text, cls, id: s.logSeq++ })
  if (s.log.length > 80) s.log.pop()
}

const addToast = (s, text, cls = '') => {
  s.toasts.push({ id: toastSeq++, text, cls })
  if (s.toasts.length > 8) s.toasts.shift()
}

const currentPlayer = (s) => s.players[s.turnOrder[s.turnPos]]

const eventMod = (s) => EVENTS[s.eventId]?.mod || {}

const spawnCreature = (s, regionId) => {
  const tier = REGIONS[regionId].tier
  const def = pick(creaturesOfTier(tier))
  s.creatures[regionId] = { defId: def.id, hp: def.hp, respawnAtRound: null }
}

const grantXp = (s, player, amount) => {
  if (amount <= 0) return
  const gained = applyXp(player, amount)
  for (const lvl of gained) {
    addLog(s, `${player.name} reaches level ${lvl}!`, 'good')
    addToast(s, `⬆ ${player.name} is now level ${lvl}!`, 'level')
    if (lvl === 2 || lvl === 4) {
      if (!player.pendingTalents) player.pendingTalents = []
      player.pendingTalents.push(lvl)
      addLog(s, `${player.name} may choose a new talent.`, 'good')
    }
  }
}

// Offer the active player a choice of two quests whenever they are below the
// active-quest limit (and no other resolution is in progress).
const openQuestDraw = (s) => {
  const p = currentPlayer(s)
  if (s.combat || s.winner || s.questDraw || s.celebrations.length) return
  if (p.dead || p.quests.length >= GAME.MAX_ACTIVE_QUESTS) return
  if (s.questDeck.length < 2) {
    // exclude every player's active AND completed quests so nobody can
    // re-complete a quest for a second reward
    const used = new Set([
      ...s.players.flatMap((pl) => [...pl.quests, ...pl.completed]),
      ...s.questDeck,
    ])
    const refill = shuffle(QUESTS.map((q) => q.id).filter((id) => !used.has(id)))
    s.questDeck = [...refill, ...s.questDeck]
  }
  const options = [s.questDeck.pop(), s.questDeck.pop()].filter(Boolean)
  if (!options.length) return
  s.questDraw = { playerIdx: p.idx, options }
}

const completeQuest = (s, player, quest) => {
  player.quests = player.quests.filter((id) => id !== quest.id)
  player.completed.push(quest.id)
  player.gold += quest.reward.gold
  player.vp += quest.reward.vp
  addLog(s, `${player.name} completed "${quest.name}" (+${quest.reward.xp} XP, +${quest.reward.gold} gold, +${quest.reward.vp} VP)`, 'good')
  grantXp(s, player, quest.reward.xp)
  s.celebrations.push({ questId: quest.id, playerName: player.name })
}

const checkVisitQuests = (s, player) => {
  for (const qid of [...player.quests]) {
    const q = questById(qid)
    if (q.type === 'visit' && q.region === player.region) completeQuest(s, player, q)
  }
}

const checkKillQuests = (s, player, creatureDef, regionId) => {
  for (const qid of [...player.quests]) {
    const q = questById(qid)
    if (q.type === 'killCreature' && q.creature === creatureDef.id) {
      completeQuest(s, player, q)
    } else if (
      q.type === 'killTier' &&
      creatureDef.tier >= 1 &&
      (!q.region || q.region === regionId)
    ) {
      completeQuest(s, player, q)
    }
  }
}

// Returns the gold the fallen hero dropped (a duel winner may loot it).
const heroDeath = (s, player) => {
  player.dead = true
  // only end the turn if the fallen hero is the one currently playing
  if (player.idx === s.turnOrder[s.turnPos]) {
    s.movesLeft = 0
    s.actionUsed = true
  }
  const lost = Math.floor(player.gold * GAME.DEATH_GOLD_LOSS)
  player.gold -= lost
  addLog(s, `${player.name} has fallen! Loses ${lost} gold and retreats to the capital.`, 'bad')
  addToast(s, `☠ ${player.name} has fallen!`, 'death')
  return lost
}

const advanceTurn = (s) => {
  if (s.turnPos + 1 < s.turnOrder.length) {
    s.turnPos += 1
    beginTurn(s)
  } else {
    beginRound(s)
  }
}

const beginTurn = (s) => {
  const p = currentPlayer(s)
  if (p.dead) {
    p.dead = false
    p.region = FACTIONS[p.faction].capital
    p.hp = effStats(p).maxHp
    addLog(s, `${p.name} returns to ${REGIONS[p.region].name}, restored.`, '')
  }
  const penalty = eventMod(s).movePenalty || 0
  s.movesLeft = Math.max(1, effStats(p).move - penalty)
  s.actionUsed = false
  openQuestDraw(s)
}

const finishRoundCheck = (s) => {
  // VP victory after the last round
  const score = (f) =>
    s.players.filter((p) => p.faction === f).reduce((n, p) => n + p.vp, 0)
  const gold = (f) =>
    s.players.filter((p) => p.faction === f).reduce((n, p) => n + p.gold, 0)
  const a = score('accord')
  const d = score('dominion')
  let faction = null
  if (a !== d) faction = a > d ? 'accord' : 'dominion'
  else if (gold('accord') !== gold('dominion'))
    faction = gold('accord') > gold('dominion') ? 'accord' : 'dominion'
  s.winner = {
    faction,
    reason: faction
      ? `The ${FACTIONS[faction].name} claims Aetheria with ${Math.max(a, d)} victory points!`
      : 'The war ends in a stalemate — Aetheria bleeds on.',
    vp: { accord: a, dominion: d },
  }
  s.screen = 'victory'
}

const beginRound = (s) => {
  s.round += 1
  if (s.round > GAME.MAX_ROUNDS) {
    finishRoundCheck(s)
    return
  }
  // respawn due creatures
  for (const rid of CREATURE_REGIONS) {
    const slot = s.creatures[rid]
    if (!slot && s.respawnQueue[rid] && s.respawnQueue[rid] <= s.round) {
      spawnCreature(s, rid)
      delete s.respawnQueue[rid]
    }
  }
  // boss awakens
  if (!s.bossSpawned && s.round >= GAME.BOSS_ROUND) {
    s.bossSpawned = true
    s.bossHp = CREATURES.vhalrax.hp
    addLog(s, '⚡ Vhalrax the Undying awakens! Blackspire Citadel is open.', 'boss')
    addToast(s, '🐉 Vhalrax the Undying awakens at Blackspire!', 'boss')
  }
  // flip event
  if (!s.eventDeck.length) s.eventDeck = shuffle(EVENT_LIST.map((e) => e.id))
  s.eventId = s.eventDeck.pop()
  const ev = EVENTS[s.eventId]
  addLog(s, `Round ${s.round} — Event: ${ev.name}. ${ev.desc}`, 'event')
  s.eventReveal = true
  // instant effects
  const inst = ev.instant || {}
  for (const p of s.players) {
    if (inst.xpAll) grantXp(s, p, inst.xpAll)
    if (inst.goldAll) p.gold += inst.goldAll
    if (inst.damageAll) p.hp = Math.max(1, p.hp - inst.damageAll)
  }
  if (inst.respawnAll) {
    for (const rid of CREATURE_REGIONS) {
      if (!s.creatures[rid]) {
        spawnCreature(s, rid)
        delete s.respawnQueue[rid]
      }
    }
  }
  s.turnPos = 0
  beginTurn(s)
}

// One round of a hero-versus-hero duel. The attacker may use an ability;
// the defender fights back with their full dice and passive bonuses.
const pvpRound = (s, c, abilityId) => {
  const p = s.players[c.playerIdx]
  const t = s.players[c.targetIdx]
  const eff = effStats(p)
  const defEff = effStats(t)
  const ev = eventMod(s)

  let bonusDice = c.elixirDice
  c.elixirDice = 0
  let autoHits = 0
  let noRetaliation = false
  let noDamage = false
  let critOn5 = false
  if (c.round === 1) bonusDice += eff.firstRoundDice

  const ab = abilityId ? ABILITIES[abilityId] : null
  if (
    ab &&
    ab.type === 'active' &&
    p.abilities.includes(ab.id) &&
    p.energy >= ab.energy &&
    !(ab.effect.heal && p.hp >= eff.maxHp)
  ) {
    p.energy -= ab.energy
    const fx = ab.effect
    if (fx.bonusDice) bonusDice += fx.bonusDice
    if (fx.autoHits) autoHits += fx.autoHits
    if (fx.noRetaliation) noRetaliation = true
    if (fx.noDamage) noDamage = true
    if (fx.critOn5) critOn5 = true
    if (fx.heal) {
      p.hp = Math.min(eff.maxHp, p.hp + fx.heal)
      c.log.unshift({ text: `${ab.name}: +${fx.heal} HP`, cls: 'good' })
    } else {
      c.log.unshift({ text: `${ab.name}!`, cls: 'good' })
    }
  }
  if (eff.firstStrike && c.round === 1) noRetaliation = true

  // attacker strikes
  const atkDice = eff.dice + (ev.heroDice || 0) + bonusDice
  const rolls = rollDice(atkDice)
  const hits = heroHits(rolls, critOn5) + autoHits
  c.rollId = (c.rollId || 0) + 1
  c.lastCritOn5 = critOn5
  c.lastHeroRolls = rolls
  c.lastAutoHits = autoHits
  const dmgOut = Math.max(0, hits - defEff.armor)
  t.hp = Math.max(0, t.hp - dmgOut)
  c.log.unshift({
    text: `${p.name} rolls ${atkDice} dice → ${dmgOut} damage${defEff.armor && hits ? ` (${hits} hits − ${defEff.armor} armor)` : ''}`,
    cls: '',
  })

  if (t.hp <= 0) {
    c.over = true
    c.heroWon = true
    c.lastCreatureRolls = null
    const loot = heroDeath(s, t)
    p.gold += loot
    p.vp += GAME.PVP_VP
    p.pvpWins = (p.pvpWins || 0) + 1
    c.log.unshift({ text: `${t.name} is defeated! +${GAME.PVP_XP} XP, +${loot} gold, +${GAME.PVP_VP} VP`, cls: 'good' })
    addLog(s, `🏆 ${p.name} wins the duel against ${t.name} (+${GAME.PVP_XP} XP, +${loot} gold, +${GAME.PVP_VP} VP)!`, 'good')
    grantXp(s, p, GAME.PVP_XP)
    return
  }

  // defender strikes back
  if (!noRetaliation) {
    const defDice = defEff.dice + (ev.heroDice || 0) + (c.round === 1 ? defEff.firstRoundDice : 0)
    const dRolls = rollDice(defDice)
    const dHits = heroHits(dRolls)
    const dmgIn = noDamage ? 0 : Math.max(0, dHits - eff.armor)
    c.lastCreatureRolls = dRolls
    p.hp = Math.max(0, p.hp - dmgIn)
    c.log.unshift({
      text: noDamage
        ? `${t.name} strikes — ${ab.name} absorbs everything!`
        : `${t.name} rolls ${defDice} dice → ${dmgIn} damage${eff.armor && dHits ? ` (${dHits} hits − ${eff.armor} armor)` : ''}`,
      cls: dmgIn > 0 ? 'bad' : '',
    })
    if (p.hp <= 0) {
      c.over = true
      c.heroDied = true
      const loot = heroDeath(s, p)
      t.gold += loot
      t.vp += GAME.PVP_VP
      t.pvpWins = (t.pvpWins || 0) + 1
      c.log.unshift({ text: `${p.name} falls! ${t.name} claims +${GAME.PVP_XP} XP, +${loot} gold, +${GAME.PVP_VP} VP`, cls: 'bad' })
      addLog(s, `🏆 ${t.name} wins the duel against ${p.name} (+${GAME.PVP_XP} XP, +${loot} gold, +${GAME.PVP_VP} VP)!`, 'good')
      grantXp(s, t, GAME.PVP_XP)
      return
    }
  } else {
    c.lastCreatureRolls = null
    c.log.unshift({ text: `${t.name} cannot strike back!`, cls: 'good' })
  }
  c.round += 1
}

// Interleave factions so turns alternate: A, D, A, D...
const buildTurnOrder = (players) => {
  const accord = players.filter((p) => p.faction === 'accord').map((p) => p.idx)
  const dominion = players.filter((p) => p.faction === 'dominion').map((p) => p.idx)
  const order = []
  const longer = Math.max(accord.length, dominion.length)
  for (let i = 0; i < longer; i++) {
    if (accord[i] != null) order.push(accord[i])
    if (dominion[i] != null) order.push(dominion[i])
  }
  return order
}

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

export const useGame = create(
  persist(
    immer((set, get) => ({
    screen: 'menu',
    players: [],
    turnOrder: [],
    turnPos: 0,
    round: 0,
    eventId: null,
    eventDeck: [],
    eventReveal: false,
    questDeck: [],
    creatures: {},
    respawnQueue: {},
    bossSpawned: false,
    bossHp: 0,
    movesLeft: 0,
    actionUsed: false,
    combat: null,
    questDraw: null,
    celebrations: [],
    shopOpen: false,
    rulesOpen: false,
    sheetOpen: null,
    log: [],
    logSeq: 1,
    toasts: [],
    winner: null,

    // ---------- setup ----------
    startGame: (roster) =>
      set((s) => {
        s.players = roster.map((r, i) => {
          const p = makePlayer(i, r.name, r.heroId)
          p.region = FACTIONS[p.faction].capital
          return p
        })
        s.turnOrder = buildTurnOrder(s.players)
        s.turnPos = 0
        s.round = 0
        s.creatures = {}
        s.respawnQueue = {}
        for (const rid of CREATURE_REGIONS) spawnCreature(s, rid)
        s.bossSpawned = false
        s.bossHp = 0
        s.eventDeck = shuffle(EVENT_LIST.map((e) => e.id))
        s.questDeck = shuffle(QUESTS.map((q) => q.id))
        s.log = []
        s.logSeq = 1
        s.toasts = []
        s.combat = null
        s.questDraw = null
        s.celebrations = []
        s.winner = null
        s.screen = 'game'
        addLog(s, 'The war for Aetheria begins!', 'event')
        beginRound(s)
      }),

    backToMenu: () => set((s) => void (s.screen = 'menu')),
    dismissEventReveal: () => set((s) => void (s.eventReveal = false)),
    dismissToast: (id) =>
      set((s) => void (s.toasts = s.toasts.filter((t) => t.id !== id))),
    openShop: (open) => set((s) => void (s.shopOpen = open)),
    openRules: (open) => set((s) => void (s.rulesOpen = open)),
    openSheet: (playerIdx) => set((s) => void (s.sheetOpen = playerIdx)),

    // ---------- quests ----------
    pickQuest: (questId) =>
      set((s) => {
        const qd = s.questDraw
        if (!qd || !qd.options.includes(questId)) return
        const p = s.players[qd.playerIdx]
        p.quests.push(questId)
        // the declined offer goes to the bottom of the deck
        for (const other of qd.options) {
          if (other !== questId) s.questDeck.unshift(other)
        }
        s.questDraw = null
        const q = QUESTS.find((x) => x.id === questId)
        addLog(s, `${p.name} accepts the quest "${q.name}".`)
        checkVisitQuests(s, p) // the new quest may already be satisfied
        openQuestDraw(s) // first turn draws twice
      }),

    dismissCelebration: () =>
      set((s) => {
        s.celebrations.shift()
        if (!s.celebrations.length) openQuestDraw(s)
      }),

    // ---------- abilities ----------
    buyAbility: (abilityId) =>
      set((s) => {
        const p = currentPlayer(s)
        if (s.winner || p.dead) return
        if (!REGIONS[p.region].town) return
        const ab = ABILITIES[abilityId]
        if (!ab || ab.signature || ab.heroId !== p.heroId) return
        if (p.abilities.includes(abilityId)) return
        if (p.abilities.length >= maxAbilitySlots(p.level)) return
        if (p.gold < ab.cost) return
        p.gold -= ab.cost
        p.abilities.push(abilityId)
        const eff = effStats(p)
        p.hp = Math.min(Math.max(p.hp, 0), eff.maxHp)
        p.energy = Math.min(p.energy, eff.maxEnergy)
        addLog(s, `${p.name} trains ${ab.name} for ${ab.cost} gold.`, 'good')
        addToast(s, `✨ ${p.name} learns ${ab.name}!`, 'level')
      }),

    castAnytime: (abilityId) =>
      set((s) => {
        const p = currentPlayer(s)
        const ab = ABILITIES[abilityId]
        if (s.winner || s.combat || !ab || !ab.anytime) return
        if (!p.abilities.includes(abilityId) || p.energy < ab.energy) return
        const eff = effStats(p)
        if (ab.effect.heal && p.hp >= eff.maxHp) return
        p.energy -= ab.energy
        if (ab.effect.heal) {
          p.hp = Math.min(eff.maxHp, p.hp + ab.effect.heal)
          addLog(s, `${p.name} casts ${ab.name} (+${ab.effect.heal} HP).`)
        }
      }),

    chooseTalent: (talentId) =>
      set((s) => {
        const p = currentPlayer(s)
        const t = TALENTS[talentId]
        if (!t || !p.pendingTalents?.includes(t.level) || p.talents?.includes(talentId)) return
        p.pendingTalents.splice(p.pendingTalents.indexOf(t.level), 1)
        if (!p.talents) p.talents = []
        p.talents.push(talentId)
        const fx = t.effects
        if (fx.maxHp) {
          p.maxHp += fx.maxHp
          p.hp += fx.maxHp
        }
        if (fx.maxEnergy) {
          p.maxEnergy += fx.maxEnergy
          p.energy += fx.maxEnergy
        }
        if (fx.armor) p.armor += fx.armor
        if (fx.dice) p.dice += fx.dice
        addLog(s, `${p.name} learns ${t.name} (${t.desc})`, 'good')
        addToast(s, `✦ ${p.name} learns ${t.name}!`, 'level')
      }),

    // ---------- movement ----------
    moveTo: (regionId) =>
      set((s) => {
        if (s.combat || s.winner) return
        const p = currentPlayer(s)
        if (p.dead) return
        const from = REGIONS[p.region]
        if (s.movesLeft <= 0) return
        if (!from.adjacent.includes(regionId)) return
        const dest = REGIONS[regionId]
        if (dest.capital && dest.capital !== p.faction) return // enemy capital sealed
        if (regionId === 'blackspire' && !s.bossSpawned) return // sealed until the boss wakes
        p.region = regionId
        s.movesLeft -= 1
        addLog(s, `${p.name} travels to ${dest.name}.`)
        checkVisitQuests(s, p)
      }),

    // ---------- actions ----------
    rest: () =>
      set((s) => {
        if (s.combat || s.actionUsed || s.winner) return
        const p = currentPlayer(s)
        const eff = effStats(p)
        p.hp = Math.min(eff.maxHp, p.hp + GAME.REST_HP)
        p.energy = Math.min(eff.maxEnergy, p.energy + GAME.REST_ENERGY)
        s.actionUsed = true
        addLog(s, `${p.name} rests (+${GAME.REST_HP} HP, +${GAME.REST_ENERGY} energy).`)
      }),

    buyItem: (itemId) =>
      set((s) => {
        const p = currentPlayer(s)
        if (!REGIONS[p.region].town || s.winner) return
        const item = ITEMS[itemId]
        const discount = eventMod(s).shopDiscount || 0
        const cost = Math.max(1, item.cost - discount)
        if (p.gold < cost) return
        if (item.slot === 'consumable') {
          if (p.consumables.length >= GAME.MAX_CONSUMABLES) return
          p.consumables.push(itemId)
        } else {
          // replace anything already in that slot (no refund — the merchant keeps it)
          p.items = p.items.filter((id) => ITEMS[id].slot !== item.slot)
          p.items.push(itemId)
          const eff = effStats(p)
          p.hp = Math.min(p.hp, eff.maxHp)
          p.energy = Math.min(p.energy, eff.maxEnergy)
        }
        p.gold -= cost
        addLog(s, `${p.name} buys ${item.name} for ${cost} gold.`)
      }),

    useConsumable: (index) =>
      set((s) => {
        const p = currentPlayer(s)
        if (s.winner) return
        const itemId = p.consumables[index]
        if (!itemId) return
        const item = ITEMS[itemId]
        if (item.effects.heal) {
          if (p.hp >= effStats(p).maxHp) return // don't waste a potion at full health
          p.consumables.splice(index, 1)
          p.hp = Math.min(effStats(p).maxHp, p.hp + item.effects.heal)
          addLog(s, `${p.name} drinks a ${item.name} (+${item.effects.heal} HP).`)
          if (s.combat) s.combat.log.unshift({ text: `${item.name}: +${item.effects.heal} HP`, cls: 'good' })
        } else if (item.effects.combatDice && s.combat && !s.combat.over) {
          p.consumables.splice(index, 1)
          s.combat.elixirDice += item.effects.combatDice
          s.combat.log.unshift({ text: `${item.name}: +${item.effects.combatDice} dice this round`, cls: 'good' })
        }
      }),


    // ---------- combat ----------
    startPvp: (targetIdx) =>
      set((s) => {
        if (s.combat || s.actionUsed || s.winner) return
        const p = currentPlayer(s)
        const t = s.players[targetIdx]
        if (!t || t.dead || p.dead || t.idx === p.idx) return
        if (t.faction === p.faction) return
        if (t.region !== p.region) return
        if (REGIONS[p.region].town) return // towns are sanctuaries
        s.actionUsed = true
        s.combat = {
          pvp: true,
          playerIdx: p.idx,
          targetIdx,
          regionId: p.region,
          round: 1,
          over: false,
          heroWon: false,
          heroDied: false,
          fled: false,
          elixirDice: 0,
          lastHeroRolls: null,
          lastCreatureRolls: null,
          lastAutoHits: 0,
          lastCritOn5: false,
          rollId: 0,
          log: [{ text: `${p.name} challenges ${t.name} to a duel!`, cls: 'event' }],
        }
        addLog(s, `⚔ ${p.name} challenges ${t.name} to a duel!`, 'bad')
      }),

    startCombat: (boss = false) =>
      set((s) => {
        if (s.combat || s.actionUsed || s.winner) return
        const p = currentPlayer(s)
        let creatureDef, hp
        if (boss) {
          if (p.region !== 'blackspire' || !s.bossSpawned || s.bossHp <= 0) return
          creatureDef = CREATURES.vhalrax
          hp = s.bossHp
        } else {
          const slot = s.creatures[p.region]
          if (!slot) return
          creatureDef = CREATURES[slot.defId]
          hp = slot.hp
        }
        s.actionUsed = true
        s.combat = {
          playerIdx: p.idx,
          regionId: p.region,
          defId: creatureDef.id,
          boss,
          hp,
          maxHp: creatureDef.hp,
          round: 1,
          over: false,
          heroWon: false,
          heroDied: false,
          fled: false,
          elixirDice: 0,
          lastHeroRolls: null,
          lastCreatureRolls: null,
          lastAutoHits: 0,
          rolling: false,
          log: [{ text: `${p.name} challenges ${creatureDef.name}!`, cls: 'event' }],
        }
        addLog(s, `${p.name} challenges ${creatureDef.name}!`, 'bad')
      }),

    combatRound: (abilityId) =>
      set((s) => {
        const c = s.combat
        if (!c || c.over) return
        if (c.pvp) {
          pvpRound(s, c, abilityId)
          return
        }
        const p = s.players[c.playerIdx]
        const eff = effStats(p)
        const ev = eventMod(s)
        const creatureDef = CREATURES[c.defId]

        let bonusDice = c.elixirDice
        c.elixirDice = 0 // the elixir empowers exactly one roll
        let autoHits = 0
        let noRetaliation = false
        let noDamage = false
        let critOn5 = false

        if (c.round === 1) bonusDice += eff.firstRoundDice

        const ab = abilityId ? ABILITIES[abilityId] : null
        if (
          ab &&
          ab.type === 'active' &&
          p.abilities.includes(ab.id) &&
          p.energy >= ab.energy &&
          !(ab.effect.heal && p.hp >= eff.maxHp) // don't waste a heal at full health
        ) {
          p.energy -= ab.energy
          const fx = ab.effect
          if (fx.bonusDice) bonusDice += fx.bonusDice
          if (fx.autoHits) autoHits += fx.autoHits
          if (fx.noRetaliation) noRetaliation = true
          if (fx.noDamage) noDamage = true
          if (fx.critOn5) critOn5 = true
          if (fx.heal) {
            p.hp = Math.min(eff.maxHp, p.hp + fx.heal)
            c.log.unshift({ text: `${ab.name}: +${fx.heal} HP`, cls: 'good' })
          } else {
            c.log.unshift({ text: `${ab.name}!`, cls: 'good' })
          }
        }
        if (eff.firstStrike && c.round === 1) noRetaliation = true

        // hero attack
        const heroDiceCount = eff.dice + (ev.heroDice || 0) + bonusDice
        const rolls = rollDice(heroDiceCount)
        const hits = heroHits(rolls, critOn5) + autoHits
        c.rollId = (c.rollId || 0) + 1
        c.lastCritOn5 = critOn5
        c.lastHeroRolls = rolls
        c.lastAutoHits = autoHits
        c.hp = Math.max(0, c.hp - hits)
        c.log.unshift({ text: `${p.name} rolls ${heroDiceCount} dice → ${hits} hit${hits === 1 ? '' : 's'}`, cls: '' })

        if (c.hp <= 0) {
          // creature slain
          c.over = true
          c.heroWon = true
          c.lastCreatureRolls = null
          if (c.boss) {
            s.bossHp = 0
            addLog(s, `🏆 ${p.name} slays Vhalrax the Undying!`, 'boss')
            s.winner = {
              faction: p.faction,
              reason: `${p.name} slew Vhalrax the Undying! The ${FACTIONS[p.faction].name} wins the war for Aetheria!`,
              slayer: p.name,
            }
            return
          }
          const gold = creatureDef.gold + eff.goldPerKill
          p.gold += gold
          p.vp += creatureDef.vp
          p.kills += 1
          if (eff.killHeal > 0 && p.hp < eff.maxHp) {
            p.hp = Math.min(eff.maxHp, p.hp + eff.killHeal)
            c.log.unshift({ text: `Bloodthirst: +${eff.killHeal} HP`, cls: 'good' })
          }
          s.creatures[c.regionId] = null
          s.respawnQueue[c.regionId] = s.round + 2
          c.log.unshift({ text: `${creatureDef.name} is slain! +${creatureDef.xp} XP, +${gold} gold, +${creatureDef.vp} VP`, cls: 'good' })
          addLog(s, `${p.name} slays ${creatureDef.name} (+${creatureDef.xp} XP, +${gold} gold, +${creatureDef.vp} VP).`, 'good')
          grantXp(s, p, creatureDef.xp)
          checkKillQuests(s, p, creatureDef, c.regionId)
          return
        }

        // creature strikes back
        if (!noRetaliation) {
          const cDice = creatureDef.dice + (ev.creatureDice || 0)
          const cRolls = rollDice(cDice)
          const cHits = creatureHits(cRolls, creatureDef.hitOn)
          const dmg = noDamage ? 0 : Math.max(0, cHits - eff.armor)
          c.lastCreatureRolls = cRolls
          p.hp = Math.max(0, p.hp - dmg)
          c.log.unshift({
            text: noDamage
              ? `${creatureDef.name} strikes — ${ab.name} absorbs everything!`
              : `${creatureDef.name} rolls ${cDice} dice → ${dmg} damage${eff.armor && cHits ? ` (${cHits} hits − ${eff.armor} armor)` : ''}`,
            cls: dmg > 0 ? 'bad' : '',
          })
          if (p.hp <= 0) {
            c.over = true
            c.heroDied = true
            // the wounded creature keeps its damage
            if (c.boss) s.bossHp = c.hp
            else if (s.creatures[c.regionId]) s.creatures[c.regionId].hp = c.hp
            heroDeath(s, p)
            return
          }
        } else {
          c.lastCreatureRolls = null
          c.log.unshift({ text: `${creatureDef.name} cannot strike back!`, cls: 'good' })
        }
        c.round += 1
      }),

    combatFlee: () =>
      set((s) => {
        const c = s.combat
        if (!c || c.over) return
        const p = s.players[c.playerIdx]
        c.over = true
        c.fled = true
        if (c.pvp) {
          addLog(s, `${p.name} withdraws from the duel with ${s.players[c.targetIdx].name}.`, 'bad')
          return
        }
        const creatureDef = CREATURES[c.defId]
        if (c.boss) s.bossHp = c.hp
        else if (s.creatures[c.regionId]) s.creatures[c.regionId].hp = c.hp
        addLog(s, `${p.name} flees from ${creatureDef.name}.`, 'bad')
      }),

    closeCombat: () =>
      set((s) => {
        s.combat = null
        if (s.winner) {
          s.screen = 'victory'
          return
        }
        // a fallen hero's turn ends immediately
        if (currentPlayer(s).dead) advanceTurn(s)
      }),

    // ---------- turn flow ----------
    endTurn: () =>
      set((s) => {
        if (s.combat || s.winner) return
        const p = currentPlayer(s)
        const eff = effStats(p)
        p.energy = Math.min(eff.maxEnergy, p.energy + GAME.ENERGY_REGEN_PER_TURN + eff.energyRegen)
        advanceTurn(s)
      }),
    })),
    {
      name: 'warbound-realms-save',
      version: 3,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : noopStorage
      ),
      // transient UI state is not worth persisting across sessions
      partialize: (s) => {
        const { toasts, shopOpen, rulesOpen, sheetOpen, eventReveal, ...rest } = s
        return rest
      },
    }
  )
)

// ---------- read-only selectors ----------
export const selCurrentPlayer = (s) =>
  s.screen === 'game' && s.players.length ? s.players[s.turnOrder[s.turnPos]] : null

export const selEventMod = (s) => EVENTS[s.eventId]?.mod || {}

export const reachableRegions = (s) => {
  const p = selCurrentPlayer(s)
  if (!p || p.dead || s.movesLeft <= 0 || s.combat || s.winner) return []
  return REGIONS[p.region].adjacent.filter((rid) => {
    const dest = REGIONS[rid]
    if (dest.capital && dest.capital !== p.faction) return false
    if (rid === 'blackspire' && !s.bossSpawned) return false
    return true
  })
}
