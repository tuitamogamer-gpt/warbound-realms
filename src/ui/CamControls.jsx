import { cameraBus } from '../three/cameraBus'
import { sfx } from '../game/sfx'

const press = (fn) => () => {
  sfx.click()
  fn()
}

// On-screen camera cluster. Keyboard: Q/E rotate, W/S tilt, +/− zoom, F focus, R reset.
export default function CamControls({ embedded = false }) {
  return (
    <div
      className={`cam-controls ${embedded ? 'cam-controls-embedded' : ''}`}
      aria-label="Camera controls"
      title="Camera — drag to rotate, wheel to zoom, right-drag to pan"
    >
      <div className="cam-row">
        <button onClick={press(() => cameraBus.rotate(Math.PI / 8))} title="Rotate left (Q)" aria-label="Rotate camera left">⟲</button>
        <button onClick={press(() => cameraBus.tilt(-0.14))} title="Tilt up (W)" aria-label="Tilt camera up">▲</button>
        <button onClick={press(() => cameraBus.rotate(-Math.PI / 8))} title="Rotate right (E)" aria-label="Rotate camera right">⟳</button>
      </div>
      <div className="cam-row">
        <button onClick={press(() => cameraBus.zoom(0.82))} title="Zoom in (+)" aria-label="Zoom camera in">＋</button>
        <button onClick={press(() => cameraBus.tilt(0.14))} title="Tilt down (S)" aria-label="Tilt camera down">▼</button>
        <button onClick={press(() => cameraBus.zoom(1.22))} title="Zoom out (−)" aria-label="Zoom camera out">－</button>
      </div>
      <div className="cam-row">
        <button className="cam-wide" onClick={press(() => cameraBus.focusHero())} title="Focus active hero (F)">🎯 Hero</button>
        <button className="cam-wide" onClick={press(() => cameraBus.reset())} title="Reset view (R)">⌂</button>
      </div>
    </div>
  )
}
