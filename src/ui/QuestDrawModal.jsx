import { useGame } from '../game/store'
import { QUESTS, questArt } from '../data/quests'
import { sfx } from '../game/sfx'
import ModalShell from './ModalShell'

// The active player draws two quest cards and keeps one; the other returns
// to the bottom of the deck.
export default function QuestDrawModal() {
  const questDraw = useGame((s) => s.questDraw)
  const combat = useGame((s) => s.combat)
  const celebrations = useGame((s) => s.celebrations)
  const eventReveal = useGame((s) => s.eventReveal)
  const players = useGame((s) => s.players)
  const pickQuest = useGame((s) => s.pickQuest)

  if (!questDraw || combat || celebrations.length || eventReveal) return null
  const player = players[questDraw.playerIdx]

  return (
    <ModalShell className="quest-draw-modal" overlayClassName="overlay-dark" ariaLabel="Choose a new quest">
        <h2>📜 New Quest</h2>
        <p className="talent-sub">{player.name}, the quest board offers two contracts — choose one:</p>
        <div className="quest-draw-options">
          {questDraw.options.map((qid) => {
            const q = QUESTS.find((x) => x.id === qid)
            return (
              <button
                key={qid}
                className="quest-draw-card"
                onClick={() => {
                  sfx.click()
                  pickQuest(qid)
                }}
              >
                <img src={questArt(q)} alt="" />
                <div className="quest-draw-name">{q.name}</div>
                <div className="quest-draw-text">{q.text}</div>
                <div className="quest-reward">+{q.reward.xp} XP · +{q.reward.gold} 💰 · +{q.reward.vp} 🏆</div>
              </button>
            )
          })}
        </div>
    </ModalShell>
  )
}
