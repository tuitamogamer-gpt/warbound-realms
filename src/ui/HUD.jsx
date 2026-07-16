import { useGame, selCurrentPlayer, selEventMod } from '../game/store'
import { REGIONS } from '../data/regions'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt } from '../data/items'
import { EVENTS, eventArt } from '../data/events'
import { FACTIONS, GAME } from '../data/constants'
import { effStats, xpForNextLevel } from '../game/rules'
import { QUESTS } from '../data/quests'

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
  const useMend = useGame((s) => s.useMendOutOfCombat)
  const inCombat = useGame((s) => !!s.combat)
  const hero = HEROES[player.heroId]
  const eff = effStats(player)
  const faction = FACTIONS[player.faction]
  const nextXp = xpForNextLevel(player)

  return (
    <div className="panel hero-panel" style={{ '--fc': faction.color }}>
      <div className="hero-head">
        <img className="hero-portrait" src={heroArt(player.heroId)} alt={hero.name} />
        <div>
          <div className="hero-title">{player.name}</div>
          <div className="hero-subtitle">{player.name === hero.name ? hero.title : `${hero.name} · ${hero.title}`}</div>
          <div className="hero-level">Level {player.level}{nextXp ? ` · ${player.xp}/${nextXp} XP` : ' · MAX'}</div>
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
      <div className="ability-row" title={hero.ability.desc}>
        <b>{hero.ability.name}</b> ({hero.ability.cost}⚡) — {hero.ability.desc}
        {hero.ability.id === 'mend' && !inCombat && (
          <button
            className="chip"
            disabled={player.energy < hero.ability.cost || player.hp >= eff.maxHp}
            onClick={useMend}
          >
            Cast
          </button>
        )}
      </div>
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
        <button className="chip chip-ghost" onClick={() => openRules(true)}>📖</button>
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
            onClick={() => state.startCombat(false)}
          >
            ⚔ Fight
          </button>
        )}
        {canFightBoss && (
          <button
            className="btn-action btn-boss"
            disabled={state.actionUsed}
            onClick={() => state.startCombat(true)}
          >
            🐉 Challenge Vhalrax
          </button>
        )}
        {region.town && (
          <button className="btn-action" onClick={() => state.openShop(true)}>
            🛒 Shop{mod.shopDiscount ? ' (sale!)' : ''}
          </button>
        )}
        <button className="btn-action" disabled={state.actionUsed} onClick={state.rest}>
          ⛺ Rest
        </button>
        <button className="btn-action btn-end" onClick={state.endTurn}>
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
      <ActionBar />
      <Toasts />
    </>
  )
}
