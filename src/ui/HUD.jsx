import { useState, useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGame, selCurrentPlayer, selEventMod, selBlockingModal, reachableRegions } from '../game/store'
import { REGIONS, regionArt } from '../data/regions'
import { CREATURES } from '../data/creatures'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt, isCombatOnlyConsumable } from '../data/items'
import { EVENTS, eventArt } from '../data/events'
import { FACTIONS, GAME } from '../data/constants'
import { effStats, xpForNextLevel } from '../game/rules'
import { QUESTS } from '../data/quests'
import { TALENTS } from '../data/talents'
import { ABILITIES, abilityArt, maxAbilitySlots } from '../data/abilities'
import { sfx, isMuted, setMuted } from '../game/sfx'
import CamControls from './CamControls'
import DicePools from './DicePools'
import ModalShell from './ModalShell'

function Bar({ value, max, cls }) {
  return (
    <div
      className={`bar ${cls}`}
      role="progressbar"
      aria-label={cls.includes('hp') ? 'Health' : cls.includes('en') ? 'Energy' : 'Progress'}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="bar-fill" style={{ width: `${Math.max(0, (value / max) * 100)}%` }} />
      <span className="bar-text">{value}/{max}</span>
    </div>
  )
}

function HeroPanel({ player }) {
  const consumeItem = useGame((s) => s.useConsumable)
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
      <DicePools
        className="hud-dice-pools"
        ranged={eff.rangedDice}
        melee={eff.meleeDice}
        guard={eff.defenseDice}
      />
      <div className="stat-row hero-secondary-stats">
        <span title="Flat armor">🪨 {eff.armor}</span>
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
              onClick={() => consumeItem(i)}
              disabled={
                (isCombatOnlyConsumable(id) && !inCombat) ||
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

function QuestPanel({ player, compact = false }) {
  const abandonQuest = useGame((s) => s.abandonQuest)
  const rerollQuest = useGame((s) => s.rerollQuest)
  const questSwapUsed = useGame((s) => s.questSwapUsed)
  const region = REGIONS[player.region]
  return (
    <div className={`panel quest-panel ${compact ? 'quest-panel-compact' : ''}`}>
      <div className="panel-title">Quests</div>
      <EventObjective />
      {!player.quests.length && <p className="empty-note">No active contracts.</p>}
      {player.quests.map((qid) => {
        const q = QUESTS.find((x) => x.id === qid)
        if (!q) return null
        return (
          <div className="quest-card" key={qid}>
            <div className="quest-name">{q.name}</div>
            <div className="quest-text">{q.text}</div>
            <div className="quest-reward">+{q.reward.xp} XP · +{q.reward.gold} 💰 · +{q.reward.vp} 🏆</div>
            {region?.town && (abandonQuest || rerollQuest) && (
              <div className="quest-tools">
                {rerollQuest && (
                  <button className="chip" disabled={questSwapUsed || player.gold < GAME.QUEST_REROLL_COST} onClick={() => rerollQuest(qid)}>
                    ↻ Reroll ({GAME.QUEST_REROLL_COST}g)
                  </button>
                )}
                {abandonQuest && <button className="chip chip-ghost" disabled={questSwapUsed} onClick={() => abandonQuest(qid)}>Abandon</button>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventObjective() {
  const objective = useGame((s) => s.eventObjective)
  if (!objective) return null
  const destination = REGIONS[objective.region]?.name || objective.region
  return (
    <div className={`event-objective ${objective.claimedBy != null ? 'claimed' : ''}`}>
      <b>✦ Round objective</b>
      <span>{objective.text || `Reach ${destination}.`}</span>
      <small>
        {objective.claimedBy != null
          ? `Claimed by ${useGame.getState().players[objective.claimedBy]?.name || 'a hero'}`
          : `Target: ${destination} · +${objective.reward?.vp || 0} VP`}
      </small>
    </div>
  )
}

function LogPanel({ compact = false }) {
  const log = useGame((s) => s.log)
  return (
    <div className={`panel log-panel ${compact ? 'log-panel-compact' : ''}`}>
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
  const roundStarterFaction = useGame((s) => s.roundStarterFaction)
  const [muted, setMutedState] = useState(isMuted())
  const ev = EVENTS[eventId]
  const vp = (f) => players.filter((p) => p.faction === f).reduce((n, p) => n + p.vp, 0)

  return (
    <header className="topbar" aria-label="Game status">
      <div className="topbar-left">
        <span className="round-chip" title={roundStarterFaction ? `${FACTIONS[roundStarterFaction]?.name} has initiative` : ''}>
          <span className="desktop-only">Round </span>{round}/{GAME.MAX_ROUNDS}{roundStarterFaction ? ` · ${roundStarterFaction === 'accord' ? 'A' : 'D'}↥` : ''}
        </span>
        {ev && (
          <span className="event-chip" title={ev.desc}>
            <img src={eventArt(ev.id)} alt="" /> {ev.name}
          </span>
        )}
      </div>
      <div className="topbar-title">Warbound Realms</div>
      <div className="topbar-right">
        <span className="vp-chip" style={{ color: FACTIONS.accord.color }}><span className="desktop-only">Accord </span><span className="mobile-only">A </span>{vp('accord')} 🏆</span>
        <span className="vp-chip" style={{ color: FACTIONS.dominion.color }}><span className="desktop-only">Dominion </span><span className="mobile-only">D </span>{vp('dominion')} 🏆</span>
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
          title="Save and return to main menu"
          onClick={() => {
            if (window.confirm('Save this war and return to the main menu?')) backToMenu()
          }}
          aria-label="Save and return to main menu"
        >
          ☰
        </button>
      </div>
    </header>
  )
}

function RegionInspector() {
  const regionId = useGame((s) => s.inspectedRegionId ?? s.selectedRegionId)
  const inspectRegion = useGame((s) => s.inspectRegion)
  const moveTo = useGame((s) => s.moveTo)
  const creatureSlot = useGame((s) => regionId ? s.creatures[regionId] : null)
  const bossSpawned = useGame((s) => s.bossSpawned)
  const bossHp = useGame((s) => s.bossHp)
  const bossProvoked = useGame((s) => s.bossProvoked ?? s.bossThreat ?? 0)
  const reachableRegionIds = useGame(useShallow(reachableRegions))
  const player = useGame(selCurrentPlayer)
  if (!regionId || !REGIONS[regionId] || !player) return null
  const region = REGIONS[regionId]
  const creature = creatureSlot
    ? CREATURES[creatureSlot.defId]
    : regionId === 'blackspire' && bossSpawned && bossHp > 0
      ? CREATURES.vhalrax
      : null
  const creatureProvoked = creatureSlot
    ? (creatureSlot.provoked ?? creatureSlot.threat ?? 0)
    : creature?.boss ? bossProvoked : 0
  const reachable = reachableRegionIds.includes(regionId)
  const trait = creature?.trait
  const traitName = typeof trait === 'string' ? trait : trait?.name
  const creatureThreat = creature?.threat ?? creature?.hitOn ?? 5
  const creatureAttack = creature?.attack ?? creature?.dice ?? 0
  const creatureArmor = creature?.armor ?? trait?.armor ?? 0
  const creatureProvokedAttack = creatureProvoked * (GAME.PROVOKED_ATTACK ?? 1)

  return (
    <aside className="region-inspector" aria-label={`Selected region: ${region.name}`}>
      <img src={regionArt(regionId)} alt="" />
      <div className="region-inspector-copy">
        <span className="region-inspector-kicker">{regionId === player.region ? 'Current region' : reachable ? 'Reachable' : 'Inspecting'}</span>
        <h2>{region.name}</h2>
        <p>{region.town ? 'Sanctuary town' : `Tier ${region.tier || '—'} hunting ground`}</p>
        {creature && (
          <span className="region-creature">
            {trait && typeof trait === 'object' ? trait.icon : '🐾'} {creature.name}{traitName ? ` · ${traitName}` : ''}
          </span>
        )}
        {creature && (
          <span className="region-creature-stats">
            ☠ {creatureThreat}+ · ⚔ {creatureAttack} · 🪨 {creatureArmor}
            {creatureProvoked > 0 && <b> · 😡 +{creatureProvokedAttack} Attack</b>}
          </span>
        )}
      </div>
      {reachable && <button className="region-move" onClick={() => moveTo(regionId)}>👢 Move Here</button>}
      {inspectRegion && <button className="region-inspector-close" aria-label="Close region inspector" onClick={() => inspectRegion(null)}>✕</button>}
    </aside>
  )
}

function ActionBar() {
  const player = useGame(selCurrentPlayer)
  const creatures = useGame((s) => s.creatures)
  const players = useGame((s) => s.players)
  const bossSpawned = useGame((s) => s.bossSpawned)
  const bossHp = useGame((s) => s.bossHp)
  const movesLeft = useGame((s) => s.movesLeft)
  const actionUsed = useGame((s) => s.actionUsed)
  const turnId = useGame((s) => s.turnId)
  const startCombat = useGame((s) => s.startCombat)
  const startPvp = useGame((s) => s.startPvp)
  const openShop = useGame((s) => s.openShop)
  const rest = useGame((s) => s.rest)
  const endTurn = useGame((s) => s.endTurn)
  const assistAlly = useGame((s) => s.assistAlly)
  const eventObjective = useGame((s) => s.eventObjective)
  const endLock = useRef(false)
  if (!player) return null
  const region = REGIONS[player.region]
  const creature = creatures[player.region]
  const creatureDef = creature ? CREATURES[creature.defId] : null
  const canFightBoss = player.region === 'blackspire' && bossSpawned && bossHp > 0
  const faction = FACTIONS[player.faction]
  const mod = selEventMod(useGame.getState())
  const enemiesHere = region.town
    ? []
    : players.filter(
        (pl) => pl.faction !== player.faction && !pl.dead && pl.region === player.region
      )
  const alliesHere = assistAlly
    ? players.filter((pl) => pl.idx !== player.idx && pl.faction === player.faction && !pl.dead && pl.region === player.region)
    : []
  const targets = player.quests.map((qid) => QUESTS.find((q) => q.id === qid)).filter(Boolean)
  const questTargetLabel = targets[0]
    ? targets[0].region
      ? REGIONS[targets[0].region]?.name
      : CREATURES[targets[0].creature]?.name
    : null
  const targetLabel = eventObjective && eventObjective.claimedBy == null
    ? REGIONS[eventObjective.region]?.name
    : questTargetLabel

  return (
    <div className="actionbar">
      <div className="turn-banner" style={{ '--fc': faction.color }}>
        <b>{player.name}</b>'s turn · {region.name} · {movesLeft} move{movesLeft === 1 ? '' : 's'} left
        {targetLabel && <span className="quest-target-chip">📜 {targetLabel}</span>}
      </div>
      <div className="action-buttons">
        {creature && (
          <button
            className="btn-action btn-fight"
            disabled={actionUsed}
            title={creatureDef?.trait ? `${creatureDef.name} · ${creatureDef.trait.name || creatureDef.trait}` : creatureDef?.name}
            onClick={() => {
              sfx.hit()
              startCombat(false)
            }}
          >
            ⚔ Fight{creatureDef?.trait ? ` · ${creatureDef.trait.icon || '◆'}` : ''}
          </button>
        )}
        {canFightBoss && (
          <button
            className="btn-action btn-boss"
            disabled={actionUsed}
            onClick={() => {
              sfx.boss()
              startCombat(true)
            }}
          >
            🐉 Challenge Vhalrax
          </button>
        )}
        {enemiesHere.map((t) => (
          <button
            key={t.idx}
            className="btn-action btn-duel"
            disabled={actionUsed}
            title={`Duel ${t.name} — win for +2 VP, +2 XP and their dropped gold`}
            onClick={() => {
              sfx.pvp()
              startPvp(t.idx)
            }}
          >
            🗡 Duel {t.name.replace(/^Ser /, '').split(' ')[0]}
          </button>
        ))}
        {alliesHere.map((ally) => (
          <button
            key={`ally-${ally.idx}`}
            className="btn-action btn-assist"
            disabled={actionUsed}
            onClick={() => assistAlly(ally.idx)}
          >
            🤝 Aid {ally.name.replace(/^Ser /, '').split(' ')[0]}
          </button>
        ))}
        {region.town && (
          <button
            className="btn-action"
            onClick={() => {
              sfx.click()
              openShop(true)
            }}
          >
            🛒 Shop{mod.shopDiscount ? ' (sale!)' : ''}
          </button>
        )}
        <button
          className="btn-action"
          disabled={actionUsed}
          onClick={() => {
            sfx.click()
            rest()
          }}
        >
          ⛺ Rest
        </button>
        <button
          className="btn-action btn-end"
          data-testid="end-turn"
          onClick={() => {
            if (endLock.current) return
            endLock.current = true
            sfx.click()
            endTurn({ playerIdx: player.idx, turnId })
            window.setTimeout(() => { endLock.current = false }, 500)
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
    <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
      {toasts.slice(-4).map((t) => (
        <button
          type="button"
          key={t.id}
          className={`toast toast-${t.cls}`}
          onClick={() => dismiss(t.id)}
          onAnimationEnd={(e) => {
            if (e.animationName === 'toastOut') dismiss(t.id)
          }}
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}

function MobileHeroStrip({ player }) {
  const openSheet = useGame((s) => s.openSheet)
  const hero = HEROES[player.heroId]
  const eff = effStats(player)
  return (
    <button
      className="mobile-hero-strip"
      style={{ '--fc': FACTIONS[player.faction].color }}
      onClick={() => openSheet(player.idx)}
      aria-label={`Open ${player.name}'s character sheet`}
    >
      <img src={heroArt(player.heroId)} alt="" />
      <span className="mobile-hero-copy">
        <b>{player.name}</b>
        <small>{hero.title} · Level {player.level}</small>
        <span className="mobile-mini-bars">
          <span className="mini-hp" style={{ '--fill': `${(player.hp / eff.maxHp) * 100}%` }}>❤️ {player.hp}/{eff.maxHp}</span>
          <span className="mini-en" style={{ '--fill': `${(player.energy / eff.maxEnergy) * 100}%` }}>⚡ {player.energy}/{eff.maxEnergy}</span>
        </span>
        <DicePools
          compact
          className="mobile-dice-pools"
          ranged={eff.rangedDice}
          melee={eff.meleeDice}
          guard={eff.defenseDice}
        />
      </span>
      <span className="mobile-hero-stats">🪨 {eff.armor}<br />💰 {player.gold}</span>
      <span className="mobile-hero-chevron" aria-hidden="true">⌃</span>
    </button>
  )
}

function MobileDock({ player }) {
  const active = useGame((s) => s.mobilePanel)
  const setActive = useGame((s) => s.openMobilePanel)
  const tabs = [
    { id: 'hero', icon: '🛡', label: 'Hero' },
    { id: 'quests', icon: '📜', label: 'Quests' },
    { id: 'log', icon: '☷', label: 'Log' },
    { id: 'more', icon: '•••', label: 'More' },
  ]

  return (
    <>
      <nav className="mobile-dock" aria-label="Game panels">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={active === tab.id ? 'active' : ''}
            aria-pressed={active === tab.id}
            aria-label={`Open ${tab.label}`}
            onClick={() => setActive(tab.id)}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      {active && (
        <ModalShell
          className="mobile-sheet"
          overlayClassName="mobile-sheet-overlay"
          ariaLabel={`${tabs.find((tab) => tab.id === active)?.label} panel`}
          onClose={() => setActive(null)}
          closeOnBackdrop
        >
          <div className="mobile-sheet-handle" aria-hidden="true" />
          <button className="sheet-close" aria-label="Close panel" onClick={() => setActive(null)}>✕</button>
          {active === 'hero' && <HeroPanel player={player} />}
          {active === 'quests' && <QuestPanel player={player} compact />}
          {active === 'log' && <LogPanel compact />}
          {active === 'more' && (
            <div className="panel camera-panel">
              <div className="panel-title">Camera & keyboard</div>
              <p className="camera-help">Drag to rotate · pinch or scroll to zoom · right-drag to pan.</p>
              <CamControls embedded />
              <dl className="key-guide">
                <div><dt>Q / E</dt><dd>Rotate</dd></div>
                <div><dt>W / S</dt><dd>Tilt</dd></div>
                <div><dt>+ / −</dt><dd>Zoom</dd></div>
                <div><dt>F / R</dt><dd>Hero / reset</dd></div>
              </dl>
            </div>
          )}
        </ModalShell>
      )}
    </>
  )
}

function HandoffScreen({ player }) {
  const handoffPending = useGame((s) => s.handoffPending ?? s.handoff ?? s.passDevice)
  const confirmHandoff = useGame((s) => s.confirmHandoff ?? s.dismissHandoff)
  if (!handoffPending || !player) return null

  const reveal = () => {
    if (confirmHandoff) confirmHandoff()
    else useGame.setState({ handoffPending: false, handoff: null, passDevice: false })
  }

  return (
    <ModalShell className="handoff-modal" overlayClassName="overlay-privacy" ariaLabel="Pass the device">
      <div className="handoff-icon" aria-hidden="true">✦</div>
      <h2>Pass to {player.name}</h2>
      <p>Hide the board from the next player, then let them reveal their turn.</p>
      <button className="btn-primary" data-autofocus onClick={reveal}>Reveal My Turn</button>
    </ModalShell>
  )
}

function Onboarding({ player }) {
  const round = useGame((s) => s.round)
  const eventReveal = useGame((s) => s.eventReveal)
  const combat = useGame((s) => s.combat)
  const step = useGame((s) => s.tutorialStep)
  const tutorialCompleted = useGame((s) => s.tutorialCompleted)
  const advanceTutorial = useGame((s) => s.advanceTutorial)
  const completeTutorial = useGame((s) => s.completeTutorial)
  if (!player || tutorialCompleted || step == null || round !== 1 || eventReveal || combat) return null

  const steps = [
    ['Read your turn', 'Your hero, health, resources and quest target stay close to the board. On a phone, open them from the dock below.'],
    ['Choose a route', 'Move along connected glowing regions. Hover with a mouse, or tap once to inspect before committing your move.'],
    ['Take one action', 'Fight, duel, aid an ally or rest, then end your turn. Town shops do not spend your action.'],
    ['Keep your view', 'Use the More panel for large camera buttons, or press F to focus your hero and R to reset the board.'],
  ]
  const safeStep = Math.min(step, steps.length - 1)
  const [title, text] = steps[safeStep]

  return (
    <aside className="tutorial-coach" aria-live="polite" aria-label={`Tutorial step ${safeStep + 1} of ${steps.length}`}>
      <div className="tutorial-count">First turn · {safeStep + 1}/{steps.length}</div>
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="tutorial-actions">
        <button className="chip chip-ghost" onClick={completeTutorial}>Skip</button>
        <button className="chip chip-on" onClick={() => safeStep === steps.length - 1 ? completeTutorial() : advanceTutorial()}>
          {safeStep === steps.length - 1 ? 'Got it' : 'Next'}
        </button>
      </div>
    </aside>
  )
}

function EventChoiceModal() {
  const choice = useGame((s) => s.eventChoice)
  const eventReveal = useGame((s) => s.eventReveal)
  const handoffPending = useGame((s) => s.handoffPending)
  const chooseEventOption = useGame((s) => s.chooseEventOption)
  if (!choice || eventReveal || handoffPending) return null
  const event = EVENTS[choice.eventId]
  if (!event) return null
  const options = event.choices?.filter((option) => choice.options.includes(option.id)) || []
  const player = useGame.getState().players[choice.playerIdx]
  return (
    <ModalShell className="event-choice-modal" overlayClassName="overlay-dark" ariaLabel={`${event.name} choice`}>
      <div className="event-round">Round decision</div>
      <h2>{event.name}</h2>
      <p className="event-desc">{player?.name}, {event.desc}</p>
      <div className="event-choice-options">
        {options.map((option) => (
          <button key={option.id} className="event-choice-card" onClick={() => chooseEventOption(option.id)}>
            <b>{option.name}</b>
            <span>{option.desc}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  )
}

export default function HUD() {
  const player = useGame(selCurrentPlayer)
  const openSheet = useGame((s) => s.openSheet)
  const handoffPending = useGame((s) => s.handoffPending)

  // 'C' toggles the character sheet for the active player
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return // never hijack copy/devtools shortcuts
      if (e.target.closest('input, textarea')) return
      if (e.key.toLowerCase() === 'c' && player) {
        const state = useGame.getState()
        if (state.sheetOpen != null) openSheet(null)
        else if (!selBlockingModal(state)) openSheet(player.idx)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, openSheet])

  if (!player) return null
  if (handoffPending) return <HandoffScreen player={player} />
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
      <RegionInspector />
      <MobileHeroStrip player={player} />
      <ActionBar />
      <MobileDock player={player} />
      <Onboarding player={player} />
      <EventChoiceModal />
      <Toasts />
    </>
  )
}
