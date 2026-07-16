import { useState, useEffect, useRef } from 'react'
import { useGame } from '../game/store'
import { CREATURES, creatureArt } from '../data/creatures'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt } from '../data/items'
import { ABILITIES, abilityArt } from '../data/abilities'
import { effStats } from '../game/rules'
import { sfx } from '../game/sfx'

function Die({ value, hitOn, critFrom = 99, delay }) {
  const isHit = value >= hitOn
  const isCrit = value >= critFrom
  return (
    <span
      className={`die ${isCrit ? 'die-crit' : isHit ? 'die-hit' : 'die-miss'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {value}
    </span>
  )
}

export default function CombatModal() {
  const combat = useGame((s) => s.combat)
  const players = useGame((s) => s.players)
  const combatRound = useGame((s) => s.combatRound)
  const combatFlee = useGame((s) => s.combatFlee)
  const closeCombat = useGame((s) => s.closeCombat)
  const useConsumable = useGame((s) => s.useConsumable)
  const [selectedAbility, setSelectedAbility] = useState(null)
  const [shaking, setShaking] = useState(false)

  useEffect(() => setSelectedAbility(null), [combat?.round, combat?.over])

  // victory / defeat stingers — only on a fresh false→true transition, so a
  // rehydrated already-finished combat doesn't replay the sound on load
  const prevOver = useRef(!!combat?.over)
  useEffect(() => {
    const was = prevOver.current
    prevOver.current = !!combat?.over
    if (was || !combat?.over) return
    if (combat.heroWon) sfx.kill()
    else if (combat.heroDied) sfx.death()
    else if (combat.fled) sfx.flee()
  }, [combat?.over]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!combat) return null
  const p = players[combat.playerIdx]
  const hero = HEROES[p.heroId]
  const isPvp = !!combat.pvp
  const defender = isPvp ? players[combat.targetIdx] : null
  const def = isPvp ? null : CREATURES[combat.defId]
  const defEff = isPvp ? effStats(defender) : null
  const foeName = isPvp ? defender.name : def.name
  const eff = effStats(p)
  const activeAbilities = (p.abilities || [])
    .map((id) => ABILITIES[id])
    .filter((ab) => ab && ab.type === 'active')

  const roll = () => {
    sfx.dice()
    setShaking(true)
    setTimeout(() => setShaking(false), 450)
    combatRound(selectedAbility)
  }

  return (
    <div className="overlay overlay-dark">
      <div className={`modal combat-modal ${shaking ? 'shake' : ''}`}>
        <div className="combat-arena">
          <div className="combatant">
            <img src={heroArt(p.heroId)} alt={hero.name} />
            <div className="combatant-name">{p.name}</div>
            <div className="combat-hp hp-hero">
              ❤️ {p.hp}/{eff.maxHp} · ⚡ {p.energy}/{eff.maxEnergy}
            </div>
          </div>
          <div className="combat-vs">
            <div className="vs-text">⚔</div>
            <div className="combat-round">{isPvp ? 'Duel' : 'Round'} {combat.round}</div>
          </div>
          <div className="combatant">
            <img
              src={isPvp ? heroArt(defender.heroId) : creatureArt(combat.defId)}
              alt={foeName}
              className={combat.boss ? 'boss-img' : ''}
            />
            <div className="combatant-name">{foeName}</div>
            <div className="combat-hp hp-creature">
              {isPvp
                ? <>❤️ {defender.hp}/{defEff.maxHp} · 🎲 {defEff.dice} (hits 4+) · 🛡 {defEff.armor}</>
                : <>❤️ {combat.hp}/{combat.maxHp} · 🎲 {def.dice} (hits {def.hitOn}+)</>}
            </div>
          </div>
        </div>

        {(combat.lastHeroRolls || combat.lastCreatureRolls) && (
          <div className="dice-rows">
            {combat.lastHeroRolls && (
              <div className="dice-row">
                <span className="dice-label">You:</span>
                {combat.lastHeroRolls.map((v, i) => (
                  <Die key={`${combat.rollId}-${i}`} value={v} hitOn={4} critFrom={combat.lastCritOn5 ? 5 : 6} delay={i * 70} />
                ))}
                {combat.lastAutoHits > 0 && <span className="auto-hits">+{combat.lastAutoHits} auto</span>}
              </div>
            )}
            {combat.lastCreatureRolls && (
              <div className="dice-row">
                <span className="dice-label">Foe:</span>
                {combat.lastCreatureRolls.map((v, i) => (
                  <Die
                    key={`${combat.rollId}-c${i}`}
                    value={v}
                    hitOn={isPvp ? 4 : def.hitOn}
                    critFrom={isPvp ? 6 : 99}
                    delay={i * 70}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="combat-log">
          {combat.log.slice(0, 5).map((l, i) => (
            <div key={i} className={`log-line log-${l.cls}`}>{l.text}</div>
          ))}
        </div>

        {!combat.over ? (
          <>
            <div className="combat-options">
              {activeAbilities.map((ab) => {
                const usable =
                  p.energy >= ab.energy && !(ab.effect.heal && p.hp >= eff.maxHp)
                const on = selectedAbility === ab.id
                return (
                  <button
                    key={ab.id}
                    className={`ability-toggle ${!usable ? 'disabled' : ''} ${on ? 'on' : ''}`}
                    disabled={!usable}
                    title={ab.desc}
                    onClick={() => setSelectedAbility(on ? null : ab.id)}
                  >
                    <img className="chip-icon" src={abilityArt(ab.id)} alt="" />
                    {ab.name} ({ab.energy}⚡)
                  </button>
                )
              })}
              {p.consumables.map((id, i) => (
                <button
                  key={`${id}-${i}`}
                  className="chip"
                  title={ITEMS[id].desc}
                  disabled={ITEMS[id].effects.heal && p.hp >= eff.maxHp}
                  onClick={() => useConsumable(i)}
                >
                  <img className="chip-icon" src={itemArt(id)} alt="" /> {ITEMS[id].name}
                </button>
              ))}
            </div>
            <div className="combat-buttons">
              <button className="btn-primary" onClick={roll}>🎲 Roll Attack</button>
              <button className="btn-secondary" onClick={combatFlee}>
                {isPvp ? '🏳 Withdraw' : '🏃 Flee'}
              </button>
            </div>
          </>
        ) : (
          <div className="combat-buttons">
            <div className={`combat-result ${combat.heroWon ? 'good' : 'bad'}`}>
              {combat.heroWon
                ? isPvp ? `${foeName} is defeated!` : `${foeName} is slain!`
                : combat.heroDied
                  ? `${p.name} has fallen...`
                  : isPvp ? 'You withdrew from the duel.' : 'You fled the battle.'}
            </div>
            <button className="btn-primary" onClick={closeCombat}>Continue</button>
          </div>
        )}
      </div>
    </div>
  )
}
