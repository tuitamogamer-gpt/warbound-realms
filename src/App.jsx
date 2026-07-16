import { Suspense, lazy } from 'react'
import { useGame } from './game/store'

// three.js + drei split into their own chunk so the menu paints immediately
const BoardScene = lazy(() => import('./three/BoardScene'))
import MainMenu from './ui/MainMenu'
import HUD from './ui/HUD'
import CombatModal from './ui/CombatModal'
import ShopModal from './ui/ShopModal'
import EventReveal from './ui/EventReveal'
import Victory from './ui/Victory'
import Rules from './ui/Rules'
import CharacterSheet from './ui/CharacterSheet'
import TalentModal from './ui/TalentModal'
import QuestDrawModal from './ui/QuestDrawModal'
import QuestCelebration from './ui/QuestCelebration'

function LoadingBoard() {
  return (
    <div className="board-loading">
      <div className="board-loading-text">Setting the table…</div>
    </div>
  )
}

export default function App() {
  const screen = useGame((s) => s.screen)
  const rulesOpen = useGame((s) => s.rulesOpen)
  const openRules = useGame((s) => s.openRules)

  if (screen === 'menu') return <MainMenu />
  if (screen === 'victory') return <Victory />

  return (
    <div className="game-root">
      <Suspense fallback={<LoadingBoard />}>
        <BoardScene />
      </Suspense>
      <HUD />
      <EventReveal />
      <CombatModal />
      <ShopModal />
      <CharacterSheet />
      <TalentModal />
      <QuestCelebration />
      <QuestDrawModal />
      {rulesOpen && <Rules onClose={() => openRules(false)} />}
    </div>
  )
}
