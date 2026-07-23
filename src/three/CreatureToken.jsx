import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, useTexture, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { REGIONS } from '../data/regions'
import { CREATURES, creatureArt } from '../data/creatures'
import { GAME } from '../data/constants'

const TIER_MARKS = { 1: '☠', 2: '☠☠', 3: '☠☠☠', 4: '☠☠☠☠' }

export default function CreatureToken({ regionId, slot, boss = false, reducedMotion = false }) {
  const def = CREATURES[slot.defId]
  const tex = useTexture(creatureArt(slot.defId))
  const group = useRef()
  const [hovered, setHovered] = useState(false)
  const pos = REGIONS[regionId].pos
  const elite = !!slot.elite
  const size = boss ? 1.2 : elite ? 0.8 : 0.72
  const maxHp = def.hp + (elite ? GAME.ELITE_BONUS_HP : 0)
  const hpFrac = slot.hp / maxHp
  const wounded = slot.hp < maxHp
  const threat = def.threat ?? def.hitOn ?? 5
  const attack = def.attack ?? def.dice ?? 0
  const armor = def.armor ?? def.trait?.armor ?? 0
  const provoked = slot.provoked ?? slot.threat ?? 0
  const provokedAttack = provoked * (GAME.PROVOKED_ATTACK ?? 1)
  const minionAttack = def.minions?.attack ?? def.minions?.dice ?? 0

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
          <meshStandardMaterial color={boss ? '#39ff6a' : elite ? '#c9a227' : '#101010'} side={THREE.DoubleSide} />
        </mesh>
        {elite && (
          <Text
            position={[0, size * 0.62 + 0.16, 0.01]}
            fontSize={0.22}
            color="#ffd75e"
            outlineWidth={0.014}
            outlineColor="#000000"
            anchorX="center"
          >
            👑
          </Text>
        )}
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
          {`${elite ? 'Elite ' : ''}${def.name}  ${TIER_MARKS[def.tier] || ''}`}
        </Text>
      </Billboard>

      {hovered && (
        <Html position={[0, size * 1.5 + 0.6, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[30, 20]}>
          <div className="tip3d">
            <div className="tip3d-title">
              {elite ? '👑 Elite ' : ''}{def.name} <span style={{ color: boss ? '#9ae66e' : '#d08c3a' }}>{boss ? 'BOSS' : TIER_MARKS[def.tier]}</span>
            </div>
            <div className="tip3d-desc">{def.blurb}</div>
            <div className="tip3d-creature">
              ❤️ {slot.hp}/{maxHp} · ☠ Threat {threat}+ · ⚔ Attack {attack} · 🪨 Armor {armor}
              {!boss && (
                <>
                  {' '}· rewards +{def.xp + (elite ? GAME.ELITE_BONUS_REWARD : 0)} XP, +
                  {def.gold + (elite ? GAME.ELITE_BONUS_REWARD : 0)} 💰, +
                  {def.vp + (elite ? GAME.ELITE_BONUS_REWARD : 0)} 🏆
                </>
              )}
            </div>
            {def.trait && <div className="tip3d-trait">◆ {def.trait.name}: {def.trait.desc}</div>}
            {provoked > 0 && (
              <div className="tip3d-trait" style={{ color: '#ff8ba0' }}>
                😡 Provoked: +{provokedAttack} fixed Attack
              </div>
            )}
            {def.minions && (
              <div className="tip3d-trait">⚑ {def.minions.name} ×{def.minions.count} · each adds +{minionAttack} Attack while alive</div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}
