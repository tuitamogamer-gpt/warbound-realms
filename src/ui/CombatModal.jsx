import { useState, useEffect, useRef } from 'react'
import { useGame } from '../game/store'
import { CREATURES, creatureArt, minionArt } from '../data/creatures'
import { GAME } from '../data/constants'
import { HEROES, heroArt } from '../data/heroes'
import { ITEMS, itemArt } from '../data/items'
import { ABILITIES, abilityArt, isHealOnly } from '../data/abilities'
import { effStats } from '../game/rules'
import { sfx } from '../game/sfx'
import DicePools from './DicePools'
import ModalShell from './ModalShell'

function Die({ value, hitOn, critFrom = 99, delay, variant = '' }) {
  const isHit = value >= hitOn
  const isCrit = value >= critFrom
  const dieName = variant === 'ranged' ? 'Blue ranged' : variant === 'melee' ? 'Red melee' : variant === 'defense' ? 'Green guard' : 'Defender'
  return (
    <span
      className={`die ${variant ? `die-${variant}` : ''} ${isCrit ? 'die-crit' : isHit ? 'die-hit' : 'die-miss'}`}
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${dieName} die rolled ${value}: ${isCrit ? 'critical' : isHit ? 'success' : 'miss'}`}
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
    if (combat.heroDied) sfx.death()
    else if (combat.heroWon) sfx.kill()
    else if (combat.fled) sfx.flee()
  }, [combat?.over]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!combat) return null
  const p = players[combat.playerIdx]
  const hero = HEROES[p.heroId]
  const isPvp = !!combat.pvp
  const defender = isPvp ? players[combat.targetIdx] : null
  const def = isPvp ? null : CREATURES[combat.defId]
  const defEff = isPvp ? effStats(defender) : null
  const foeName = isPvp ? defender.name : `${combat.elite ? '👑 Elite ' : ''}${def.name}`
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
  // The fallbacks keep old saves and an in-flight engine migration readable.
  // New creature definitions expose threat/attack/armor directly.
  const creatureThreat = !isPvp ? (def?.threat ?? def?.hitOn ?? 5) : null
  const creatureAttack = !isPvp ? (def?.attack ?? def?.dice ?? 0) : null
  const creatureArmor = !isPvp ? (def?.armor ?? trait?.armor ?? 0) : null
  const provoked = !isPvp ? (combat.provoked ?? combat.threat ?? 0) : 0
  const provokedMax = GAME.PROVOKED_MAX ?? GAME.THREAT_MAX ?? 2
  const provokedAttack = provoked * (GAME.PROVOKED_ATTACK ?? 1)
  const minionAttack = !isPvp
    ? (combat.minionAttack ?? combat.minionDice ?? def?.minions?.attack ?? def?.minions?.dice ?? 0)
    : 0
  const livingMinions = !isPvp ? (combat.minions || []).filter((minion) => minion.hp > 0).length : 0
  const lastEnemyAttack = !isPvp ? combat.lastEnemyAttack : null
  const autoHitPhase = combat.lastAutoHitPhase ?? (combat.lastRangedRolls ? 'ranged' : 'melee')
  const enemyAttackTitle = lastEnemyAttack
    ? [
        `base ${lastEnemyAttack.base ?? creatureAttack}`,
        lastEnemyAttack.event ? `event +${lastEnemyAttack.event}` : null,
        lastEnemyAttack.trait ? `trait +${lastEnemyAttack.trait}` : null,
        lastEnemyAttack.minions ? `minions +${lastEnemyAttack.minions}` : null,
        lastEnemyAttack.provoked ? `provoked +${lastEnemyAttack.provoked}` : null,
        lastEnemyAttack.reduced ? `reduced −${lastEnemyAttack.reduced}` : null,
        `total ${lastEnemyAttack.total ?? creatureAttack}`,
      ].filter(Boolean).join(' · ')
    : ''
  const defensePending = isPvp && (combat.pvpDefensePending || combat.phase === 'defender-choice')
  // creature fights must never reach a handoff screen, whatever an old save carries
  const pvpHandoff = !isPvp
    ? null
    : combat.pvpHandoff === undefined
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
            <DicePools
              className="combat-dice-pools"
              ranged={eff.rangedDice}
              melee={eff.meleeDice}
              guard={eff.defenseDice}
            />
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
              ❤️ {isPvp ? `${defender.hp}/${defEff.maxHp}` : `${combat.hp}/${combat.maxHp}`}
              {isPvp && defEff.armor > 0 && <> · 🪨 {defEff.armor} armor</>}
            </div>
            {isPvp ? (
              <DicePools
                className="combat-dice-pools"
                ranged={defEff.rangedDice}
                melee={defEff.meleeDice}
                guard={defEff.defenseDice}
              />
            ) : (
              <div className="enemy-fixed-stats" aria-label={`Threat ${creatureThreat} plus, fixed Attack ${creatureAttack}, fixed Armor ${creatureArmor}`}>
                <span className="enemy-stat enemy-stat-threat" title="Every hero die must meet this target">
                  ☠ Threat <strong>{creatureThreat}+</strong>
                </span>
                <span className="enemy-stat enemy-stat-attack" title="Fixed retaliation before Guard and hero Armor">
                  ⚔ Attack <strong>{creatureAttack}</strong>
                </span>
                <span className="enemy-stat enemy-stat-armor" title="Automatically soaks this many incoming hits each round">
                  🪨 Armor <strong>{creatureArmor}</strong>
                </span>
              </div>
            )}
            {!isPvp && provoked > 0 && (
              <div className="creature-trait threat-badge" title={`Provoked ${provoked}/${provokedMax}: +${provokedAttack} fixed Attack after an escape or hero defeat`}>
                😡 Provoked {provoked}/{provokedMax} · +{provokedAttack} Attack
              </div>
            )}
            {traitName && (
              <div className="creature-trait" title={traitDesc || traitName}>
                {typeof trait === 'object' && trait.icon ? trait.icon : '◆'} {traitName}
              </div>
            )}
            {(combat.minions?.length || 0) > 0 && (
              <div className="minion-row" title={`${combat.minionName} — each living minion adds +${minionAttack} fixed Attack; your hits strike them first`}>
                {combat.minions.map((m, i) => (
                  <span key={i} className={`minion-chip ${m.hp <= 0 ? 'minion-dead' : ''}`}>
                    <img src={minionArt(combat.minionId)} alt={combat.minionName} />
                    <span className="minion-hp">{Math.max(0, m.hp)}/{combat.minionMaxHp}</span>
                  </span>
                ))}
                <span className="minion-attack">+{livingMinions * minionAttack} Attack</span>
              </div>
            )}
          </div>
        </div>

        {(combat.lastRangedRolls || combat.lastHeroRolls || (isPvp && (combat.lastCreatureRolls || combat.lastDefenderDefenseRolls)) || combat.lastDefenseRolls || lastEnemyAttack) && (
          <div className="dice-rows">
            {combat.lastRangedRolls && (
              <div className="dice-row">
                <span className="dice-label">🏹 Volley:</span>
                {combat.lastRangedRolls.map((v, i) => (
                  <Die key={`${combat.rollId}-r${i}`} value={v} hitOn={isPvp ? 5 : creatureThreat} critFrom={combat.lastCritOn5 ? 7 : 8} delay={i * 70} variant="ranged" />
                ))}
                {combat.lastAutoHits > 0 && autoHitPhase === 'ranged' && <span className="auto-hits">+{combat.lastAutoHits} auto</span>}
              </div>
            )}
            {combat.lastHeroRolls && (
              <div className="dice-row">
                <span className="dice-label">⚔ Clash:</span>
                {combat.lastHeroRolls.map((v, i) => (
                  <Die key={`${combat.rollId}-${i}`} value={v} hitOn={isPvp ? 5 : creatureThreat} critFrom={combat.lastCritOn5 ? 7 : 8} delay={i * 70} variant="melee" />
                ))}
                {combat.lastAutoHits > 0 && autoHitPhase === 'melee' && <span className="auto-hits">+{combat.lastAutoHits} auto</span>}
              </div>
            )}
            {isPvp && combat.lastCreatureRolls && (
              <div className="dice-row">
                <span className="dice-label">⚔ Def. Attack:</span>
                {combat.lastCreatureRolls.map((v, i) => (
                  <Die
                    key={`${combat.rollId}-c${i}`}
                    value={v}
                    hitOn={5}
                    critFrom={defEff?.critOn5 || combat.defenderCritOn5 ? 7 : 8}
                    delay={i * 70}
                  />
                ))}
              </div>
            )}
            {isPvp && combat.lastDefenderDefenseRolls && (
              <div className="dice-row" aria-label="Defender Guard dice">
                <span className="dice-label">🛡 Def. Guard:</span>
                {combat.lastDefenderDefenseRolls.map((v, i) => (
                  <Die key={`${combat.rollId}-dg${i}`} value={v} hitOn={6} delay={i * 70} variant="defense" />
                ))}
              </div>
            )}
            {combat.lastDefenseRolls && (
              <div className="dice-row">
                <span className="dice-label">🛡 {isPvp ? 'Atk. Guard:' : 'Guard:'}</span>
                {combat.lastDefenseRolls.map((v, i) => (
                  <Die key={`${combat.rollId}-d${i}`} value={v} hitOn={isPvp ? 6 : creatureThreat} delay={i * 70} variant="defense" />
                ))}
              </div>
            )}
            {lastEnemyAttack && (
              <div className="enemy-resolution" title={enemyAttackTitle}>
                <span className="dice-label">Creature:</span>
                {lastEnemyAttack.skipped ? (
                  <>
                    <span className="enemy-resolution-part enemy-resolution-attack">⚔ {lastEnemyAttack.total ?? creatureAttack}</span>
                    <strong className="log-good">prevented</strong>
                  </>
                ) : lastEnemyAttack.absorbed ? (
                  <>
                    <span className="enemy-resolution-part enemy-resolution-attack">⚔ {lastEnemyAttack.total ?? creatureAttack}</span>
                    <strong className="log-good">Ward absorbed · 0 damage</strong>
                  </>
                ) : (
                  <>
                    <span className="enemy-resolution-part enemy-resolution-attack">⚔ {lastEnemyAttack.total ?? creatureAttack}</span>
                    <span aria-hidden="true">−</span>
                    {lastEnemyAttack.redGuard != null || lastEnemyAttack.greenGuard != null ? (
                      <span className="enemy-guard-breakdown">
                        <span className="enemy-resolution-part pool-melee" title="Attack cancelled by red melee successes">⚔ {lastEnemyAttack.redGuard ?? 0}</span>
                        <span aria-hidden="true">+</span>
                        <span className="enemy-resolution-part pool-defense" title="Attack blocked by green guard successes">🛡 {lastEnemyAttack.greenGuard ?? 0}</span>
                      </span>
                    ) : (
                      <span className="enemy-resolution-part pool-defense">🛡 {lastEnemyAttack.guard ?? 0}</span>
                    )}
                    <span aria-hidden="true">−</span>
                    <span className="enemy-resolution-part enemy-resolution-armor">🪨 {lastEnemyAttack.armor ?? 0}</span>
                    <span aria-hidden="true">=</span>
                    <strong className={lastEnemyAttack.damage > 0 ? 'log-bad' : 'log-good'}>
                      {lastEnemyAttack.damage ?? 0} damage
                    </strong>
                  </>
                )}
                <small className="enemy-resolution-breakdown">{enemyAttackTitle}</small>
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
              <button className="btn-primary" data-testid="combat-roll" disabled={combat.rolling} onClick={roll}>
                {isPvp ? '🎲 Roll Duel Dice' : '🎲 Roll Hero Dice'}
              </button>
              <button className="btn-secondary" disabled={combat.rolling} onClick={combatFlee}>
                {isPvp ? '🏳 Withdraw' : '🏃 Flee'}
              </button>
            </div>
          </>
        ) : (
          <div className="combat-buttons">
            <div className={`combat-result ${combat.heroWon && !combat.heroDied ? 'good' : 'bad'}`}>
              {combat.heroWon && combat.heroDied
                ? `${foeName} is slain — but ${p.name} falls with it!`
                : combat.heroWon
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
