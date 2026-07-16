import { useEffect } from 'react'
import { useGame } from '../game/store'
import { QUESTS, questArt } from '../data/quests'
import { sfx } from '../game/sfx'

// Fanfare shown when a quest is completed, before the next quest draw.
export default function QuestCelebration() {
  const celebrations = useGame((s) => s.celebrations)
  const combat = useGame((s) => s.combat)
  const dismiss = useGame((s) => s.dismissCelebration)
  const current = celebrations[0]

  useEffect(() => {
    if (current && !combat) sfx.quest()
  }, [current?.questId, !!combat]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current || combat) return null
  const q = QUESTS.find((x) => x.id === current.questId)
  if (!q) return null

  return (
    <div className="overlay" onClick={dismiss}>
      <div className="modal quest-celebration" onClick={(e) => e.stopPropagation()}>
        <div className="celebration-banner">Quest Complete!</div>
        <img className="celebration-art" src={questArt(q)} alt="" />
        <h2>{q.name}</h2>
        <p className="talent-sub">{current.playerName} — {q.text}</p>
        <div className="celebration-rewards">
          <span>+{q.reward.xp} XP</span>
          <span>+{q.reward.gold} 💰</span>
          <span>+{q.reward.vp} 🏆</span>
        </div>
        <button className="btn-primary" onClick={dismiss}>Claim Reward</button>
      </div>
    </div>
  )
}
