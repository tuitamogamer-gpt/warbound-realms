import { useState } from 'react'
import { HERO_LIST, heroArt } from '../data/heroes'
import { ABILITIES } from '../data/abilities'
import { FACTIONS, GAME } from '../data/constants'
import { useGame } from '../game/store'
import Rules from './Rules'

export default function MainMenu() {
  const startGame = useGame((s) => s.startGame)
  const resumeGame = useGame((s) => s.resumeGame)
  const savedPlayers = useGame((s) => s.players)
  const winner = useGame((s) => s.winner)
  const setupError = useGame((s) => s.setupError)
  const [count, setCount] = useState(2)
  const [roster, setRoster] = useState([
    { name: '', heroId: 'aldric' },
    { name: '', heroId: 'grosh' },
  ])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [showSetup, setShowSetup] = useState(savedPlayers.length === 0 || !!winner)

  const setCountAndRoster = (n) => {
    setCount(n)
    setRoster((r) => {
      const next = [...r]
      const defaults = ['aldric', 'grosh', 'elowen', 'zyra']
      while (next.length < n) next.push({ name: '', heroId: defaults[next.length] })
      return next.slice(0, n)
    })
  }

  const pickHero = (playerIdx, heroId) => {
    setRoster((r) => r.map((p, i) => (i === playerIdx ? { ...p, heroId } : p)))
  }
  const setName = (playerIdx, name) => {
    setRoster((r) => r.map((p, i) => (i === playerIdx ? { ...p, name } : p)))
  }

  const taken = (heroId, exceptIdx) =>
    roster.some((p, i) => i !== exceptIdx && p.heroId === heroId)

  const factions = roster.map((p) => HERO_LIST.find((h) => h.id === p.heroId).faction)
  const accordCount = factions.filter((f) => f === 'accord').length
  const dominionCount = factions.filter((f) => f === 'dominion').length
  const balanced = accordCount === dominionCount && accordCount === count / 2
  const valid = balanced && new Set(roster.map((p) => p.heroId)).size === roster.length
  const hasSavedWar = savedPlayers.length > 0 && !winner

  const continueWar = () => {
    if (resumeGame) resumeGame()
    else useGame.setState({ screen: 'game' })
  }
  const beginWar = () => {
    if (hasSavedWar && !window.confirm('Replace the current saved war with this new one?')) return
    startGame(roster)
  }

  return (
    <div className="menu" style={{ backgroundImage: 'url(/assets/ui/title.webp)' }}>
      <div className="menu-scrim">
        <h1 className="menu-title">Warbound Realms</h1>
        <p className="menu-sub">A 3D fantasy adventure board game · balanced 2 or 4 player hotseat</p>

        <div className="menu-panel">
          {hasSavedWar && !showSetup && (
            <div className="menu-resume" aria-label="Saved war">
              <div>
                <h2>Your war is waiting</h2>
                <p>Round {useGame.getState().round} · {savedPlayers.map((p) => p.name).join(' · ')}</p>
              </div>
              <div className="menu-resume-actions">
                <button className="btn-primary" onClick={continueWar}>Continue War</button>
                <button className="btn-secondary" onClick={() => setShowSetup(true)}>Start New War</button>
                <button className="chip chip-ghost" onClick={() => setRulesOpen(true)}>📖 How to play</button>
              </div>
            </div>
          )}

          {showSetup && (
            <>
          <div className="menu-row">
            <span className="menu-label">Players</span>
            {[2, 4].map((n) => (
              <button
                key={n}
                className={`chip ${count === n ? 'chip-on' : ''}`}
                onClick={() => setCountAndRoster(n)}
                aria-pressed={count === n}
              >
                {n} players
              </button>
            ))}
            <button className="chip chip-ghost" onClick={() => setRulesOpen(true)}>
              📖 How to play
            </button>
          </div>

          {roster.map((p, i) => {
            const hero = HERO_LIST.find((h) => h.id === p.heroId)
            const faction = FACTIONS[hero.faction]
            return (
              <div className="setup-player" key={i}>
                <div className="setup-head">
                  <input
                    className="name-input"
                    placeholder={`Player ${i + 1} name`}
                    value={p.name}
                    maxLength={16}
                    onChange={(e) => setName(i, e.target.value)}
                  />
                  <span className="faction-tag" style={{ color: faction.color }}>
                    {faction.name}
                  </span>
                </div>
                <div className="hero-picker">
                  {HERO_LIST.map((h) => (
                    <button
                      key={h.id}
                      className={`hero-card ${p.heroId === h.id ? 'hero-on' : ''} ${taken(h.id, i) ? 'hero-taken' : ''}`}
                      style={{ '--fc': FACTIONS[h.faction].color }}
                      disabled={taken(h.id, i)}
                      onClick={() => pickHero(i, h.id)}
                      aria-pressed={p.heroId === h.id}
                      title={`${h.name} — ${h.title}\n${ABILITIES[h.signature].name}: ${ABILITIES[h.signature].desc}`}
                    >
                      <img src={heroArt(h.id)} alt={h.name} />
                      <span className="hero-name">{h.name.replace(/^Ser /, '').split(' ')[0]}</span>
                      <span className="hero-class">{h.title.split(' ').pop()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {!balanced && (
            <p className="menu-warn" role="status">
              Teams must be even: choose {count / 2} Radiant Accord and {count / 2} Emberclaw Dominion hero{count === 4 ? 'es' : ''}.
            </p>
          )}
          {setupError && <p className="menu-warn" role="alert">{setupError}</p>}
          <button className="btn-primary" disabled={!valid} onClick={beginWar}>
            ⚔ Begin the War
          </button>
          {hasSavedWar && (
            <button className="btn-secondary" onClick={() => setShowSetup(false)}>Keep Current War</button>
          )}
            </>
          )}
        </div>
        <p className="menu-credit">
          Slay monsters, finish quests, level up — then kill Vhalrax the Undying before round {GAME.MAX_ROUNDS} ends.
        </p>
      </div>
      {rulesOpen && <Rules onClose={() => setRulesOpen(false)} />}
    </div>
  )
}
