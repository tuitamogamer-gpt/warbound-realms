import { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, OrbitControls, useTexture, Text, Line, Sparkles } from '@react-three/drei'
import { useShallow } from 'zustand/react/shallow'
import * as THREE from 'three'
import { REGION_LIST, REGIONS } from '../data/regions'
import { QUESTS } from '../data/quests'
import { useGame, selCurrentPlayer, reachableRegions } from '../game/store'
import { sfx } from '../game/sfx'
import { cameraBus } from './cameraBus'
import RegionTile from './RegionTile'
import HeroToken from './HeroToken'
import CreatureToken from './CreatureToken'

function Table() {
  const tex = useTexture('/assets/ui/wood.webp')
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(3, 2)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]} receiveShadow>
      <planeGeometry args={[46, 30]} />
      <meshStandardMaterial map={tex} color="#8a6b4a" roughness={0.85} />
    </mesh>
  )
}

// A leather play-mat under the tiles, with a gold trim and engraved title.
function BoardMat() {
  const trim = useMemo(() => {
    const w = 11.9, h = 8.5
    return [
      [-w, 0, -h], [w, 0, -h], [w, 0, h], [-w, 0, h], [-w, 0, -h],
    ]
  }, [])
  return (
    <group>
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[24.6, 0.12, 17.6]} />
        <meshStandardMaterial color="#211508" roughness={0.9} />
      </mesh>
      <Line points={trim} position={[0, -0.03, 0]} color="#8a6b32" lineWidth={1.5} transparent opacity={0.8} />
      <Text
        position={[0, -0.028, 7.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        letterSpacing={0.25}
        color="#a8853f"
        anchorX="center"
      >
        WARBOUND REALMS
      </Text>
      <Text
        position={[-11.2, -0.028, -7.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.42}
        color="#8a6b32"
      >
        ✦ N
      </Text>
    </group>
  )
}

// Gently bowed dashed roads between connected regions.
function Roads() {
  const roads = useMemo(() => {
    const seen = new Set()
    const out = []
    let i = 0
    for (const r of REGION_LIST) {
      for (const adj of r.adjacent) {
        const key = [r.id, adj].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        const a = r.pos
        const b = REGIONS[adj].pos
        const p0 = new THREE.Vector3(a[0], 0.02, a[1])
        const p2 = new THREE.Vector3(b[0], 0.02, b[1])
        const mid = p0.clone().add(p2).multiplyScalar(0.5)
        const dir = p2.clone().sub(p0).normalize()
        const perp = new THREE.Vector3(-dir.z, 0, dir.x)
        mid.add(perp.multiplyScalar(i % 2 ? 0.35 : -0.35))
        out.push(new THREE.QuadraticBezierCurve3(p0, mid, p2).getPoints(16))
        i++
      }
    }
    return out
  }, [])
  return (
    <group>
      {roads.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#5a462c"
          lineWidth={2.2}
          dashed
          dashSize={0.26}
          gapSize={0.14}
          transparent
          opacity={0.85}
        />
      ))}
    </group>
  )
}

// Glides the camera onto the active hero for ~2s after every turn/move focus
// change, then releases it so players can freely orbit and pan.
function CameraRig({ controlsRef, reducedMotion }) {
  const target = useRef(new THREE.Vector3())
  const lastFocus = useRef(null)
  const focus = useGame((s) => {
    const p = selCurrentPlayer(s)
    return p ? p.region : null
  })
  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return
    cameraBus.controls = controls
    if (focus !== lastFocus.current) {
      lastFocus.current = focus
      cameraBus.followUntil = performance.now() + 2200
    }
    if (focus && performance.now() < cameraBus.followUntil) {
      const pos = REGIONS[focus].pos
      target.current.set(pos[0], 0, pos[1])
      if (reducedMotion) controls.target.copy(target.current)
      else controls.target.lerp(target.current, 0.05)
      controls.update()
    }
  })
  return null
}

function BossGlow({ reducedMotion }) {
  const bossSpawned = useGame((s) => s.bossSpawned)
  const bossAlive = useGame((s) => s.bossHp > 0)
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.intensity = bossSpawned && bossAlive
        ? reducedMotion ? 2.2 : 2.2 + Math.sin(clock.elapsedTime * 3) * 0.8
        : 0
  })
  return (
    <group>
      <pointLight ref={ref} position={[0, 2.2, 0]} color="#39ff6a" intensity={0} distance={7} />
      {bossSpawned && bossAlive && !reducedMotion && (
        <Sparkles count={26} scale={[3.2, 2.4, 3.2]} size={3} speed={0.5} color="#63ff8e" opacity={0.7} position={[0, 1.3, 0]} />
      )}
    </group>
  )
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
  const inspectedRegionId = useGame((s) => s.inspectedRegionId)
  const inspectRegion = useGame((s) => s.inspectRegion)
  const moveTo = useGame((s) => s.moveTo)
  const currentPlayer = players[currentIdx]
  const questTargets = useMemo(() => {
    const targets = new Set()
    if (!currentPlayer) return targets
    for (const questId of currentPlayer.quests ?? []) {
      const quest = QUESTS.find((entry) => entry.id === questId)
      if (!quest) continue
      if (quest.region) targets.add(quest.region)
      if (quest.type === 'killCreature') {
        for (const [regionId, slot] of Object.entries(creatures)) {
          if (slot?.defId === quest.creature) targets.add(regionId)
        }
      }
    }
    return targets
  }, [creatures, currentPlayer])
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )
  const [compactViewport, setCompactViewport] = useState(() => window.innerWidth < 700)

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return undefined
    const onChange = (event) => setReducedMotion(event.matches)
    query.addEventListener?.('change', onChange)
    return () => query.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    const onResize = () => setCompactViewport(window.innerWidth < 700)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // camera hotkeys: Q/E rotate, W/S tilt, +/- zoom, F focus hero, R reset view
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return // never hijack browser/OS shortcuts
      if (e.target.closest('input, textarea')) return
      switch (e.key.toLowerCase()) {
        case 'q': cameraBus.rotate(Math.PI / 8); break
        case 'e': cameraBus.rotate(-Math.PI / 8); break
        case 'w': cameraBus.tilt(-0.12); break
        case 's': cameraBus.tilt(0.12); break
        case '+': case '=': cameraBus.zoom(0.85); break
        case '-': case '_': cameraBus.zoom(1.18); break
        case 'f': cameraBus.focusHero(); break
        case 'r': cameraBus.reset(); break
        default: return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Canvas
      key={glKey}
      shadows
      camera={{ position: [0, 15, 13], fov: 42 }}
      dpr={[1, compactViewport ? 1.2 : 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          setTimeout(() => setGlKey((k) => k + 1), 300)
        })
      }}
    >
      <color attach="background" args={['#12100d']} />
      <AdaptiveDpr />
      <fog attach="fog" args={['#12100d', 30, 55]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.5}
        castShadow
        shadow-mapSize={compactViewport ? [512, 512] : [1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <hemisphereLight args={['#c9b48a', '#221a12', 0.35]} />
      <BossGlow reducedMotion={reducedMotion} />
      {!reducedMotion && (
        <Sparkles count={50} scale={[22, 4, 13]} size={1.6} speed={0.25} color="#ffd75e" opacity={0.28} position={[0, 2.2, 0]} />
      )}

      <Table />
      <BoardMat />
      <Roads />

      {REGION_LIST.map((r) => (
        <RegionTile
          key={r.id}
          region={r}
          reachable={reachable.includes(r.id)}
          current={currentPlayer?.region === r.id}
          selected={inspectedRegionId === r.id}
          questTarget={questTargets.has(r.id)}
          reducedMotion={reducedMotion}
          locked={r.id === 'blackspire' && !bossSpawned}
          creatureSlot={r.id === 'blackspire' && bossSpawned && bossHp > 0 ? { defId: 'vhalrax', hp: bossHp } : creatures[r.id]}
          onClick={() => {
            if (inspectedRegionId === r.id && reachable.includes(r.id)) {
              sfx.move()
              moveTo(r.id)
              inspectRegion?.(null)
              return
            }
            inspectRegion?.(r.id)
          }}
        />
      ))}

      {Object.entries(creatures).map(([rid, slot]) =>
        slot ? (
          <Suspense fallback={null} key={`${rid}-${slot.defId}`}>
            <CreatureToken regionId={rid} slot={slot} reducedMotion={reducedMotion} />
          </Suspense>
        ) : null
      )}
      {bossSpawned && bossHp > 0 && (
        <Suspense fallback={null}>
          <CreatureToken regionId="blackspire" slot={{ defId: 'vhalrax', hp: bossHp }} boss reducedMotion={reducedMotion} />
        </Suspense>
      )}

      {players.map((p) =>
        p.dead ? null : (
          <Suspense fallback={null} key={p.idx}>
            <HeroToken player={p} active={p.idx === currentIdx} reducedMotion={reducedMotion} />
          </Suspense>
        )
      )}

      <OrbitControls
        ref={controlsRef}
        enablePan
        minDistance={5}
        maxDistance={26}
        maxPolarAngle={Math.PI / 2.25}
        minPolarAngle={0.35}
      />
      <CameraRig controlsRef={controlsRef} reducedMotion={reducedMotion} />
    </Canvas>
  )
}
