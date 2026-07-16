import { useGame, selCurrentPlayer } from '../game/store'
import { talentsForLevel } from '../data/talents'
import { HEROES, heroArt } from '../data/heroes'
import { sfx } from '../game/sfx'

// Shown to the active player whenever they have an unspent talent choice.
export default function TalentModal() {
  const player = useGame(selCurrentPlayer)
  const combat = useGame((s) => s.combat)
  const eventReveal = useGame((s) => s.eventReveal)
  const sheetOpen = useGame((s) => s.sheetOpen)
  const celebrations = useGame((s) => s.celebrations)
  const questDraw = useGame((s) => s.questDraw)
  const chooseTalent = useGame((s) => s.chooseTalent)

  if (!player || combat || eventReveal || sheetOpen != null || celebrations.length || questDraw)
    return null
  const pending = player.pendingTalents || []
  if (!pending.length) return null

  const level = pending[0]
  const options = talentsForLevel(level)
  const hero = HEROES[player.heroId]

  return (
    <div className="overlay overlay-dark">
      <div className="modal talent-modal">
        <img className="talent-portrait" src={heroArt(player.heroId)} alt={hero.name} />
        <h2>Level {level} Talent</h2>
        <p className="talent-sub">{player.name}, choose how your legend grows:</p>
        <div className="talent-options">
          {options.map((t) => (
            <button
              key={t.id}
              className="talent-option"
              onClick={() => {
                sfx.levelup()
                chooseTalent(t.id)
              }}
            >
              <div className="talent-icon">{t.icon}</div>
              <div className="talent-name">{t.name}</div>
              <div className="talent-desc">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
