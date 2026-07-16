// Imperative bridge between HUD buttons / hotkeys and the OrbitControls
// instance living inside the R3F canvas.
//
// Deliberately avoids importing three.js: the HUD imports this module, and any
// static three import here would drag the whole 3D engine back into the entry
// chunk. The camera's position/target are already three.js vectors — plain
// math on their components is all we need.

export const cameraBus = {
  controls: null,
  // while now < followUntil, CameraRig glides the target onto the active hero
  followUntil: 0,

  rotate(angle) {
    const c = this.controls
    if (!c) return
    const cam = c.object
    const x = cam.position.x - c.target.x
    const z = cam.position.z - c.target.z
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    cam.position.x = c.target.x + x * cos + z * sin
    cam.position.z = c.target.z - x * sin + z * cos
    c.update()
  },

  tilt(delta) {
    const c = this.controls
    if (!c) return
    const cam = c.object
    const dx = cam.position.x - c.target.x
    const dy = cam.position.y - c.target.y
    const dz = cam.position.z - c.target.z
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (!r) return
    const phi = Math.acos(Math.max(-1, Math.min(1, dy / r))) // polar angle from +Y
    const theta = Math.atan2(dx, dz)
    // clamp against the controls' own polar limits so keys and mouse agree
    const nextPhi = Math.min(Math.max(phi + delta, c.minPolarAngle), c.maxPolarAngle)
    const sinPhi = Math.sin(nextPhi)
    cam.position.set(
      c.target.x + r * sinPhi * Math.sin(theta),
      c.target.y + r * Math.cos(nextPhi),
      c.target.z + r * sinPhi * Math.cos(theta)
    )
    c.update()
  },

  zoom(factor) {
    const c = this.controls
    if (!c) return
    const cam = c.object
    const dx = cam.position.x - c.target.x
    const dy = cam.position.y - c.target.y
    const dz = cam.position.z - c.target.z
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (!len) return
    // clamp so the final step lands exactly on the distance limit
    const next = Math.min(Math.max(len * factor, c.minDistance), c.maxDistance)
    const f = next / len
    cam.position.set(
      c.target.x + dx * f,
      c.target.y + dy * f,
      c.target.z + dz * f
    )
    c.update()
  },

  focusHero() {
    this.followUntil = performance.now() + 1600
  },

  reset() {
    const c = this.controls
    if (!c) return
    this.followUntil = 0 // stop the hero-follow glide from overriding the reset
    c.target.set(0, 0, 0)
    c.object.position.set(0, 15, 13)
    c.update()
  },
}
