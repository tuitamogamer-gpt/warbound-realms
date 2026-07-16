import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useTexture } from '@react-three/drei'
import { useShallow } from 'zustand/react/shallow'
import * as THREE from 'three'
import { REGION_LIST, REGIONS } from '../data/regions'
import { useGame, selCurrentPlayer, reachableRegions } from '../game/store'
import RegionTile from './RegionTile'
import HeroToken from './HeroToken'
import CreatureToken from './CreatureToken'

function Table() {
  const tex = useTexture('/assets/ui/wood.jpg')
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 2)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
      <planeGeometry args={[46, 30]} />
      <meshStandardMaterial map={tex} color="#8a6b4a" roughness={0.85} />
    </mesh>
  )
}

function Connections() {
  const segments = useMemo(() => {
    const seen = new Set()
    const segs = []
    for (const r of REGION_LIST) {
      for (const adj of r.adjacent) {
        const key = [r.id, adj].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        segs.push([r.pos, REGIONS[adj].pos])
      }
    }
    return segs
  }, [])
  return (
    <group>
      {segments.map(([a, b], i) => {
        const dx = b[0] - a[0]
        const dz = b[1] - a[1]
        const len = Math.hypot(dx, dz)
        const angle = Math.atan2(dz, dx)
        return (
          <mesh
            key={i}
            position={[(a[0] + b[0]) / 2, -0.05, (a[1] + b[1]) / 2]}
            rotation={[-Math.PI / 2, 0, -angle]}
          >
            <planeGeometry args={[len, 0.22]} />
            <meshStandardMaterial color="#3d2f1e" roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

// Smoothly glides the camera target toward the active hero's region each turn.
function CameraRig({ controlsRef }) {
  const target = useRef(new THREE.Vector3(0, 0, 0))
  const focus = useGame((s) => {
    const p = selCurrentPlayer(s)
    return p ? p.region : null
  })
  useFrame(() => {
    const controls = controlsRef.current
    if (!controls || !focus) return
    const pos = REGIONS[focus].pos
    target.current.set(pos[0], 0, pos[1])
    controls.target.lerp(target.current, 0.04)
    controls.update()
  })
  return null
}

function BossGlow() {
  const bossSpawned = useGame((s) => s.bossSpawned)
  const bossAlive = useGame((s) => s.bossHp > 0)
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.intensity = bossSpawned && bossAlive ? 2.2 + Math.sin(clock.elapsedTime * 3) * 0.8 : 0
  })
  return <pointLight ref={ref} position={[0, 2.2, 0]} color="#39ff6a" intensity={0} distance={7} />
}

export default function BoardScene() {
  const controlsRef = useRef()
  // remount the whole canvas if the browser drops the WebGL context
  const [glKey, setGlKey] = useState(0)
  const players = useGame((s) => s.players)
  const creatures = useGame((s) => s.creatures)
  const bossSpawned = useGame((s) => s.bossSpawned)
  const bossHp = useGame((s) => s.bossHp)
  const reachable = useGame(useShallow(reachableRegions))
  const currentIdx = useGame((s) =>
    s.screen === 'game' && s.players.length ? s.turnOrder[s.turnPos] : -1
  )
  const moveTo = useGame((s) => s.moveTo)

  return (
    <Canvas
      key={glKey}
      shadows
      camera={{ position: [0, 15, 13], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          setTimeout(() => setGlKey((k) => k + 1), 300)
        })
      }}
    >
      <color attach="background" args={['#12100d']} />
      <fog attach="fog" args={['#12100d', 30, 55]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <hemisphereLight args={['#c9b48a', '#221a12', 0.35]} />
      <BossGlow />

      <Table />
      <Connections />

      {REGION_LIST.map((r) => (
        <RegionTile
          key={r.id}
          region={r}
          reachable={reachable.includes(r.id)}
          locked={r.id === 'blackspire' && !bossSpawned}
          onClick={() => reachable.includes(r.id) && moveTo(r.id)}
        />
      ))}

      {Object.entries(creatures).map(([rid, slot]) =>
        slot ? <CreatureToken key={`${rid}-${slot.defId}`} regionId={rid} slot={slot} /> : null
      )}
      {bossSpawned && bossHp > 0 && (
        <CreatureToken regionId="blackspire" slot={{ defId: 'vhalrax', hp: bossHp }} boss />
      )}

      {players.map((p) =>
        p.dead ? null : (
          <HeroToken key={p.idx} player={p} active={p.idx === currentIdx} />
        )
      )}

      <OrbitControls
        ref={controlsRef}
        enablePan
        minDistance={6}
        maxDistance={26}
        maxPolarAngle={Math.PI / 2.25}
        minPolarAngle={0.35}
      />
      <CameraRig controlsRef={controlsRef} />
    </Canvas>
  )
}
