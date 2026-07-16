import { useGame } from '../game/store'
import { FACTIONS } from '../data/constants'

export default function Victory() {
  const winner = useGame((s) => s.winner)
  const backToMenu = useGame((s) => s.backToMenu)
  const players = useGame((s) => s.players)
  if (!winner) return null
  const faction = winner.faction ? FACTIONS[winner.faction] : null

  return (
    <div className="menu victory" style={{ backgroundImage: 'url(/assets/ui/title.jpg)' }}>
      <div className="menu-scrim">
        <h1 className="menu-title" style={faction ? { color: faction.color } : {}}>
          {faction ? `${faction.name} Victorious!` : 'Stalemate'}
        </h1>
        <p className="menu-sub">{winner.reason}</p>
        <div className="menu-panel score-panel">
          {players.map((p) => (
            <div className="score-row" key={p.idx} style={{ '--fc': FACTIONS[p.faction].color }}>
              <span className="score-name">{p.name}</span>
              <span>Lv {p.level}</span>
              <span>🏆 {p.vp} VP</span>
              <span>💰 {p.gold}</span>
              <span>⚔ {p.kills} kills</span>
              <span>🗡 {p.pvpWins || 0} duels</span>
              <span>📜 {p.completed.length} quests</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={backToMenu}>Play Again</button>
      </div>
    </div>
  )
}
