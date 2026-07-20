import { useState, useEffect, useRef } from 'react'
import { useGame } from '../game/store'
import { CREATURES, creatureArt } from '../data/creatures'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt } from '../data/items'
import { ABILITIES, abilityArt, isHealOnly } from '../data/abilities'
import { effStats } from '../game/rules'
import { sfx } from '../game/sfx'
import ModalShell from './ModalShell'

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
  const consumeItem = useGame((s) => s.useConsumable)
  const choosePvpDefense = useGame((s) => s.setPvpDefense ?? s.choosePvpDefense)
  const confirmPvpHandoff = useGame((s) => s.confirmPvpHandoff)
  const [selectedAbility, setSelectedAbility] = useState(null)
  const [shaking, setShaking] = useState(false)
  const rollLock = useRef(false)

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
  const defenderAbilities = (defender?.abilities || [])
    .map((id) => ABILITIES[id])
    .filter(
      (ab) =>
        ab && ab.type === 'active' && defender.energy >= ab.energy &&
        !(isHealOnly(ab) && defender.hp >= defEff.maxHp),
    )

  const roll = () => {
    if (rollLock.current || combat.rolling) return
    rollLock.current = true
    sfx.dice()
    setShaking(true)
    setTimeout(() => setShaking(false), 450)
    combatRound(selectedAbility, combat.round)
    setTimeout(() => { rollLock.current = false }, 500)
  }

  const trait = !isPvp && def?.trait
  const traitName = typeof trait === 'string' ? trait : trait?.name
  const traitDesc = typeof trait === 'object' ? trait?.desc : null
  const defensePending = isPvp && (combat.pvpDefensePending || combat.phase === 'defender-choice')
  const pvpHandoff = combat.pvpHandoff === undefined
    ? defensePending ? 'defender' : !combat.over ? 'attacker' : null
    : combat.pvpHandoff
  const defenseStage = pvpHandoff === 'defender'
    ? 'handoff-defender'
    : pvpHandoff === 'attacker'
      ? 'handoff-attacker'
      : 'ready'

  const submitDefense = (choice) => {
    choosePvpDefense(choice)
  }

  if (defenseStage === 'handoff-defender') {
    return (
      <ModalShell
        className="handoff-modal"
        overlayClassName="overlay-privacy"
        ariaLabel="Pass the device to the duel defender"
      >
        <div className="handoff-icon" aria-hidden="true">🛡</div>
        <h2>Defender's secret response</h2>
        <p>Pass the device to <b>{defender.name}</b>. Their options stay hidden until they are ready.</p>
        <button
          className="btn-primary"
          data-autofocus
          onClick={confirmPvpHandoff}
        >
          I am {defender.name} · Reveal choices
        </button>
      </ModalShell>
    )
  }

  if (defenseStage === 'handoff-attacker') {
    return (
      <ModalShell
        className="handoff-modal"
        overlayClassName="overlay-privacy"
        ariaLabel="Pass the device back to the duel attacker"
      >
        <div className="handoff-icon" aria-hidden="true">⚔</div>
        <h2>Response locked</h2>
        <p>Pass the device back to <b>{p.name}</b>. The defender's response remains secret.</p>
        <button
          className="btn-primary"
          data-autofocus
          onClick={confirmPvpHandoff}
        >
          I am {p.name} · Resume duel
        </button>
      </ModalShell>
    )
  }

  return (
    <ModalShell
      className={`combat-modal ${shaking ? 'shake' : ''}`}
      overlayClassName="overlay-dark"
      ariaLabel={`${isPvp ? 'Duel' : 'Combat'} with ${foeName}`}
    >
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
            {traitName && (
              <div className="creature-trait" title={traitDesc || traitName}>
                {typeof trait === 'object' && trait.icon ? trait.icon : '◆'} {traitName}
              </div>
            )}
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
                    critFrom={isPvp ? (defEff?.critOn5 ? 5 : 6) : 99}
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

        {defensePending && choosePvpDefense ? (
          <div className="pvp-defense">
            <h2>{defender.name}, defend your ground</h2>
            <p>Pass the device to the defender, then choose a response before the duel roll.</p>
            <div className="combat-buttons">
              <button className="btn-primary" data-autofocus onClick={() => submitDefense('brace')}>🛡 Brace · +2 armor</button>
              <button className="btn-secondary" onClick={() => submitDefense('counter')}>⚔ Counter · +1 die</button>
              {defenderAbilities.map((ability) => (
                <button className="btn-secondary" key={ability.id} onClick={() => submitDefense({ type: 'ability', abilityId: ability.id })}>
                  <img className="chip-icon" src={abilityArt(ability.id)} alt="" /> {ability.name} ({ability.energy}⚡)
                </button>
              ))}
              {defender.consumables.map((id, index) => {
                const effects = ITEMS[id].effects || {}
                const usable = effects.combatArmor || (effects.heal && defender.hp < defEff.maxHp)
                if (!usable) return null
                return (
                  <button className="btn-secondary" key={`${id}-${index}`} onClick={() => submitDefense({ type: 'consumable', index })}>
                    <img className="chip-icon" src={itemArt(id)} alt="" /> {ITEMS[id].name}
                  </button>
                )
              })}
              <button className="btn-secondary" onClick={() => submitDefense({ type: 'withdraw' })}>🏳 Withdraw</button>
            </div>
          </div>
        ) : !combat.over ? (
          <>
            <div className="combat-options">
              {activeAbilities.map((ab) => {
                const usable =
                  !combat.abilityUsed && p.energy >= ab.energy && !(isHealOnly(ab) && p.hp >= eff.maxHp)
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
                  disabled={combat.consumableUsed || (ITEMS[id].effects.heal && p.hp >= eff.maxHp)}
                  onClick={() => consumeItem(i)}
                  aria-label={`Use ${ITEMS[id].name}`}
                >
                  <img className="chip-icon" src={itemArt(id)} alt="" /> {ITEMS[id].name}
                </button>
              ))}
            </div>
            <div className="combat-buttons">
              <button className="btn-primary" data-testid="combat-roll" disabled={combat.rolling} onClick={roll}>🎲 Roll Attack</button>
              <button className="btn-secondary" disabled={combat.rolling} onClick={combatFlee}>
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
                  : combat.defenderWithdrew
                    ? `${defender.name} withdrew from the duel.`
                    : isPvp ? 'You withdrew from the duel.' : 'You fled the battle.'}
            </div>
            <button className="btn-primary" onClick={closeCombat}>Continue</button>
          </div>
        )}
    </ModalShell>
  )
}
