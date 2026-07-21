import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { selBlockingModal, useGame } from './game/store'
import { CREATURES } from './data/creatures'
import { effStats } from './game/rules'

// dev-only handle for driving the store from the console / tests
if (import.meta.env.DEV) window.__game = useGame

// Stable, compact hooks for browser automation and non-visual game inspection.
// They deliberately expose state descriptions, never Zustand action functions.
window.render_game_to_text = () => {
  const state = useGame.getState()
  const activePlayerIdx = state.turnOrder?.[state.turnPos]
  const activePlayer = state.players?.[activePlayerIdx] ?? null
  const activeStats = activePlayer ? effStats(activePlayer) : null
  const combatCreature = state.combat && !state.combat.pvp
    ? CREATURES[state.combat.defId]
    : null
  return JSON.stringify({
    screen: state.screen,
    round: state.round,
    activePlayerIdx,
    activePlayer: activePlayer && {
      name: activePlayer.name,
      faction: activePlayer.faction,
      region: activePlayer.region,
      hp: activePlayer.hp,
      energy: activePlayer.energy,
      gold: activePlayer.gold,
      vp: activePlayer.vp,
      quests: activePlayer.quests,
      dicePools: {
        blue: activeStats.rangedDice,
        red: activeStats.meleeDice,
        green: activeStats.defenseDice,
      },
      armor: activeStats.armor,
    },
    movesLeft: state.movesLeft,
    actionUsed: state.actionUsed,
    handoffPending: Boolean(state.handoffPending),
    inspectedRegionId: state.inspectedRegionId ?? null,
    eventId: state.eventId,
    combat: state.combat && {
      type: state.combat.pvp ? 'pvp' : state.combat.boss ? 'boss' : 'creature',
      round: state.combat.round,
      regionId: state.combat.regionId,
      creatureId: state.combat.defId ?? null,
      pvpDefensePending: Boolean(state.combat.pvpDefensePending),
      heroRolls: {
        blue: state.combat.lastRangedRolls,
        red: state.combat.lastHeroRolls,
        green: state.combat.lastDefenseRolls,
      },
      creature: combatCreature && {
        hp: state.combat.hp,
        maxHp: state.combat.maxHp,
        threat: combatCreature.threat,
        attack: combatCreature.attack,
        armor: combatCreature.armor,
        provoked: state.combat.provoked || 0,
        livingMinions: (state.combat.minions || []).filter((minion) => minion.hp > 0).length,
        lastAttack: state.combat.lastEnemyAttack,
      },
    },
    modal: selBlockingModal(state),
    scores: ['accord', 'dominion'].reduce((scores, faction) => {
      scores[faction] = state.players
        .filter((player) => player.faction === faction)
        .reduce((total, player) => total + player.vp, 0)
      return scores
    }, {}),
  })
}

window.advanceTime = (milliseconds = 16) => new Promise((resolve) => {
  window.setTimeout(() => window.requestAnimationFrame(resolve), Math.max(0, milliseconds))
})

// NOTE: StrictMode is intentionally off — react-three-fiber's renderer does not
// survive StrictMode's double-mount in this React 19 setup (canvas never initializes).
createRoot(document.getElementById('root')).render(<App />)
