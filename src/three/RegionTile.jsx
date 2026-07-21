import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, Text, Html } from '@react-three/drei'
import { regionArt } from '../data/regions'
import { CREATURES } from '../data/creatures'
import { FACTIONS, GAME } from '../data/constants'

const TIER_COLORS = {
  0: '#c9a227', // towns — gold
  1: '#4d7c3a', // tier I — green
  2: '#b07020', // tier II — orange
  3: '#8b2d2d', // tier III — red
  4: '#3f2b57', // boss lair — violet
}

const TIER_LABELS = {
  1: 'Tier I',
  2: 'Tier II',
  3: 'Tier III',
}

const subLabel = (region) => {
  if (region.capital) return `${FACTIONS[region.capital].name} · Town`
  if (region.town) return 'Free Town'
  if (region.tier === 4) return 'Boss Lair'
  return `${TIER_LABELS[region.tier]} hunting grounds`
}

export default function RegionTile({
  region,
  reachable,
  current,
  selected,
  questTarget,
  reducedMotion,
  locked,
  creatureSlot,
  cacheGold = 0,
  onClick,
}) {
  const tex = useTexture(regionArt(region.id))
  const ringRef = useRef()
  const dangerRef = useRef()
  const [hovered, setHovered] = useState(false)

  const rimColor = region.capital
    ? FACTIONS[region.capital].color
    : TIER_COLORS[region.tier]

  const creatureDef = creatureSlot ? CREATURES[creatureSlot.defId] : null

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.material.opacity = reachable
        ? reducedMotion ? 0.75 : 0.55 + Math.sin(t * 4) * 0.3
        : 0
      ringRef.current.scale.setScalar(
        reachable && !reducedMotion ? 1 + Math.sin(t * 4) * 0.02 : 1,
      )
    }
    if (dangerRef.current) {
      dangerRef.current.material.opacity = creatureDef && !locked
        ? reducedMotion ? 0.42 : 0.32 + Math.sin(t * 2.4) * 0.15
        : 0
    }
  })

  const r = region.size ?? (region.id === 'blackspire' ? 1.7 : 1.45)

  return (
    <group position={[region.pos[0], 0, region.pos[1]]}>
      {/* dark bevel base */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[r * 1.12, r * 1.18, 0.1, 48]} />
        <meshStandardMaterial color="#17100a" roughness={0.9} />
      </mesh>

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
          color={locked ? '#555555' : hovered ? '#ffffff' : '#e8e8e8'}
        />
        <meshStandardMaterial attach="material-2" color="#1a140c" />
      </mesh>

      {/* Current, reachable and inspected states remain distinct without relying on hover. */}
      {current && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.162, 0]}>
          <ringGeometry args={[r * 0.96, r * 1.035, 48]} />
          <meshBasicMaterial color="#4da3ff" transparent opacity={0.98} />
        </mesh>
      )}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <ringGeometry args={[r * 1.04, r * 1.13, 48]} />
        <meshBasicMaterial color="#ffd75e" transparent opacity={0} />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.164, 0]}>
          <ringGeometry args={[r * 1.135, r * 1.205, 48]} />
          <meshBasicMaterial color="#f8e8bb" transparent opacity={0.95} />
        </mesh>
      )}

      {/* danger ring when a creature lurks here */}
      <mesh ref={dangerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.155, 0]}>
        <ringGeometry args={[r * 1.225, r * 1.29, 48]} />
        <meshBasicMaterial color="#e04747" transparent opacity={0} />
      </mesh>

      {questTarget && (
        <group position={[r * 0.76, 0.5, -r * 0.72]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.27, 24]} />
            <meshBasicMaterial color="#20160a" transparent opacity={0.95} />
          </mesh>
          <Text
            position={[0, 0.014, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.34}
            color="#ffd75e"
            outlineWidth={0.02}
            outlineColor="#000000"
            anchorX="center"
            anchorY="middle"
          >
            !
          </Text>
        </group>
      )}

      {locked && (
        <Text position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#9ae66e" outlineWidth={0.02} outlineColor="#000000">
          🔒
        </Text>
      )}

      {cacheGold > 0 && (
        <Text
          position={[-r * 0.55, 0.32, -r * 0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="#ffd75e"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          💰
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
      <Text
        position={[0, 0.1, r + 0.78]}
        rotation={[-Math.PI / 2.6, 0, 0]}
        fontSize={0.2}
        color={rimColor}
        outlineWidth={0.014}
        outlineColor="#120d06"
        anchorX="center"
        anchorY="middle"
      >
        {subLabel(region)}
      </Text>

      {hovered && (
        <Html position={[0, 1.6, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[30, 20]}>
          <div className="tip3d">
            <div className="tip3d-title">
              {region.name} <span style={{ color: rimColor }}>{subLabel(region)}</span>
            </div>
            <div className="tip3d-desc">{region.desc}</div>
            {creatureDef && (
              <div className="tip3d-creature">
                ⚔ {creatureSlot.elite ? '👑 Elite ' : ''}{creatureDef.name} — ❤️ {creatureSlot.hp}/
                {creatureDef.hp + (creatureSlot.elite ? GAME.ELITE_BONUS_HP : 0)} · 🎲 {creatureDef.dice} dice (hits {creatureDef.hitOn}+)
                {!creatureDef.boss && ` · +${creatureDef.xp + (creatureSlot.elite ? GAME.ELITE_BONUS_REWARD : 0)} XP · +${creatureDef.gold + (creatureSlot.elite ? GAME.ELITE_BONUS_REWARD : 0)} gold · +${creatureDef.vp + (creatureSlot.elite ? GAME.ELITE_BONUS_REWARD : 0)} VP`}
                {creatureDef.trait && <div>◆ {creatureDef.trait.name}: {creatureDef.trait.desc}</div>}
                {(creatureSlot.threat || 0) > 0 && (
                  <div style={{ color: '#ff8ba0' }}>😡 Provoked: +{creatureSlot.threat} clash dice</div>
                )}
                {creatureDef.minions && (
                  <div>⚑ {creatureDef.minions.name} ×{creatureDef.minions.count} fight alongside it</div>
                )}
              </div>
            )}
            {cacheGold > 0 && (
              <div className="tip3d-creature" style={{ color: '#ffd75e' }}>
                💰 Treasure cache — the first hero to arrive loots {cacheGold} gold.
              </div>
            )}
            {locked && <div className="tip3d-locked">Sealed until Vhalrax awakens (round 6)</div>}
          </div>
        </Html>
      )}
    </group>
  )
}
