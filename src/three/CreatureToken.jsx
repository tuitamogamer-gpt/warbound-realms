import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, useTexture, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { REGIONS } from '../data/regions'
import { CREATURES, creatureArt } from '../data/creatures'

const TIER_MARKS = { 1: '☠', 2: '☠☠', 3: '☠☠☠', 4: '☠☠☠☠' }

export default function CreatureToken({ regionId, slot, boss = false, reducedMotion = false }) {
  const def = CREATURES[slot.defId]
  const tex = useTexture(creatureArt(slot.defId))
  const group = useRef()
  const [hovered, setHovered] = useState(false)
  const pos = REGIONS[regionId].pos
  const size = boss ? 1.2 : 0.72
  const hpFrac = slot.hp / def.hp
  const wounded = slot.hp < def.hp

  useFrame(({ clock }) => {
    if (!group.current) return
    if (boss) group.current.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.6) * 0.06
    const s = hovered ? 1.12 : 1
    const cur = group.current.scale.x
    group.current.scale.setScalar(reducedMotion ? s : cur + (s - cur) * 0.2)
  })

  return (
    <group
      ref={group}
      position={[pos[0] + (boss ? 0 : 0.62), 0, pos[1] + (boss ? 0 : 0.3)]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[size * 0.42, size * 0.48, 0.08, 6]} />
        <meshStandardMaterial color={boss ? '#2c1e45' : '#3a2c1c'} roughness={0.6} />
      </mesh>

      <Billboard position={[0, size * 0.62 + 0.1, 0]}>
        <mesh castShadow>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} color={wounded ? '#ffb0b0' : '#ffffff'} />
        </mesh>
        <mesh position={[0, 0, -0.011]}>
          <planeGeometry args={[size + 0.09, size + 0.09]} />
          <meshStandardMaterial color={boss ? '#39ff6a' : '#101010'} side={THREE.DoubleSide} />
        </mesh>
        {/* hp bar */}
        <group position={[0, -size * 0.62 - 0.05, 0.01]}>
          <mesh>
            <planeGeometry args={[size, 0.09]} />
            <meshBasicMaterial color="#320c0c" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[(-size * (1 - hpFrac)) / 2, 0, 0.002]}>
            <planeGeometry args={[Math.max(0.01, size * hpFrac), 0.09]} />
            <meshBasicMaterial color={hpFrac > 0.5 ? '#4d9e3a' : '#c43b3b'} side={THREE.DoubleSide} />
          </mesh>
        </group>
        {/* name + tier */}
        <Text
          position={[0, -size * 0.62 - 0.2, 0.01]}
          fontSize={boss ? 0.24 : 0.16}
          color={boss ? '#9ae66e' : '#e8d9ae'}
          outlineWidth={0.012}
          outlineColor="#000000"
          anchorX="center"
        >
          {`${def.name}  ${TIER_MARKS[def.tier] || ''}`}
        </Text>
      </Billboard>

      {hovered && (
        <Html position={[0, size * 1.5 + 0.6, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[30, 20]}>
          <div className="tip3d">
            <div className="tip3d-title">
              {def.name} <span style={{ color: boss ? '#9ae66e' : '#d08c3a' }}>{boss ? 'BOSS' : TIER_MARKS[def.tier]}</span>
            </div>
            <div className="tip3d-desc">{def.blurb}</div>
            <div className="tip3d-creature">
              ❤️ {slot.hp}/{def.hp} · 🎲 {def.dice} dice, hits {def.hitOn}+
              {!boss && <> · rewards +{def.xp} XP, +{def.gold} 💰, +{def.vp} 🏆</>}
            </div>
            {def.trait && <div className="tip3d-trait">◆ {def.trait.name}: {def.trait.desc}</div>}
          </div>
        </Html>
      )}
    </group>
  )
}
