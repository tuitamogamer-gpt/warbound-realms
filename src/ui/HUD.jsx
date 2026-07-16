import { useState, useEffect } from 'react'
import { useGame, selCurrentPlayer, selEventMod } from '../game/store'
import { REGIONS } from '../data/regions'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt } from '../data/items'
import { EVENTS, eventArt } from '../data/events'
import { FACTIONS, GAME } from '../data/constants'
import { effStats, xpForNextLevel } from '../game/rules'
import { QUESTS } from '../data/quests'
import { TALENTS } from '../data/talents'
import { ABILITIES, abilityArt, maxAbilitySlots } from '../data/abilities'
import { sfx, isMuted, setMuted } from '../game/sfx'
import CamControls from './CamControls'

function Bar({ value, max, cls }) {
  return (
    <div className={`bar ${cls}`}>
      <div className="bar-fill" style={{ width: `${Math.max(0, (value / max) * 100)}%` }} />
      <span className="bar-text">{value}/{max}</span>
    </div>
  )
}

function HeroPanel({ player }) {
  const useConsumable = useGame((s) => s.useConsumable)
  const castAnytime = useGame((s) => s.castAnytime)
  const openSheet = useGame((s) => s.openSheet)
  const inCombat = useGame((s) => !!s.combat)
  const hero = HEROES[player.heroId]
  const eff = effStats(player)
  const faction = FACTIONS[player.faction]
  const nextXp = xpForNextLevel(player)

  return (
    <div className="panel hero-panel" style={{ '--fc': faction.color }}>
      <div className="hero-head">
        <button
          className="hero-portrait-btn"
          title="Open character sheet (C)"
          onClick={() => {
            sfx.click()
            openSheet(player.idx)
          }}
        >
          <img className="hero-portrait" src={heroArt(player.heroId)} alt={hero.name} />
        </button>
        <div>
          <div className="hero-title">{player.name}</div>
          <div className="hero-subtitle">{player.name === hero.name ? hero.title : `${hero.name} · ${hero.title}`}</div>
          <div className="hero-level">Level {player.level}{nextXp ? ` · ${player.xp}/${nextXp} XP` : ' · MAX'}</div>
          <div className="hero-talents">
            {(player.talents || []).map((tid) => (
              <span key={tid} title={`${TALENTS[tid].name} — ${TALENTS[tid].desc}`}>{TALENTS[tid].icon}</span>
            ))}
          </div>
        </div>
      </div>
      <Bar value={player.hp} max={eff.maxHp} cls="bar-hp" />
      <Bar value={player.energy} max={eff.maxEnergy} cls="bar-en" />
      <div className="stat-row">
        <span title="Attack dice">🎲 {eff.dice}</span>
        <span title="Armor">🛡 {eff.armor}</span>
        <span title="Movement">👣 {eff.move}</span>
        <span title="Gold">💰 {player.gold}</span>
        <span title="Victory points">🏆 {player.vp} VP</span>
      </div>
      <div className="ability-strip">
        {(player.abilities || []).map((aid) => {
          const ab = ABILITIES[aid]
          const canCast =
            ab.anytime && !inCombat && player.energy >= ab.energy && player.hp < eff.maxHp
          return (
            <div
              className={`ability-chip ${ab.type === 'passive' ? 'ability-passive' : ''}`}
              key={aid}
              title={`${ab.name}${ab.type === 'active' ? ` (${ab.energy}⚡)` : ' (passive)'} — ${ab.desc}`}
            >
              <img src={abilityArt(aid)} alt={ab.name} />
              {ab.anytime && !inCombat && (
                <button
                  className="ability-cast"
                  disabled={!canCast}
                  onClick={() => {
                    sfx.levelup()
                    castAnytime(aid)
                  }}
                >
                  Cast
                </button>
              )}
            </div>
          )
        })}
        {player.abilities.length < maxAbilitySlots(player.level) && (
          <div className="ability-chip ability-empty" title="Free ability slot — train at a town!">
            ＋
          </div>
        )}
      </div>
      <button
        className="chip chip-sheet"
        onClick={() => {
          sfx.click()
          openSheet(player.idx)
        }}
      >
        📜 Character Sheet <kbd>C</kbd>
      </button>
      {(player.items.length > 0 || player.consumables.length > 0) && (
        <div className="item-row">
          {player.items.map((id) => (
            <img key={id} className="item-icon" src={itemArt(id)} alt={ITEMS[id].name} title={`${ITEMS[id].name} — ${ITEMS[id].desc}`} />
          ))}
          {player.consumables.map((id, i) => (
            <button
              key={`${id}-${i}`}
              className="item-icon item-consumable"
              title={`${ITEMS[id].name} — ${ITEMS[id].desc} (click to use)`}
              onClick={() => useConsumable(i)}
              disabled={
                (ITEMS[id].effects.combatDice && !inCombat) ||
                (ITEMS[id].effects.heal && player.hp >= eff.maxHp)
              }
            >
              <img src={itemArt(id)} alt={ITEMS[id].name} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestPanel({ player }) {
  return (
    <div className="panel quest-panel">
      <div className="panel-title">Quests</div>
      {player.quests.map((qid) => {
        const q = QUESTS.find((x) => x.id === qid)
        return (
          <div className="quest-card" key={qid}>
            <div className="quest-name">{q.name}</div>
            <div className="quest-text">{q.text}</div>
            <div className="quest-reward">+{q.reward.xp} XP · +{q.reward.gold} 💰 · +{q.reward.vp} 🏆</div>
          </div>
        )
      })}
    </div>
  )
}

function LogPanel() {
  const log = useGame((s) => s.log)
  return (
    <div className="panel log-panel">
      <div className="panel-title">Chronicle</div>
      <div className="log-list">
        {log.map((l) => (
          <div key={l.id} className={`log-line log-${l.cls}`}>{l.text}</div>
        ))}
      </div>
    </div>
  )
}

function TopBar() {
  const round = useGame((s) => s.round)
  const eventId = useGame((s) => s.eventId)
  const players = useGame((s) => s.players)
  const bossSpawned = useGame((s) => s.bossSpawned)
  const bossHp = useGame((s) => s.bossHp)
  const openRules = useGame((s) => s.openRules)
  const backToMenu = useGame((s) => s.backToMenu)
  const [muted, setMutedState] = useState(isMuted())
  const ev = EVENTS[eventId]
  const vp = (f) => players.filter((p) => p.faction === f).reduce((n, p) => n + p.vp, 0)

  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="round-chip">Round {round}/{GAME.MAX_ROUNDS}</span>
        {ev && (
          <span className="event-chip" title={ev.desc}>
            <img src={eventArt(ev.id)} alt="" /> {ev.name}
          </span>
        )}
      </div>
      <div className="topbar-title">Warbound Realms</div>
      <div className="topbar-right">
        <span className="vp-chip" style={{ color: FACTIONS.accord.color }}>Accord {vp('accord')} 🏆</span>
        <span className="vp-chip" style={{ color: FACTIONS.dominion.color }}>Dominion {vp('dominion')} 🏆</span>
        {bossSpawned && bossHp > 0 && <span className="boss-chip">🐉 Vhalrax {bossHp}/25</span>}
        <button className="chip chip-ghost" title="How to play" onClick={() => openRules(true)}>📖</button>
        <button
          className="chip chip-ghost"
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
          onClick={() => {
            setMuted(!muted)
            setMutedState(!muted)
            if (muted) sfx.click()
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button
          className="chip chip-ghost"
          title="Quit to main menu"
          onClick={() => {
            if (window.confirm('Quit to the main menu? The current war will be abandoned.')) backToMenu()
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function ActionBar() {
  const state = useGame()
  const player = selCurrentPlayer(state)
  if (!player) return null
  const region = REGIONS[player.region]
  const creature = state.creatures[player.region]
  const canFightBoss = player.region === 'blackspire' && state.bossSpawned && state.bossHp > 0
  const faction = FACTIONS[player.faction]
  const mod = selEventMod(state)
  const enemiesHere = region.town
    ? []
    : state.players.filter(
        (pl) => pl.faction !== player.faction && !pl.dead && pl.region === player.region
      )

  return (
    <div className="actionbar">
      <div className="turn-banner" style={{ '--fc': faction.color }}>
        <b>{player.name}</b>'s turn · {region.name} · moves left: {state.movesLeft}
      </div>
      <div className="action-buttons">
        {creature && (
          <button
            className="btn-action btn-fight"
            disabled={state.actionUsed}
            onClick={() => {
              sfx.hit()
              state.startCombat(false)
            }}
          >
            ⚔ Fight
          </button>
        )}
        {canFightBoss && (
          <button
            className="btn-action btn-boss"
            disabled={state.actionUsed}
            onClick={() => {
              sfx.boss()
              state.startCombat(true)
            }}
          >
            🐉 Challenge Vhalrax
          </button>
        )}
        {enemiesHere.map((t) => (
          <button
            key={t.idx}
            className="btn-action btn-duel"
            disabled={state.actionUsed}
            title={`Duel ${t.name} — win for +2 VP, +2 XP and their dropped gold`}
            onClick={() => {
              sfx.pvp()
              state.startPvp(t.idx)
            }}
          >
            🗡 Duel {t.name.replace(/^Ser /, '').split(' ')[0]}
          </button>
        ))}
        {region.town && (
          <button
            className="btn-action"
            onClick={() => {
              sfx.click()
              state.openShop(true)
            }}
          >
            🛒 Shop{mod.shopDiscount ? ' (sale!)' : ''}
          </button>
        )}
        <button
          className="btn-action"
          disabled={state.actionUsed}
          onClick={() => {
            sfx.click()
            state.rest()
          }}
        >
          ⛺ Rest
        </button>
        <button
          className="btn-action btn-end"
          onClick={() => {
            sfx.click()
            state.endTurn()
          }}
        >
          ✅ End Turn
        </button>
      </div>
    </div>
  )
}

function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const dismiss = useGame((s) => s.dismissToast)
  return (
    <div className="toasts">
      {toasts.slice(-4).map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.cls}`}
          onClick={() => dismiss(t.id)}
          onAnimationEnd={(e) => {
            if (e.animationName === 'toastOut') dismiss(t.id)
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}

export default function HUD() {
  const state = useGame()
  const player = selCurrentPlayer(state)
  const openSheet = useGame((s) => s.openSheet)

  // 'C' toggles the character sheet for the active player
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return // never hijack copy/devtools shortcuts
      if (e.target.closest('input, textarea')) return
      if (e.key.toLowerCase() === 'c' && player) {
        openSheet(useGame.getState().sheetOpen == null ? player.idx : null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, openSheet])

  if (!player) return null
  return (
    <>
      <TopBar />
      <div className="side-left">
        <HeroPanel player={player} />
      </div>
      <div className="side-right">
        <QuestPanel player={player} />
        <LogPanel />
      </div>
      <CamControls />
      <ActionBar />
      <Toasts />
    </>
  )
}
