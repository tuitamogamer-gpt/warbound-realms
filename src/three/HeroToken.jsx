import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { REGIONS } from '../data/regions'
import { FACTIONS } from '../data/constants'
import { heroArt } from '../data/heroes'

// Heroes stand on the west half of a tile, creatures on the east,
// so multiple tokens on one region never overlap.
const HERO_SLOTS = [
  [-0.55, 0.45],
  [-0.95, -0.25],
  [-0.25, -0.55],
  [-0.6, -0.85],
]

export default function HeroToken({ player, active }) {
  const group = useRef()
  const tex = useTexture(heroArt(player.heroId))
  const faction = FACTIONS[player.faction]
  const slot = HERO_SLOTS[player.idx % HERO_SLOTS.length]
  const targetPos = useRef(new THREE.Vector3())
  // mount position is frozen; useFrame owns all movement afterwards
  const [initialPos] = useState(() => [
    REGIONS[player.region].pos[0] + slot[0],
    0.14,
    REGIONS[player.region].pos[1] + slot[1],
  ])

  useFrame(({ clock }, ) => {
    if (!group.current) return
    const pos = REGIONS[player.region].pos
    targetPos.current.set(pos[0] + slot[0], 0.14, pos[1] + slot[1])
    // glide between tiles instead of teleporting
    group.current.position.lerp(targetPos.current, 0.09)
    if (active) {
      group.current.position.y = 0.14 + Math.abs(Math.sin(clock.elapsedTime * 2.4)) * 0.12
    }
  })

  return (
    <group ref={group} position={initialPos}>
      {/* faction-colored base */}
      <mesh castShadow position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 0.09, 24]} />
        <meshStandardMaterial color={faction.color} metalness={0.35} roughness={0.4} />
      </mesh>
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[0.34, 0.46, 32]} />
          <meshBasicMaterial color="#ffd75e" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* standee card with hero art */}
      <Billboard position={[0, 0.62, 0]}>
        <mesh castShadow>
          <planeGeometry args={[0.62, 0.93]} />
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} />
        </mesh>
        {/* thin frame behind the card */}
        <mesh position={[0, 0, -0.011]}>
          <planeGeometry args={[0.7, 1.01]} />
          <meshStandardMaterial color={active ? '#ffd75e' : faction.colorDark} side={THREE.DoubleSide} />
        </mesh>
      </Billboard>
    </group>
  )
}
