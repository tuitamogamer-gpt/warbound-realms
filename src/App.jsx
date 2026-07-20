import { Component, Suspense, lazy, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { REGIONS } from './data/regions'
import { reachableRegions, useGame } from './game/store'

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

class BoardErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('The 3D board failed to render.', error, info)
  }

  render() {
    if (this.state.error) {
      return <BoardFallback reason="The enchanted table could not be drawn." onRetry={this.props.onRetry} />
    }
    return this.props.children
  }
}

function canRenderWebGL() {
  try {
    const canvas = document.createElement('canvas')
    if (!window.WebGLRenderingContext) return false
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(context)
  } catch {
    return false
  }
}

// The fallback is intentionally playable: it doubles as a keyboard and
// screen-reader route through the map when WebGL is unavailable.
function BoardFallback({ reason, onRetry }) {
  const players = useGame((s) => s.players)
  const turnOrder = useGame((s) => s.turnOrder)
  const turnPos = useGame((s) => s.turnPos)
  const destinations = useGame(useShallow(reachableRegions))
  const moveTo = useGame((s) => s.moveTo)
  const player = players[turnOrder[turnPos]]

  return (
    <section className="board-fallback" aria-labelledby="board-fallback-title">
      <div className="board-fallback-card">
        <p className="eyebrow">Accessible map</p>
        <h2 id="board-fallback-title">The map remains playable</h2>
        <p>{reason} Choose a connected destination below, or retry the 3D board.</p>
        {player && <p><strong>{player.name}</strong> is in {REGIONS[player.region]?.name}.</p>}
        <div className="board-fallback-actions" aria-label="Reachable destinations">
          {destinations.length ? destinations.map((regionId) => (
            <button className="btn" type="button" key={regionId} onClick={() => moveTo(regionId)}>
              Move to {REGIONS[regionId]?.name}
            </button>
          )) : <span>No movement remains this turn.</span>}
        </div>
        <button className="btn btn-gold" type="button" onClick={onRetry}>Retry 3D board</button>
      </div>
    </section>
  )
}

function BoardSurface() {
  const [resetKey, setResetKey] = useState(0)
  const [webglAvailable, setWebglAvailable] = useState(canRenderWebGL)
  const retry = () => {
    setWebglAvailable(canRenderWebGL())
    setResetKey((key) => key + 1)
  }

  if (!webglAvailable) {
    return <BoardFallback reason="WebGL is unavailable in this browser." onRetry={retry} />
  }

  return (
    <BoardErrorBoundary key={resetKey} onRetry={retry}>
      <Suspense fallback={<LoadingBoard />}>
        <BoardScene key={resetKey} />
      </Suspense>
    </BoardErrorBoundary>
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
      <BoardSurface />
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
