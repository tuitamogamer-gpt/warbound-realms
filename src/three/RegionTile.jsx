import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, Text } from '@react-three/drei'
import { regionArt } from '../data/regions'
import { FACTIONS } from '../data/constants'

const TIER_COLORS = {
  0: '#c9a227', // towns — gold
  1: '#4d7c3a', // tier I — green
  2: '#b07020', // tier II — orange
  3: '#8b2d2d', // tier III — red
  4: '#3f2b57', // boss lair — violet
}

export default function RegionTile({ region, reachable, locked, onClick }) {
  const tex = useTexture(regionArt(region.id))
  const ringRef = useRef()
  const [hovered, setHovered] = useState(false)

  const rimColor = region.capital
    ? FACTIONS[region.capital].color
    : TIER_COLORS[region.tier]

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = clock.elapsedTime
      ringRef.current.material.opacity = reachable ? 0.55 + Math.sin(t * 4) * 0.3 : 0
      ringRef.current.scale.setScalar(reachable ? 1 + Math.sin(t * 4) * 0.02 : 1)
    }
  })

  const r = region.id === 'blackspire' ? 1.7 : 1.45

  return (
    <group position={[region.pos[0], 0, region.pos[1]]}>
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          if (reachable) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry args={[r, r * 1.06, 0.28, 48]} />
        <meshStandardMaterial attach="material-0" color={rimColor} roughness={0.6} />
        <meshStandardMaterial
          attach="material-1"
          map={tex}
          roughness={0.7}
          color={locked ? '#555555' : hovered && reachable ? '#ffffff' : '#e8e8e8'}
        />
        <meshStandardMaterial attach="material-2" color="#1a140c" />
      </mesh>

      {/* movement highlight ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <ringGeometry args={[r * 1.02, r * 1.16, 48]} />
        <meshBasicMaterial color="#ffd75e" transparent opacity={0} />
      </mesh>

      {locked && (
        <Text position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#9ae66e" outlineWidth={0.02} outlineColor="#000000">
          🔒
        </Text>
      )}

      <Text
        position={[0, 0.17, r + 0.42]}
        rotation={[-Math.PI / 2.6, 0, 0]}
        fontSize={0.34}
        color="#f3e2b3"
        outlineWidth={0.022}
        outlineColor="#120d06"
        anchorX="center"
        anchorY="middle"
        maxWidth={3.4}
        textAlign="center"
      >
        {region.name}
      </Text>
    </group>
  )
}
