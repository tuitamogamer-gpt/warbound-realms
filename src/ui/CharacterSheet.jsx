import { useGame, selCurrentPlayer } from '../game/store'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt, isCombatOnlyConsumable } from '../data/items'
import { TALENTS } from '../data/talents'
import { ABILITIES, abilityArt, maxAbilitySlots } from '../data/abilities'
import { QUESTS } from '../data/quests'
import { FACTIONS } from '../data/constants'
import { effStats, xpForNextLevel } from '../game/rules'
import { sfx } from '../game/sfx'
import DicePools from './DicePools'
import ModalShell from './ModalShell'

const SLOT_META = {
  weapon: { label: 'Weapon', icon: '🗡️', hint: 'Favored attack-pool dice & strikes' },
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
  const consumeItem = useGame((s) => s.useConsumable)
  const inCombat = useGame((s) => !!s.combat && !s.combat.over)
  const current = useGame(selCurrentPlayer)

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
    <ModalShell
      className="sheet-modal"
      ariaLabel={`${player.name} character sheet`}
      onClose={() => openSheet(null)}
      closeOnBackdrop
    >
        <button className="sheet-close" aria-label="Close character sheet" onClick={() => openSheet(null)}>✕</button>

        <div className="sheet-grid" style={{ '--fc': faction.color }}>
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
              <span title="Duels won">🗡 {player.pvpWins || 0}</span>
              <span title="Quests completed">📜 {player.completed.length}</span>
            </div>
            <p className="sheet-blurb">{hero.blurb}</p>
          </div>

          {/* middle column: stats + equipment */}
          <div className="sheet-col">
            <div className="sheet-section-title">Attributes</div>
            <div className="sheet-dice-summary">
              <span className="sheet-dice-title">Hero dice pools</span>
              <DicePools ranged={eff.rangedDice} melee={eff.meleeDice} guard={eff.defenseDice} />
            </div>
            <div className="sheet-stats">
              <div><b>❤️ {player.hp}/{eff.maxHp}</b><span>Health</span></div>
              <div><b>⚡ {player.energy}/{eff.maxEnergy}</b><span>Energy</span></div>
              <div><b>🪨 {eff.armor}</b><span>Flat armor</span></div>
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
                    (isCombatOnlyConsumable(id) && !inCombat) ||
                    (ITEMS[id].effects.heal && player.hp >= eff.maxHp)
                  }
                  onClick={() => {
                    sfx.click()
                    consumeItem(i)
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
            <div className="sheet-section-title">
              Abilities & Spells · {player.abilities.length}/{maxAbilitySlots(player.level)} slots
            </div>
            {(player.abilities || []).map((aid) => {
              const ab = ABILITIES[aid]
              return (
                <div className="ability-card" key={aid}>
                  <img className="ability-card-icon" src={abilityArt(aid)} alt={ab.name} />
                  <div className="ability-card-body">
                    <div className="ability-card-head">
                      {ab.name}
                      <span className="ability-cost">
                        {ab.type === 'active' ? `${ab.energy}⚡${ab.anytime ? ' · anytime' : ''}` : 'passive'}
                      </span>
                    </div>
                    <div className="ability-card-desc">{ab.desc}</div>
                  </div>
                </div>
              )
            })}
            {Array.from(
              { length: maxAbilitySlots(player.level) - player.abilities.length },
              (_, i) => (
                <div className="ability-card ability-slot-empty" key={`slot-${i}`}>
                  Empty ability slot — train a new ability at any town.
                </div>
              )
            )}
            {maxAbilitySlots(player.level) < 4 && (
              <div className="sheet-hint">
                Next ability slot unlocks at level {player.level < 2 ? 2 : player.level < 4 ? 4 : 5}.
              </div>
            )}

            {(player.talents || []).map((tid) => {
              const t = TALENTS[tid]
              if (!t) return null
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
              if (!q) return null
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
    </ModalShell>
  )
}
