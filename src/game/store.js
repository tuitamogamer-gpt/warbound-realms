import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import { TALENTS } from '../data/talents'
import { ABILITIES, maxAbilitySlots, isHealOnly } from '../data/abilities'
import { HEROES } from '../data/heroes'
import { GAME, FACTIONS } from '../data/constants'
import { REGIONS } from '../data/regions'
import { CREATURES, creaturesOfTier } from '../data/creatures'
import { ITEMS } from '../data/items'
import { EVENTS, EVENT_LIST } from '../data/events'
import { QUESTS } from '../data/quests'
import { rollDice, heroHits, creatureHits, shuffle, pick } from './dice'
import { effStats, makePlayer, applyXp } from './rules'
import { DEFAULT_SEED, nextRandom, normalizeSeed } from './rng'

const CREATURE_REGIONS = Object.values(REGIONS)
  .filter((r) => r.tier >= 1 && r.tier <= 3)
  .map((r) => r.id)

const questById = (id) => QUESTS.find((q) => q.id === id)

const random = (s) => {
  const result = nextRandom(s.rngState)
  s.rngState = result.state
  return result.value
}

const randomFn = (s) => () => random(s)
const randomRolls = (s, count) => rollDice(count, randomFn(s))
const randomShuffle = (s, list) => shuffle(list, randomFn(s))
const randomPick = (s, list) => pick(list, randomFn(s))

export const validateRoster = (roster) => {
  if (!Array.isArray(roster) || ![2, 4].includes(roster.length)) {
    return { valid: false, error: 'Choose exactly 2 or 4 heroes.' }
  }
  const heroIds = roster.map((entry) => entry?.heroId)
  if (heroIds.some((id) => !HEROES[id]) || new Set(heroIds).size !== heroIds.length) {
    return { valid: false, error: 'Every player must choose a different hero.' }
  }
  const accord = heroIds.filter((id) => HEROES[id].faction === 'accord').length
  const dominion = heroIds.length - accord
  const required = roster.length / 2
  if (accord !== required || dominion !== required) {
    return { valid: false, error: `Teams must be even: ${required} Accord and ${required} Dominion.` }
  }
  return { valid: true, error: null }
}

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

const blockingModal = (s) => {
  const activePlayer = currentPlayer(s)
  if (s.handoffPending) return 'handoff'
  if (s.eventReveal) return 'event-reveal'
  if (s.eventChoice) return 'event-choice'
  if (s.combat) return 'combat'
  if (s.celebrations?.length) return 'quest-celebration'
  if (activePlayer?.pendingTalents?.length) return 'talent'
  if (s.questDraw) return 'quest-draw'
  if (s.shopOpen) return 'shop'
  if (s.mobilePanel) return 'mobile-panel'
  if (s.sheetOpen != null) return 'character-sheet'
  if (s.rulesOpen) return 'rules'
  return null
}

const hasPendingDecision = (s) =>
  !!(
    s.handoffPending || s.eventReveal || s.eventChoice || s.questDraw ||
    s.celebrations.length || currentPlayer(s)?.pendingTalents?.length
  )

const spawnCreature = (s, regionId) => {
  const tier = REGIONS[regionId].tier
  const def = randomPick(s, creaturesOfTier(tier))
  s.creatures[regionId] = { defId: def.id, hp: def.hp, respawnAtRound: null }
}

const questHasLiveTarget = (s, quest) => {
  if (!quest) return false
  if (quest.type === 'visit') return !!REGIONS[quest.region]
  if (quest.type === 'killCreature') {
    return Object.values(s.creatures).some((slot) => slot?.defId === quest.creature)
  }
  if (quest.type === 'killTier') {
    return Object.entries(s.creatures).some(([regionId, slot]) => {
      if (!slot || (quest.region && quest.region !== regionId)) return false
      return CREATURES[slot.defId]?.tier === quest.tier
    })
  }
  return false
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
  if (
    s.combat || s.winner || s.questDraw || s.celebrations.length ||
    s.handoffPending || s.eventReveal || s.eventChoice
  ) return
  if (p.dead || p.pendingTalents?.length || p.quests.length >= GAME.MAX_ACTIVE_QUESTS) return
  // Only offer quests whose target currently exists on the board. This avoids
  // dead cards such as a named creature that is not in the current spawn set.
  const used = new Set(s.players.flatMap((pl) => [...pl.quests, ...pl.completed]))
  const eligible = QUESTS
    .filter((quest) => !used.has(quest.id) && questHasLiveTarget(s, quest))
    .map((quest) => quest.id)
  const eligibleSet = new Set(eligible)
  s.questDeck = s.questDeck.filter((id) => eligibleSet.has(id))
  const inDeck = new Set(s.questDeck)
  const refill = randomShuffle(s, eligible.filter((id) => !inDeck.has(id)))
  s.questDeck = [...refill, ...s.questDeck]
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

const replaceQuest = (s, questId, cost, verb) => {
  if (s.combat || s.winner || s.handoffPending || s.questSwapUsed) return
  const player = currentPlayer(s)
  if (!player || !REGIONS[player.region]?.town || !player.quests.includes(questId)) return
  if (player.gold < cost) return
  player.gold -= cost
  player.quests = player.quests.filter((id) => id !== questId)
  if (!s.questDeck.includes(questId)) s.questDeck.unshift(questId)
  s.questSwapUsed = true
  const quest = questById(questId)
  addLog(s, `${player.name} ${verb} "${quest?.name || 'a quest'}"${cost ? ` for ${cost} gold` : ''}.`)
  openQuestDraw(s)
}

const checkVisitQuests = (s, player) => {
  for (const qid of [...player.quests]) {
    const q = questById(qid)
    if (q.type === 'visit' && q.region === player.region) completeQuest(s, player, q)
  }
}

// Round objectives reward actual travel. A newly accepted visit quest can
// already name the hero's current region, but that is not a fresh arrival.
const checkEventObjective = (s, player) => {
  const objective = s.eventObjective
  if (objective && objective.claimedBy == null && objective.region === player.region) {
    objective.claimedBy = player.idx
    const reward = objective.reward || {}
    if (reward.gold) player.gold += reward.gold
    if (reward.vp) player.vp += reward.vp
    if (reward.xp) grantXp(s, player, reward.xp)
    addLog(s, `${player.name} claims the ${EVENTS[s.eventId].name} objective!`, 'good')
    addToast(s, `◆ ${player.name} claims the round objective!`, 'level')
  }
}

const checkKillQuests = (s, player, creatureDef, regionId) => {
  for (const qid of [...player.quests]) {
    const q = questById(qid)
    if (q.type === 'killCreature' && q.creature === creatureDef.id) {
      completeQuest(s, player, q)
    } else if (
      q.type === 'killTier' &&
      creatureDef.tier === q.tier &&
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

// Vhalrax's score contribution represents damage that is still present on the
// boss, not damage that was later regenerated. Remove healed credit from the
// retreating faction first, then the opponent, so total credited contribution
// can never exceed the boss's persistent missing health.
const regenerateBoss = (s, combat, retreatingFaction) => {
  const nextHp = Math.min(combat.maxHp, combat.hp + GAME.BOSS_RETREAT_REGEN)
  const restored = Math.max(0, nextHp - combat.hp)
  combat.hp = nextHp
  s.bossHp = nextHp

  const persistentDamage = Math.max(0, combat.maxHp - nextHp)
  const contributions = s.bossDamageByFaction
  let excess = Math.max(
    0,
    (contributions.accord || 0) + (contributions.dominion || 0) - persistentDamage,
  )
  const otherFaction = retreatingFaction === 'accord' ? 'dominion' : 'accord'
  for (const faction of [retreatingFaction, otherFaction]) {
    if (!excess) break
    const reduction = Math.min(contributions[faction] || 0, excess)
    contributions[faction] = Math.max(0, (contributions[faction] || 0) - reduction)
    excess -= reduction
  }
  return restored
}

const advanceTurn = (s, handoffFrom = null) => {
  // Set a temporary privacy lock before beginTurn can offer player-specific
  // quest choices. It is replaced with descriptive handoff data below.
  if (handoffFrom != null) s.handoffPending = true
  if (s.turnPos + 1 < s.turnOrder.length) {
    s.turnPos += 1
    beginTurn(s)
  } else {
    beginRound(s)
  }
  if (!s.winner && handoffFrom != null) {
    s.handoffPending = {
      fromPlayerIdx: handoffFrom,
      toPlayerIdx: s.turnOrder[s.turnPos],
      turnId: s.turnId,
    }
  }
}

const beginTurn = (s) => {
  const p = currentPlayer(s)
  s.turnId += 1
  s.purchaseRequestIdsThisTurn = []
  s.questSwapUsed = false
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
  if (!s.eventDeck.length) s.eventDeck = randomShuffle(s, EVENT_LIST.map((e) => e.id))
  s.eventId = s.eventDeck.pop()
  const ev = EVENTS[s.eventId]
  addLog(s, `Round ${s.round} — Event: ${ev.name}. ${ev.desc}`, 'event')
  s.eventReveal = true
  s.eventChoice = null
  s.eventObjective = ev.objective
    ? { ...ev.objective, reward: { ...ev.objective.reward }, claimedBy: null }
    : null
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
  s.roundStarterFaction = s.round === 1
    ? s.initiativeFaction
    : s.roundStarterFaction === 'accord' ? 'dominion' : 'accord'
  // Keep teammate order stable for the two-faction cycle, then rotate it the
  // next time that faction receives opening initiative.
  s.turnOrder = buildTurnOrder(s.players, s.roundStarterFaction, Math.floor((s.round - 1) / 2))
  s.turnPos = 0
  if (ev.choices?.length) {
    s.eventChoice = {
      eventId: ev.id,
      playerIdx: currentPlayer(s).idx,
      options: ev.choices.map((choice) => choice.id),
    }
  }
  beginTurn(s)
}

const resolvePvpDefense = (combat, defender) => {
  const response = combat.defenderResponse
  if (!response) {
    const legacyLabel = combat.defenderResponseLabel || null
    combat.defenderResponseLabel = null
    return legacyLabel
  }
  combat.defenderResponse = null

  if (response.type === 'brace') {
    combat.defenderArmorBonus = 2
    return 'Brace (+2 armor)'
  }
  if (response.type === 'counter') {
    combat.defenderDiceBonus = 1
    return 'Counter (+1 die)'
  }
  if (response.type === 'ability') {
    const ability = ABILITIES[response.abilityId]
    if (
      !ability || ability.type !== 'active' || !defender.abilities.includes(ability.id) ||
      defender.energy < ability.energy ||
      (isHealOnly(ability) && defender.hp >= effStats(defender).maxHp)
    ) return 'a guarded stance'
    defender.energy -= ability.energy
    const effect = ability.effect || {}
    if (effect.noDamage || effect.noRetaliation) combat.defenderNoDamage = true
    if (effect.enemyDiceDown) combat.attackerDiceDown += effect.enemyDiceDown
    if (effect.bonusDice) combat.defenderDiceBonus += effect.bonusDice
    if (effect.autoHits) combat.defenderAutoHits += effect.autoHits
    if (effect.critOn5) combat.defenderCritOn5 = true
    if (effect.heal) defender.hp = Math.min(effStats(defender).maxHp, defender.hp + effect.heal)
    combat.defenderAbilityId = ability.id
    return ability.name
  }
  if (response.type === 'consumable') {
    let index = Number.isInteger(response.index) ? response.index : -1
    if (defender.consumables[index] !== response.itemId) {
      index = defender.consumables.indexOf(response.itemId)
    }
    const item = ITEMS[defender.consumables[index]]
    const effect = item?.effects || {}
    if (!item || index < 0) return 'a guarded stance'
    if (effect.heal && defender.hp < effStats(defender).maxHp) {
      defender.hp = Math.min(effStats(defender).maxHp, defender.hp + effect.heal)
    } else if (effect.combatArmor) {
      combat.defenderArmorBonus += effect.combatArmor
    } else {
      return 'a guarded stance'
    }
    defender.consumables.splice(index, 1)
    return item.name
  }
  return 'a guarded stance'
}

// One round of a hero-versus-hero duel. The attacker may use an ability;
// the defender fights back with their full dice and passive bonuses.
const pvpRound = (s, c, abilityId) => {
  const p = s.players[c.playerIdx]
  const t = s.players[c.targetIdx]
  const defenseLabel = resolvePvpDefense(c, t)
  const eff = effStats(p)
  const defEff = effStats(t)
  const ev = eventMod(s)

  let bonusDice = c.elixirDice
  let autoHits = c.elixirAutoHits || 0
  let bonusArmor = c.elixirArmor || 0
  c.elixirDice = 0
  c.elixirAutoHits = 0
  c.elixirArmor = 0
  let noRetaliation = false
  let noDamage = false
  let critOn5 = eff.critOn5
  let enemyDiceDown = 0
  if (c.round === 1) bonusDice += eff.firstRoundDice

  if (defenseLabel) c.log.unshift({ text: `${t.name} reveals ${defenseLabel}.`, cls: 'event' })

  const ab = abilityId ? ABILITIES[abilityId] : null
  if (
    ab &&
    ab.type === 'active' &&
    p.abilities.includes(ab.id) &&
    p.energy >= ab.energy &&
    !(isHealOnly(ab) && p.hp >= eff.maxHp)
  ) {
    c.abilityUsed = true
    p.energy -= ab.energy
    const fx = ab.effect
    if (fx.bonusDice) bonusDice += fx.bonusDice
    if (fx.autoHits) autoHits += fx.autoHits
    if (fx.noRetaliation) noRetaliation = true
    if (fx.noDamage) noDamage = true
    if (fx.critOn5) critOn5 = true
    if (fx.enemyDiceDown) enemyDiceDown += fx.enemyDiceDown
    if (fx.heal) {
      p.hp = Math.min(eff.maxHp, p.hp + fx.heal)
      c.log.unshift({ text: `${ab.name}: +${fx.heal} HP`, cls: 'good' })
    } else {
      c.log.unshift({ text: `${ab.name}!`, cls: 'good' })
    }
  }
  if (eff.firstStrike && c.round === 1) noRetaliation = true

  // attacker strikes
  const atkDice = Math.max(0, eff.dice + (ev.heroDice || 0) + bonusDice - (c.attackerDiceDown || 0))
  const rolls = randomRolls(s, atkDice)
  const hits = heroHits(rolls, critOn5) + autoHits
  c.rollId = (c.rollId || 0) + 1
  c.lastCritOn5 = critOn5
  c.lastHeroRolls = rolls
  c.lastAutoHits = autoHits
  const defenderArmor = defEff.armor + (c.defenderArmorBonus || 0)
  const dmgOut = c.defenderNoDamage ? 0 : Math.max(0, hits - defenderArmor)
  t.hp = Math.max(0, t.hp - dmgOut)
  c.log.unshift({
    text: `${p.name} rolls ${atkDice} dice → ${dmgOut} damage${defenderArmor && hits ? ` (${hits} hits − ${defenderArmor} armor)` : ''}`,
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
    const defDice = Math.max(
      0,
      defEff.dice + (ev.heroDice || 0) + (c.round === 1 ? defEff.firstRoundDice : 0) - enemyDiceDown
        + (c.defenderDiceBonus || 0)
    )
    const dRolls = randomRolls(s, defDice)
    const dHits = heroHits(dRolls, defEff.critOn5 || c.defenderCritOn5) + (c.defenderAutoHits || 0)
    const armor = eff.armor + bonusArmor
    const dmgIn = noDamage ? 0 : Math.max(0, dHits - armor)
    c.lastCreatureRolls = dRolls
    p.hp = Math.max(0, p.hp - dmgIn)
    c.log.unshift({
      text: noDamage
        ? `${t.name} strikes — ${ab.name} absorbs everything!`
        : `${t.name} rolls ${defDice} dice → ${dmgIn} damage${armor && dHits ? ` (${dHits} hits − ${armor} armor)` : ''}`,
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
  c.abilityUsed = false
  c.consumableUsed = false
  c.pvpDefensePending = true
  c.pvpHandoff = 'defender'
  c.defenderResponse = null
  c.defenderArmorBonus = 0
  c.defenderDiceBonus = 0
  c.defenderAutoHits = 0
  c.defenderNoDamage = false
  c.defenderCritOn5 = false
  c.attackerDiceDown = 0
}

// Interleave factions so turns alternate: A, D, A, D...
const rotate = (list, amount) => {
  if (!list.length) return list
  const offset = amount % list.length
  return [...list.slice(offset), ...list.slice(0, offset)]
}

const buildTurnOrder = (players, starterFaction = 'accord', teammateOffset = 0) => {
  const accord = rotate(players.filter((p) => p.faction === 'accord').map((p) => p.idx), teammateOffset)
  const dominion = rotate(players.filter((p) => p.faction === 'dominion').map((p) => p.idx), teammateOffset)
  const order = []
  const longer = Math.max(accord.length, dominion.length)
  const first = starterFaction === 'dominion' ? dominion : accord
  const second = starterFaction === 'dominion' ? accord : dominion
  for (let i = 0; i < longer; i++) {
    if (first[i] != null) order.push(first[i])
    if (second[i] != null) order.push(second[i])
  }
  return order
}

const knownUniqueIds = (value, dictionary) => [
  ...new Set((Array.isArray(value) ? value : []).filter((id) => dictionary[id])),
]

const normalizeLegacyPlayer = (legacy, idx) => {
  const hero = HEROES[legacy.heroId]
  const base = makePlayer(idx, legacy.name, legacy.heroId)
  const player = {
    ...base,
    ...legacy,
    idx,
    heroId: legacy.heroId,
    faction: hero.faction,
    name: typeof legacy.name === 'string' && legacy.name.trim() ? legacy.name.trim() : hero.name,
    region: REGIONS[legacy.region] ? legacy.region : FACTIONS[hero.faction].capital,
  }

  player.items = knownUniqueIds(legacy.items, ITEMS).filter((id) => ITEMS[id].slot !== 'consumable')
  player.consumables = (Array.isArray(legacy.consumables) ? legacy.consumables : [])
    .filter((id) => ITEMS[id]?.slot === 'consumable')
    .slice(0, GAME.MAX_CONSUMABLES)
  player.abilities = knownUniqueIds(legacy.abilities, ABILITIES)
  if (!player.abilities.includes(hero.signature)) player.abilities.unshift(hero.signature)
  player.quests = knownUniqueIds(legacy.quests, Object.fromEntries(QUESTS.map((quest) => [quest.id, quest])))
    .slice(0, GAME.MAX_ACTIVE_QUESTS)
  player.completed = knownUniqueIds(legacy.completed, Object.fromEntries(QUESTS.map((quest) => [quest.id, quest])))
  player.talents = knownUniqueIds(legacy.talents, TALENTS)
  player.pendingTalents = (Array.isArray(legacy.pendingTalents) ? legacy.pendingTalents : [])
    .filter((level) => level === 2 || level === 4)

  const numberOr = (value, fallback) => Number.isFinite(value) ? value : fallback
  player.maxHp = Math.max(1, numberOr(legacy.maxHp, base.maxHp))
  player.dice = Math.max(0, numberOr(legacy.dice, base.dice))
  player.armor = Math.max(0, numberOr(legacy.armor, base.armor))
  player.maxEnergy = Math.max(0, numberOr(legacy.maxEnergy, base.maxEnergy))
  player.move = Math.max(1, numberOr(legacy.move, base.move))
  player.level = Math.min(5, Math.max(1, Math.trunc(numberOr(legacy.level, base.level))))
  player.xp = Math.max(0, numberOr(legacy.xp, base.xp))
  player.gold = Math.max(0, numberOr(legacy.gold, base.gold))
  player.vp = Math.max(0, numberOr(legacy.vp, base.vp))
  player.kills = Math.max(0, numberOr(legacy.kills, base.kills))
  player.pvpWins = Math.max(0, numberOr(legacy.pvpWins, base.pvpWins))
  const effective = effStats(player)
  player.hp = Math.min(effective.maxHp, Math.max(0, numberOr(legacy.hp, base.hp)))
  player.energy = Math.min(effective.maxEnergy, Math.max(0, numberOr(legacy.energy, base.energy)))
  player.dead = !!legacy.dead
  return player
}

const retireLegacyMatch = (migrated, error) => {
  migrated.screen = 'menu'
  migrated.players = []
  migrated.turnOrder = []
  migrated.turnPos = 0
  migrated.round = 0
  migrated.combat = null
  migrated.questDraw = null
  migrated.winner = null
  migrated.setupError = `${error} The old match was retired safely.`
}

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

export const useGame = create(
  persist(
    immer((set, get) => ({
    screen: 'menu',
    saveVersion: 6,
    matchId: 0,
    seed: DEFAULT_SEED,
    rngState: DEFAULT_SEED,
    setupError: null,
    players: [],
    turnOrder: [],
    turnPos: 0,
    turnId: 0,
    initiativeFaction: 'accord',
    roundStarterFaction: null,
    round: 0,
    eventId: null,
    eventDeck: [],
    eventReveal: false,
    eventChoice: null,
    eventObjective: null,
    questDeck: [],
    creatures: {},
    respawnQueue: {},
    bossSpawned: false,
    bossHp: 0,
    bossDamageByFaction: { accord: 0, dominion: 0 },
    movesLeft: 0,
    actionUsed: false,
    purchaseRequestIdsThisTurn: [],
    questSwapUsed: false,
    handoffPending: false,
    tutorialStep: 0,
    tutorialCompleted: false,
    inspectedRegionId: null,
    combat: null,
    combatSeq: 0,
    questDraw: null,
    celebrations: [],
    shopOpen: false,
    rulesOpen: false,
    sheetOpen: null,
    mobilePanel: null,
    log: [],
    logSeq: 1,
    toasts: [],
    winner: null,

    // ---------- setup ----------
    startGame: (roster, options = {}) => {
      const validation = validateRoster(roster)
      if (!validation.valid) {
        set((s) => void (s.setupError = validation.error))
        return false
      }
      const seed = normalizeSeed(options.seed ?? Date.now())
      set((s) => {
        s.saveVersion = 6
        s.matchId += 1
        s.seed = seed
        s.rngState = seed
        s.setupError = null
        s.players = roster.map((r, i) => {
          const p = makePlayer(i, r.name, r.heroId)
          p.region = FACTIONS[p.faction].capital
          return p
        })
        s.initiativeFaction = random(s) < 0.5 ? 'accord' : 'dominion'
        s.roundStarterFaction = null
        s.turnOrder = []
        s.turnPos = 0
        s.turnId = 0
        s.round = 0
        s.creatures = {}
        s.respawnQueue = {}
        for (const rid of CREATURE_REGIONS) spawnCreature(s, rid)
        s.bossSpawned = false
        s.bossHp = 0
        s.bossDamageByFaction = { accord: 0, dominion: 0 }
        s.eventDeck = randomShuffle(s, EVENT_LIST.map((e) => e.id))
        s.eventChoice = null
        s.eventObjective = null
        s.questDeck = randomShuffle(s, QUESTS.map((q) => q.id))
        s.log = []
        s.logSeq = 1
        s.toasts = []
        s.combat = null
        s.combatSeq = 0
        s.questDraw = null
        s.celebrations = []
        s.movesLeft = 0
        s.actionUsed = false
        s.purchaseRequestIdsThisTurn = []
        s.questSwapUsed = false
        s.handoffPending = false
        s.tutorialStep = options.skipTutorial ? null : 0
        s.tutorialCompleted = !!options.skipTutorial
        s.inspectedRegionId = null
        s.shopOpen = false
        s.rulesOpen = false
        s.sheetOpen = null
        s.mobilePanel = null
        s.winner = null
        s.screen = 'game'
        addLog(s, 'The war for Aetheria begins!', 'event')
        beginRound(s)
      })
      return true
    },

    backToMenu: () => set((s) => void (s.screen = 'menu')),
    resumeGame: () =>
      set((s) => {
        if (!s.players.length || s.winner) {
          s.setupError = 'There is no active expedition to continue.'
          return
        }
        s.setupError = null
        s.screen = 'game'
        if (s.combat) s.combat.rolling = false
      }),
    abandonGame: () =>
      set((s) => {
        s.screen = 'menu'
        s.players = []
        s.turnOrder = []
        s.turnPos = 0
        s.turnId = 0
        s.round = 0
        s.eventId = null
        s.eventDeck = []
        s.eventReveal = false
        s.eventChoice = null
        s.eventObjective = null
        s.questDeck = []
        s.creatures = {}
        s.respawnQueue = {}
        s.bossSpawned = false
        s.bossHp = 0
        s.bossDamageByFaction = { accord: 0, dominion: 0 }
        s.movesLeft = 0
        s.actionUsed = false
        s.purchaseRequestIdsThisTurn = []
        s.questSwapUsed = false
        s.handoffPending = false
        s.combat = null
        s.questDraw = null
        s.celebrations = []
        s.shopOpen = false
        s.rulesOpen = false
        s.sheetOpen = null
        s.mobilePanel = null
        s.inspectedRegionId = null
        s.log = []
        s.toasts = []
        s.winner = null
        s.setupError = null
      }),
    newGame: () => get().abandonGame(),
    confirmHandoff: () =>
      set((s) => {
        if (!s.handoffPending) return
        s.handoffPending = false
        openQuestDraw(s)
      }),
    advanceTutorial: () =>
      set((s) => {
        if (s.tutorialStep == null) return
        s.tutorialStep += 1
        if (s.tutorialStep >= 4) {
          s.tutorialStep = null
          s.tutorialCompleted = true
        }
      }),
    completeTutorial: () =>
      set((s) => {
        s.tutorialStep = null
        s.tutorialCompleted = true
      }),
    inspectRegion: (regionId) =>
      set((s) => {
        if (s.handoffPending && regionId) return
        s.inspectedRegionId = regionId && REGIONS[regionId] ? regionId : null
      }),
    dismissEventReveal: () =>
      set((s) => {
        if (s.handoffPending) return
        s.eventReveal = false
        openQuestDraw(s)
      }),
    chooseEventOption: (optionId) =>
      set((s) => {
        if (s.handoffPending) return
        const pending = s.eventChoice
        const event = pending && EVENTS[pending.eventId]
        const option = event?.choices?.find((choice) => choice.id === optionId)
        if (!pending || !option || !pending.options.includes(optionId)) return
        const player = s.players[pending.playerIdx]
        if (!player) return
        const effect = option.effect || {}
        const stats = effStats(player)
        if (effect.healCurrent) player.hp = Math.min(stats.maxHp, player.hp + effect.healCurrent)
        if (effect.damageCurrent) player.hp = Math.max(1, player.hp - effect.damageCurrent)
        if (effect.goldCurrent) player.gold += effect.goldCurrent
        if (effect.movesCurrent) s.movesLeft += effect.movesCurrent
        if (effect.xpCurrent) grantXp(s, player, effect.xpCurrent)
        addLog(s, `${player.name} chooses "${option.name}" during ${event.name}.`, 'event')
        s.eventChoice = null
        openQuestDraw(s)
      }),
    dismissToast: (id) =>
      set((s) => void (s.toasts = s.toasts.filter((t) => t.id !== id))),
    openShop: (open) => set((s) => {
      if (s.handoffPending && open) return
      s.shopOpen = open
    }),
    openRules: (open) => set((s) => {
      if (s.handoffPending && open) return
      s.rulesOpen = open
    }),
    openSheet: (playerIdx) => set((s) => {
      if (playerIdx != null && blockingModal(s)) return
      s.sheetOpen = playerIdx
    }),
    openMobilePanel: (panelId) => set((s) => {
      if (panelId != null && blockingModal(s)) return
      s.mobilePanel = ['hero', 'quests', 'log', 'more'].includes(panelId) ? panelId : null
    }),

    // ---------- quests ----------
    pickQuest: (questId) =>
      set((s) => {
        if (s.handoffPending) return
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

    abandonQuest: (questId) =>
      set((s) => replaceQuest(s, questId, 0, 'abandons')),

    rerollQuest: (questId) =>
      set((s) => replaceQuest(s, questId, GAME.QUEST_REROLL_COST, 'rerolls')),

    dismissCelebration: () =>
      set((s) => {
        s.celebrations.shift()
        if (!s.celebrations.length) openQuestDraw(s)
      }),

    // ---------- abilities ----------
    buyAbility: (abilityId) =>
      set((s) => {
        const p = currentPlayer(s)
        if (s.winner || hasPendingDecision(s) || p.dead) return
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
        if (s.winner || hasPendingDecision(s) || s.combat || !ab || !ab.anytime) return
        if (!p.abilities.includes(abilityId) || p.energy < ab.energy) return
        const eff = effStats(p)
        if (isHealOnly(ab) && p.hp >= eff.maxHp) return
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
        if (
          s.handoffPending || !t || (t.heroId && t.heroId !== p.heroId) ||
          !p.pendingTalents?.includes(t.level) || p.talents?.includes(talentId)
        ) return
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
        if (fx.move) p.move += fx.move
        addLog(s, `${p.name} learns ${t.name} (${t.desc})`, 'good')
        addToast(s, `✦ ${p.name} learns ${t.name}!`, 'level')
        openQuestDraw(s)
      }),

    // ---------- movement ----------
    moveTo: (regionId) =>
      set((s) => {
        if (s.combat || s.winner || hasPendingDecision(s)) return
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
        checkEventObjective(s, p)
      }),

    // ---------- actions ----------
    rest: () =>
      set((s) => {
        if (s.combat || s.actionUsed || s.winner || hasPendingDecision(s)) return
        const p = currentPlayer(s)
        const eff = effStats(p)
        p.hp = Math.min(eff.maxHp, p.hp + GAME.REST_HP)
        p.energy = Math.min(eff.maxEnergy, p.energy + GAME.REST_ENERGY)
        s.actionUsed = true
        addLog(s, `${p.name} rests (+${GAME.REST_HP} HP, +${GAME.REST_ENERGY} energy).`)
      }),

    assistAlly: (targetIdx) =>
      set((s) => {
        if (s.combat || s.actionUsed || s.winner || hasPendingDecision(s)) return
        const player = currentPlayer(s)
        const ally = s.players[targetIdx]
        if (
          !ally || ally.idx === player.idx || ally.dead || ally.faction !== player.faction ||
          ally.region !== player.region
        ) return
        const stats = effStats(ally)
        if (ally.hp >= stats.maxHp && ally.energy >= stats.maxEnergy) return
        ally.hp = Math.min(stats.maxHp, ally.hp + GAME.ALLY_ASSIST_HP)
        ally.energy = Math.min(stats.maxEnergy, ally.energy + GAME.ALLY_ASSIST_ENERGY)
        s.actionUsed = true
        addLog(s, `${player.name} aids ${ally.name} (+${GAME.ALLY_ASSIST_HP} HP, +${GAME.ALLY_ASSIST_ENERGY} energy).`, 'good')
      }),

    buyItem: (itemId, guard = null) =>
      set((s) => {
        const p = currentPlayer(s)
        const expectedTurnId = typeof guard === 'number' ? guard : guard?.turnId
        const requestId = typeof guard === 'object' ? guard?.requestId : null
        if (
          !REGIONS[p.region].town || s.winner || hasPendingDecision(s) ||
          (expectedTurnId != null && expectedTurnId !== s.turnId) ||
          (requestId && s.purchaseRequestIdsThisTurn.includes(requestId))
        ) return
        const item = ITEMS[itemId]
        if (!item) return
        if (item.slot !== 'consumable' && p.items.includes(itemId)) return
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
        if (requestId) s.purchaseRequestIdsThisTurn.push(requestId)
        addLog(s, `${p.name} buys ${item.name} for ${cost} gold.`)
      }),

    useConsumable: (index) =>
      set((s) => {
        const p = currentPlayer(s)
        if (s.winner || s.handoffPending || s.combat?.pvpHandoff) return
        const itemId = p.consumables[index]
        if (!itemId) return
        const item = ITEMS[itemId]
        if (s.combat && s.combat.consumableUsed) return
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
        } else if (item.effects.combatAutoHits && s.combat && !s.combat.over) {
          p.consumables.splice(index, 1)
          s.combat.elixirAutoHits = (s.combat.elixirAutoHits || 0) + item.effects.combatAutoHits
          s.combat.log.unshift({ text: `${item.name}: +${item.effects.combatAutoHits} auto hits this round`, cls: 'good' })
        } else if (item.effects.combatArmor && s.combat && !s.combat.over) {
          p.consumables.splice(index, 1)
          s.combat.elixirArmor = (s.combat.elixirArmor || 0) + item.effects.combatArmor
          s.combat.log.unshift({ text: `${item.name}: +${item.effects.combatArmor} armor this round`, cls: 'good' })
        }
        if (s.combat) s.combat.consumableUsed = true
      }),


    // ---------- combat ----------
    startPvp: (targetIdx) =>
      set((s) => {
        if (s.combat || s.actionUsed || s.winner || hasPendingDecision(s)) return
        const p = currentPlayer(s)
        const t = s.players[targetIdx]
        if (!t || t.dead || p.dead || t.idx === p.idx) return
        if (t.faction === p.faction) return
        if (t.region !== p.region) return
        if (REGIONS[p.region].town) return // towns are sanctuaries
        s.actionUsed = true
        s.combatSeq += 1
        s.combat = {
          id: s.combatSeq,
          pvp: true,
          playerIdx: p.idx,
          targetIdx,
          regionId: p.region,
          round: 1,
          over: false,
          heroWon: false,
          heroDied: false,
          fled: false,
          pvpDefensePending: true,
          pvpHandoff: 'defender',
          defenderResponse: null,
          defenderWithdrew: false,
          defenderArmorBonus: 0,
          defenderDiceBonus: 0,
          defenderAutoHits: 0,
          defenderNoDamage: false,
          defenderCritOn5: false,
          attackerDiceDown: 0,
          abilityUsed: false,
          consumableUsed: false,
          elixirDice: 0,
          elixirAutoHits: 0,
          elixirArmor: 0,
          lastHeroRolls: null,
          lastCreatureRolls: null,
          lastAutoHits: 0,
          lastCritOn5: false,
          rollId: 0,
          rolling: false,
          log: [{ text: `${p.name} challenges ${t.name} to a duel!`, cls: 'event' }],
        }
        addLog(s, `⚔ ${p.name} challenges ${t.name} to a duel!`, 'bad')
      }),

    setPvpDefense: (choice) =>
      set((s) => {
        const combat = s.combat
        if (
          !combat?.pvp || combat.over || !combat.pvpDefensePending ||
          ![null, 'choosing'].includes(combat.pvpHandoff)
        ) return
        const defender = s.players[combat.targetIdx]
        const type = typeof choice === 'string' ? choice : choice?.type
        if (type === 'withdraw') {
          combat.pvpDefensePending = false
          combat.pvpHandoff = 'attacker'
          combat.defenderResponse = null
          combat.over = true
          combat.defenderWithdrew = true
          combat.log.unshift({ text: `${defender.name} withdraws before the clash.`, cls: 'event' })
          addLog(s, `${defender.name} withdraws from ${s.players[combat.playerIdx].name}'s duel.`, 'bad')
          return
        }
        if (type === 'brace') {
          combat.defenderResponse = { type }
        } else if (type === 'counter') {
          combat.defenderResponse = { type }
        } else if (type === 'ability') {
          const ability = ABILITIES[choice?.abilityId]
          if (
            !ability || ability.type !== 'active' || !defender.abilities.includes(ability.id) ||
            defender.energy < ability.energy ||
            (isHealOnly(ability) && defender.hp >= effStats(defender).maxHp)
          ) return
          combat.defenderResponse = { type, abilityId: ability.id }
        } else if (type === 'consumable') {
          const index = Number(choice?.index)
          const itemId = defender.consumables[index]
          const item = ITEMS[itemId]
          if (!item) return
          const effect = item.effects || {}
          if (!(effect.heal && defender.hp < effStats(defender).maxHp) && !effect.combatArmor) return
          combat.defenderResponse = { type, index, itemId }
        } else {
          return
        }
        combat.pvpDefensePending = false
        combat.pvpHandoff = 'attacker'
        combat.log.unshift({
          text: `${defender.name} locks in a secret response.`,
          cls: 'event',
        })
      }),

    confirmPvpHandoff: () =>
      set((s) => {
        const combat = s.combat
        if (!combat?.pvp) return
        if (combat.pvpHandoff === 'defender' && combat.pvpDefensePending) {
          combat.pvpHandoff = 'choosing'
        } else if (combat.pvpHandoff === 'attacker' && !combat.pvpDefensePending) {
          combat.pvpHandoff = null
        }
      }),

    startCombat: (boss = false) =>
      set((s) => {
        if (s.combat || s.actionUsed || s.winner || hasPendingDecision(s)) return
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
        s.combatSeq += 1
        s.combat = {
          id: s.combatSeq,
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
          abilityUsed: false,
          consumableUsed: false,
          elixirDice: 0,
          elixirAutoHits: 0,
          elixirArmor: 0,
          lastHeroRolls: null,
          lastCreatureRolls: null,
          lastAutoHits: 0,
          lastCritOn5: false,
          rollId: 0,
          rolling: false,
          log: [{ text: `${p.name} challenges ${creatureDef.name}!`, cls: 'event' }],
        }
        addLog(s, `${p.name} challenges ${creatureDef.name}!`, 'bad')
      }),

    combatRound: (abilityId, expectedRound = null) => {
      let lockId = null
      let lockMatchId = null
      set((s) => {
        const c = s.combat
        if (
          !c || c.over || c.rolling || s.handoffPending ||
          (expectedRound != null && expectedRound !== c.round) ||
          (c.pvp && (c.pvpDefensePending || c.pvpHandoff))
        ) return
        c.rolling = true
        lockId = c.id
        lockMatchId = s.matchId
        if (c.pvp) {
          pvpRound(s, c, abilityId)
          return
        }
        const p = s.players[c.playerIdx]
        const eff = effStats(p)
        const ev = eventMod(s)
        const creatureDef = CREATURES[c.defId]
        const trait = creatureDef.trait || {}

        let bonusDice = c.elixirDice
        let autoHits = Math.max(0, (c.elixirAutoHits || 0) - (trait.autoHitWard || 0))
        let bonusArmor = c.elixirArmor || 0 // consumables (Stoneskin Draught)
        c.elixirDice = 0 // one-shot consumables empower exactly one roll
        c.elixirAutoHits = 0
        c.elixirArmor = 0
        let noRetaliation = false
        let noDamage = false
        let critOn5 = eff.critOn5 // passive from Frostbrand Sword
        let enemyDiceDown = 0

        if (c.round === 1) bonusDice += eff.firstRoundDice

        const ab = abilityId ? ABILITIES[abilityId] : null
        if (
          ab &&
          ab.type === 'active' &&
          p.abilities.includes(ab.id) &&
          p.energy >= ab.energy &&
          !c.abilityUsed &&
          !(isHealOnly(ab) && p.hp >= eff.maxHp) // don't waste a heal at full health
        ) {
          c.abilityUsed = true
          p.energy -= ab.energy
          const fx = ab.effect
          if (fx.bonusDice) bonusDice += fx.bonusDice
          if (fx.autoHits) autoHits += fx.autoHits
          if (fx.noRetaliation) noRetaliation = true
          if (fx.noDamage) noDamage = true
          if (fx.critOn5) critOn5 = true
          if (fx.enemyDiceDown) enemyDiceDown += fx.enemyDiceDown
          if (fx.heal) {
            p.hp = Math.min(eff.maxHp, p.hp + fx.heal)
            c.log.unshift({ text: `${ab.name}: +${fx.heal} HP`, cls: 'good' })
          } else {
            c.log.unshift({ text: `${ab.name}!`, cls: 'good' })
          }
        }
        if (eff.firstStrike && c.round === 1) noRetaliation = true

        // hero attack
        const heroDiceCount = Math.max(0, eff.dice + (ev.heroDice || 0) + bonusDice - (trait.heroDiceDown || 0))
        const rolls = randomRolls(s, heroDiceCount)
        const rawHits = heroHits(rolls, critOn5) + autoHits
        const hits = Math.max(0, rawHits - (trait.armor || 0))
        c.rollId = (c.rollId || 0) + 1
        c.lastCritOn5 = critOn5
        c.lastHeroRolls = rolls
        c.lastAutoHits = autoHits
        const priorHp = c.hp
        c.hp = Math.max(0, c.hp - hits)
        if (c.boss) {
          const dealt = Math.min(priorHp, hits)
          s.bossDamageByFaction[p.faction] = (s.bossDamageByFaction[p.faction] || 0) + dealt
        }
        c.log.unshift({
          text: `${p.name} rolls ${heroDiceCount} dice → ${hits} hit${hits === 1 ? '' : 's'}${trait.armor && rawHits ? ` (${rawHits} − ${trait.armor} ${trait.name})` : ''}`,
          cls: '',
        })

        if (c.hp <= 0) {
          // creature slain
          c.over = true
          c.heroWon = true
          c.lastCreatureRolls = null
          if (c.boss) {
            s.bossHp = 0
            const contributions = s.bossDamageByFaction
            const faction = contributions.accord === contributions.dominion
              ? p.faction
              : contributions.accord > contributions.dominion ? 'accord' : 'dominion'
            addLog(s, `🏆 ${p.name} lands the final blow on Vhalrax; the ${FACTIONS[faction].name} dealt the greater share of damage!`, 'boss')
            s.winner = {
              faction,
              reason: `${p.name} struck the final blow, but the ${FACTIONS[faction].name} wins through ${contributions[faction]} total boss damage!`,
              slayer: p.name,
              bossDamageByFaction: { ...contributions },
            }
            return
          }
          const gold = creatureDef.gold + eff.goldPerKill
          p.gold += gold
          p.vp += creatureDef.vp
          p.kills += 1
          if (eff.killHeal > 0 && p.hp < eff.maxHp) {
            p.hp = Math.min(eff.maxHp, p.hp + eff.killHeal)
            c.log.unshift({ text: `Life drain: +${eff.killHeal} HP`, cls: 'good' })
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
          const enraged = trait.enrageBelow && c.hp / c.maxHp <= trait.enrageBelow
          const cDice = Math.max(
            0,
            creatureDef.dice + (ev.creatureDice || 0) - enemyDiceDown +
              (c.round === 1 ? trait.firstRoundDice || 0 : 0) +
              (enraged ? trait.enrageDice || 0 : 0)
          )
          const cRolls = randomRolls(s, cDice)
          const cHits = creatureHits(cRolls, creatureDef.hitOn)
          const armor = eff.armor + bonusArmor
          const effectiveArmor = Math.max(0, armor - (trait.armorPierce || 0))
          const dmg = noDamage
            ? 0
            : cHits > 0
              ? Math.max(trait.minimumDamage || 0, cHits - effectiveArmor)
              : 0
          c.lastCreatureRolls = cRolls
          p.hp = Math.max(0, p.hp - dmg)
          c.log.unshift({
            text: noDamage
              ? `${creatureDef.name} strikes — ${ab?.name || 'your ward'} absorbs everything!`
              : `${creatureDef.name} rolls ${cDice} dice → ${dmg} damage${armor && cHits ? ` (${cHits} hits − ${effectiveArmor} effective armor)` : ''}`,
            cls: dmg > 0 ? 'bad' : '',
          })
          if (dmg > 0 && trait.energyDrainOnHit) {
            p.energy = Math.max(0, p.energy - trait.energyDrainOnHit)
            c.log.unshift({ text: `${trait.name} drains ${trait.energyDrainOnHit} energy.`, cls: 'bad' })
          }
          if (p.hp <= 0) {
            c.over = true
            c.heroDied = true
            // the wounded creature keeps its damage
            if (c.boss) {
              const restored = regenerateBoss(s, c, p.faction)
              c.log.unshift({ text: `Undying regeneration restores ${restored} health.`, cls: 'bad' })
            }
            else if (s.creatures[c.regionId]) s.creatures[c.regionId].hp = c.hp
            heroDeath(s, p)
            return
          }
        } else {
          c.lastCreatureRolls = null
          c.log.unshift({ text: `${creatureDef.name} cannot strike back!`, cls: 'good' })
        }
        c.round += 1
        c.abilityUsed = false
        c.consumableUsed = false
      })
      if (lockId != null) {
        const timer = setTimeout(() => {
          set((s) => {
            if (s.matchId === lockMatchId && s.combat?.id === lockId) {
              s.combat.rolling = false
            }
          })
        }, 460)
        timer?.unref?.()
      }
    },

    combatFlee: () =>
      set((s) => {
        const c = s.combat
        if (!c || c.over || c.rolling || c.pvpHandoff) return
        const p = s.players[c.playerIdx]
        c.over = true
        c.fled = true
        if (c.pvp) {
          addLog(s, `${p.name} withdraws from the duel with ${s.players[c.targetIdx].name}.`, 'bad')
          return
        }
        const creatureDef = CREATURES[c.defId]
        if (c.boss) {
          const restored = regenerateBoss(s, c, p.faction)
          c.log.unshift({ text: `Undying regeneration restores ${restored} health.`, cls: 'bad' })
        }
        else if (s.creatures[c.regionId]) s.creatures[c.regionId].hp = c.hp
        addLog(s, `${p.name} flees from ${creatureDef.name}.`, 'bad')
      }),

    closeCombat: () =>
      set((s) => {
        if (s.combat?.pvpHandoff) return
        s.combat = null
        if (s.winner) {
          s.screen = 'victory'
          return
        }
        // a fallen hero's turn ends immediately
        const activePlayer = currentPlayer(s)
        if (activePlayer?.dead) {
          const fromIdx = activePlayer.idx
          advanceTurn(s, fromIdx)
        }
      }),

    // ---------- turn flow ----------
    endTurn: (guard = null) =>
      set((s) => {
        const p = currentPlayer(s)
        if (!p) return
        const expectedPlayerIdx = typeof guard === 'number' ? guard : guard?.playerIdx
        const expectedTurnId = typeof guard === 'object' ? guard?.turnId : null
        if (
          s.combat || s.winner || hasPendingDecision(s) ||
          (expectedPlayerIdx != null && expectedPlayerIdx !== p.idx) ||
          (expectedTurnId != null && expectedTurnId !== s.turnId)
        ) return
        const eff = effStats(p)
        p.energy = Math.min(eff.maxEnergy, p.energy + GAME.ENERGY_REGEN_PER_TURN + eff.energyRegen)
        advanceTurn(s, p.idx)
      }),
    })),
    {
      name: 'warbound-realms-save',
      version: 6,
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? window.localStorage : noopStorage
      ),
      migrate: (persistedState) => {
        const state = persistedState || {}
        const seed = normalizeSeed(state.seed ?? state.rngState ?? DEFAULT_SEED)
        const combatSeq = Math.max(
          Number.isInteger(state.combatSeq) ? state.combatSeq : 0,
          Number.isInteger(state.combat?.id) ? state.combat.id : state.combat ? 1 : 0
        )
        const migrated = {
          ...state,
          saveVersion: 6,
          matchId: Number.isInteger(state.matchId) ? state.matchId : 0,
          seed,
          rngState: normalizeSeed(state.rngState ?? seed),
          setupError: null,
          turnId: Number.isInteger(state.turnId) ? state.turnId : 0,
          initiativeFaction: state.initiativeFaction === 'dominion' ? 'dominion' : 'accord',
          roundStarterFaction: ['accord', 'dominion'].includes(state.roundStarterFaction)
            ? state.roundStarterFaction
            : null,
          eventChoice: state.eventChoice || null,
          eventObjective: state.eventObjective || null,
          bossDamageByFaction: {
            accord: Number(state.bossDamageByFaction?.accord) || 0,
            dominion: Number(state.bossDamageByFaction?.dominion) || 0,
          },
          purchaseRequestIdsThisTurn: Array.isArray(state.purchaseRequestIdsThisTurn)
            ? state.purchaseRequestIdsThisTurn
            : [],
          questSwapUsed: !!state.questSwapUsed,
          handoffPending: false,
          tutorialStep: null,
          tutorialCompleted: true,
          mobilePanel: null,
          inspectedRegionId: REGIONS[state.inspectedRegionId] ? state.inspectedRegionId : null,
          combatSeq,
          combat: state.combat
            ? {
                abilityUsed: false,
                consumableUsed: false,
                pvpDefensePending: !!state.combat.pvp,
                ...state.combat,
                id: Number.isInteger(state.combat.id) ? state.combat.id : combatSeq,
                rolling: false,
              }
            : null,
        }
        if (migrated.players?.length) {
          const validation = validateRoster(migrated.players)
          if (!validation.valid) {
            retireLegacyMatch(migrated, validation.error)
          } else {
            migrated.players = migrated.players.map(normalizeLegacyPlayer)
            const playerIndices = new Set(migrated.players.map((player) => player.idx))
            const validTurnOrder =
              Array.isArray(migrated.turnOrder) &&
              migrated.turnOrder.length === migrated.players.length &&
              new Set(migrated.turnOrder).size === migrated.players.length &&
              migrated.turnOrder.every((idx) => playerIndices.has(idx))
            if (!validTurnOrder) {
              migrated.turnOrder = buildTurnOrder(
                migrated.players,
                migrated.roundStarterFaction || migrated.initiativeFaction,
                Math.floor(Math.max(0, (Number(migrated.round) || 1) - 1) / 2),
              )
            }
            migrated.turnPos = Number.isInteger(migrated.turnPos) &&
              migrated.turnPos >= 0 && migrated.turnPos < migrated.turnOrder.length
              ? migrated.turnPos
              : 0

            if (migrated.combat) {
              const combat = migrated.combat
              const attacker = migrated.players[combat.playerIdx]
              const isPvp = !!combat.pvp || Number.isInteger(combat.targetIdx)
              const defender = isPvp ? migrated.players[combat.targetIdx] : null
              const creature = isPvp ? null : CREATURES[combat.defId]
              if (!attacker || (isPvp && (!defender || defender.idx === attacker.idx)) || (!isPvp && !creature)) {
                migrated.combat = null
              } else {
                combat.pvp = isPvp
                combat.regionId = REGIONS[combat.regionId] ? combat.regionId : attacker.region
                combat.round = Math.max(1, Number.isInteger(combat.round) ? combat.round : 1)
                if (isPvp) {
                  combat.pvpDefensePending = typeof combat.pvpDefensePending === 'boolean'
                    ? combat.pvpDefensePending && !combat.over
                    : !combat.over
                  if (combat.pvpHandoff === 'choosing') combat.pvpHandoff = 'defender'
                  else if (!['defender', 'attacker', null].includes(combat.pvpHandoff)) {
                    combat.pvpHandoff = combat.pvpDefensePending
                      ? 'defender'
                      : !combat.over || combat.defenderWithdrew ? 'attacker' : null
                  }
                } else {
                  combat.pvpDefensePending = false
                  combat.pvpHandoff = null
                  combat.defenderResponse = null
                  combat.maxHp = Number.isFinite(combat.maxHp) ? combat.maxHp : creature.hp
                  combat.hp = Math.min(combat.maxHp, Math.max(0, Number.isFinite(combat.hp) ? combat.hp : combat.maxHp))
                }
              }
            }
          }
        }
        return migrated
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState || {}),
        combat: persistedState?.combat
          ? { ...persistedState.combat, rolling: false }
          : null,
      }),
      // transient UI state is not worth persisting across sessions
      partialize: (s) => {
        const transient = new Set(['toasts', 'shopOpen', 'rulesOpen', 'sheetOpen', 'mobilePanel'])
        const rest = Object.fromEntries(
          Object.entries(s).filter(([key]) => !transient.has(key))
        )
        return {
          ...rest,
          combat: rest.combat ? { ...rest.combat, rolling: false } : null,
        }
      },
    }
  )
)

// ---------- read-only selectors ----------
export const selCurrentPlayer = (s) =>
  s.screen === 'game' && s.players.length ? s.players[s.turnOrder[s.turnPos]] : null

export const selEventMod = (s) => EVENTS[s.eventId]?.mod || {}

export const selBlockingModal = (s) => blockingModal(s)

export const selHasSavedGame = (s) =>
  s.players.length > 0 && !s.winner && s.round > 0

export const reachableRegions = (s) => {
  const p = selCurrentPlayer(s)
  if (
    !p || p.dead || s.movesLeft <= 0 || s.combat || s.winner ||
    s.handoffPending || s.eventChoice
  ) return []
  return REGIONS[p.region].adjacent.filter((rid) => {
    const dest = REGIONS[rid]
    if (dest.capital && dest.capital !== p.faction) return false
    if (rid === 'blackspire' && !s.bossSpawned) return false
    return true
  })
}
