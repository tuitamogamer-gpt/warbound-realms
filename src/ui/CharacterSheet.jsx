import { useEffect } from 'react'
import { useGame, selCurrentPlayer } from '../game/store'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt } from '../data/items'
import { TALENTS } from '../data/talents'
import { QUESTS } from '../data/quests'
import { FACTIONS } from '../data/constants'
import { effStats, xpForNextLevel } from '../game/rules'
import { sfx } from '../game/sfx'

const SLOT_META = {
  weapon: { label: 'Weapon', icon: '🗡️', hint: 'Attack dice & strikes' },
  armor: { label: 'Armor', icon: '🛡️', hint: 'Reduces damage taken' },
  trinket: { label: 'Trinket', icon: '💍', hint: 'Passive bonuses' },
}

function EquipmentSlot({ slotKey, player }) {
  const meta = SLOT_META[slotKey]
  const itemId = player.items.find((id) => ITEMS[id].slot === slotKey)
  const item = itemId ? ITEMS[itemId] : null
  return (
    <div className={`eq-slot ${item ? 'eq-filled' : ''}`}>
      <div className="eq-slot-head">
        <span>{meta.icon} {meta.label}</span>
      </div>
      {item ? (
        <div className="eq-item" title={item.desc}>
          <img src={itemArt(item.id)} alt={item.name} />
          <div>
            <div className="eq-item-name">{item.name}</div>
            <div className="eq-item-desc">{item.desc}</div>
          </div>
        </div>
      ) : (
        <div className="eq-empty">{meta.hint} — buy one in a town shop.</div>
      )}
    </div>
  )
}

export default function CharacterSheet() {
  const sheetOpen = useGame((s) => s.sheetOpen)
  const openSheet = useGame((s) => s.openSheet)
  const players = useGame((s) => s.players)
  const useConsumable = useGame((s) => s.useConsumable)
  const inCombat = useGame((s) => !!s.combat && !s.combat.over)
  const current = useGame(selCurrentPlayer)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') openSheet(null)
    }
    if (sheetOpen != null) {
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen, openSheet])

  if (sheetOpen == null) return null
  const player = players[sheetOpen]
  if (!player) return null
  const hero = HEROES[player.heroId]
  const eff = effStats(player)
  const faction = FACTIONS[player.faction]
  const nextXp = xpForNextLevel(player)
  const isCurrent = current && current.idx === player.idx
  const pending = player.pendingTalents?.length || 0

  return (
    <div className="overlay" onClick={() => openSheet(null)}>
      <div className="modal sheet-modal" style={{ '--fc': faction.color }} onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={() => openSheet(null)}>✕</button>

        <div className="sheet-grid">
          {/* left column: identity */}
          <div className="sheet-col sheet-identity">
            <img className="sheet-portrait" src={heroArt(player.heroId)} alt={hero.name} />
            <div className="sheet-name">{player.name}</div>
            <div className="sheet-sub">{player.name === hero.name ? hero.title : `${hero.name} · ${hero.title}`}</div>
            <div className="faction-tag" style={{ color: faction.color }}>{faction.name}</div>
            <div className="sheet-level">Level {player.level}{nextXp ? ` · ${player.xp}/${nextXp} XP` : ' · MAX'}</div>
            {nextXp && (
              <div className="bar bar-xp">
                <div className="bar-fill" style={{ width: `${(player.xp / nextXp) * 100}%` }} />
              </div>
            )}
            <div className="sheet-record">
              <span title="Victory points">🏆 {player.vp} VP</span>
              <span title="Gold">💰 {player.gold}</span>
              <span title="Creatures slain">⚔ {player.kills}</span>
              <span title="Quests completed">📜 {player.completed.length}</span>
            </div>
            <p className="sheet-blurb">{hero.blurb}</p>
          </div>

          {/* middle column: stats + equipment */}
          <div className="sheet-col">
            <div className="sheet-section-title">Attributes</div>
            <div className="sheet-stats">
              <div><b>❤️ {player.hp}/{eff.maxHp}</b><span>Health</span></div>
              <div><b>⚡ {player.energy}/{eff.maxEnergy}</b><span>Energy</span></div>
              <div><b>🎲 {eff.dice}</b><span>Attack dice</span></div>
              <div><b>🛡 {eff.armor}</b><span>Armor</span></div>
              <div><b>👣 {eff.move}</b><span>Movement</span></div>
              <div><b>💰 +{eff.goldPerKill}</b><span>Gold per kill</span></div>
            </div>

            <div className="sheet-section-title">Equipment</div>
            {Object.keys(SLOT_META).map((k) => (
              <EquipmentSlot key={k} slotKey={k} player={player} />
            ))}

            <div className="sheet-section-title">Satchel · {player.consumables.length}/3</div>
            <div className="sheet-satchel">
              {player.consumables.map((id, i) => (
                <button
                  key={`${id}-${i}`}
                  className="eq-consumable"
                  title={`${ITEMS[id].name} — ${ITEMS[id].desc}${isCurrent ? ' (click to use)' : ''}`}
                  disabled={
                    !isCurrent ||
                    (ITEMS[id].effects.combatDice && !inCombat) ||
                    (ITEMS[id].effects.heal && player.hp >= eff.maxHp)
                  }
                  onClick={() => {
                    sfx.click()
                    useConsumable(i)
                  }}
                >
                  <img src={itemArt(id)} alt={ITEMS[id].name} />
                </button>
              ))}
              {Array.from({ length: 3 - player.consumables.length }, (_, i) => (
                <div key={`empty-${i}`} className="eq-consumable eq-consumable-empty">＋</div>
              ))}
            </div>
          </div>

          {/* right column: abilities & talents & quests */}
          <div className="sheet-col">
            <div className="sheet-section-title">Abilities & Spells</div>
            <div className="ability-card">
              <div className="ability-card-head">✨ {hero.ability.name} <span className="ability-cost">{hero.ability.cost}⚡</span></div>
              <div className="ability-card-desc">{hero.ability.desc}</div>
            </div>

            {(player.talents || []).map((tid) => {
              const t = TALENTS[tid]
              return (
                <div className="ability-card talent-card" key={tid}>
                  <div className="ability-card-head">{t.icon} {t.name} <span className="ability-cost">Lv {t.level}</span></div>
                  <div className="ability-card-desc">{t.desc}</div>
                </div>
              )
            })}
            {pending > 0 && (
              <div className="ability-card talent-pending">
                ✦ {pending} talent choice{pending > 1 ? 's' : ''} waiting — close this sheet to choose.
              </div>
            )}
            {player.level < 5 && (
              <div className="sheet-hint">New talents unlock at levels 2 and 4.</div>
            )}

            <div className="sheet-section-title">Active Quests</div>
            {player.quests.map((qid) => {
              const q = QUESTS.find((x) => x.id === qid)
              return (
                <div className="quest-card" key={qid}>
                  <div className="quest-name">{q.name}</div>
                  <div className="quest-text">{q.text}</div>
                  <div className="quest-reward">+{q.reward.xp} XP · +{q.reward.gold} 💰 · +{q.reward.vp} 🏆</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
