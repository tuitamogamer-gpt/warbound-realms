import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { REGIONS } from '../data/regions'
import { CREATURES, CREATURE_LIST, creatureArt } from '../data/creatures'

// Preload every creature texture up front — otherwise the first appearance of a
// new creature type mid-game (e.g. the boss at round 6) suspends the whole canvas.
CREATURE_LIST.forEach((c) => useTexture.preload(creatureArt(c.id)))

export default function CreatureToken({ regionId, slot, boss = false }) {
  const def = CREATURES[slot.defId]
  const tex = useTexture(creatureArt(slot.defId))
  const group = useRef()
  const pos = REGIONS[regionId].pos
  const size = boss ? 1.05 : 0.55
  const wounded = slot.hp < def.hp

  useFrame(({ clock }) => {
    if (boss && group.current) {
      group.current.position.y = Math.sin(clock.elapsedTime * 1.6) * 0.06
    }
  })

  return (
    <group ref={group} position={[pos[0] + (boss ? 0 : 0.6), 0, pos[1] + (boss ? 0 : 0.35)]}>
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[size * 0.42, size * 0.48, 0.08, 6]} />
        <meshStandardMaterial color={boss ? '#2c1e45' : '#3a2c1c'} roughness={0.6} />
      </mesh>
      <Billboard position={[0, size * 0.62 + 0.08, 0]}>
        <mesh castShadow>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} color={wounded ? '#ff9a9a' : '#ffffff'} />
        </mesh>
        <mesh position={[0, 0, -0.011]}>
          <planeGeometry args={[size + 0.08, size + 0.08]} />
          <meshStandardMaterial color={boss ? '#39ff6a' : '#141414'} side={THREE.DoubleSide} />
        </mesh>
        {wounded && (
          <mesh position={[0, -size * 0.62, 0.01]}>
            <planeGeometry args={[size, 0.09]} />
            <meshBasicMaterial color="#e33" />
          </mesh>
        )}
      </Billboard>
    </group>
  )
}
