import ModalShell from './ModalShell'

export default function Rules({ onClose }) {
  return (
    <ModalShell className="rules-modal" ariaLabel="How to play" onClose={onClose} closeOnBackdrop>
        <h2>How to Play</h2>
        <div className="rules-body">
          <h3>Goal</h3>
          <p>
            Two factions — the <b style={{ color: '#5b9bff' }}>Radiant Accord</b> and the{' '}
            <b style={{ color: '#ff6b6b' }}>Emberclaw Dominion</b> — race to defeat{' '}
            <b>Vhalrax the Undying</b>. He awakens at Blackspire Citadel at the start of{' '}
            <b>round 6</b>. When he falls, the faction with the most still-counted damage contribution wins
            (final blow breaks a tie). If nobody kills him by the end of <b>round 10</b>, the faction
            with the most <b>victory points (VP)</b> wins (ties: most gold).
          </p>
          <p>Play with <b>2 players (1 vs 1)</b> or <b>4 players (2 vs 2)</b>. Initiative alternates between factions each round.</p>

          <h3>Your turn</h3>
          <ul>
            <li><b>Move</b> up to your Movement value along connected regions (click a glowing region).</li>
            <li>Take <b>one action</b>: <b>Fight</b> a creature in your region, <b>Duel</b> an enemy hero sharing it, or <b>Rest</b> (+4 HP, +2 energy).</li>
            <li>Share a region with a teammate to spend your action and <b>aid</b> them.</li>
            <li><b>Shopping</b> in a town is free — it does not use your action.</li>
            <li>You may keep moving after your action if you have movement left.</li>
            <li>You cannot enter the enemy capital. Blackspire is sealed until Vhalrax awakens.</li>
          </ul>

          <h3>Combat — heroes roll, creatures threaten</h3>
          <ul>
            <li>Every hero can carry all three color-coded pools of <b>eight-sided dice</b>: <b>blue 🏹 ranged</b>, <b>red ⚔ melee</b> and <b>green 🛡 guard</b>. Earned attack dice (levels, items, talents) and combat bonuses go to the hero's favored attack pool.</li>
            <li>Every creature card shows three fixed values: <b>Threat</b> is the target all three of your hero dice colors test against, <b>Attack</b> is its guaranteed retaliation, and <b>Armor</b> automatically soaks that many incoming hits each round. Creatures never roll dice.</li>
            <li><b>Phase 1 — the volley</b>: blue ranged dice fire first. Meet the creature's Threat for 1 hit; an 8 is a 2-hit critical. Kill it here and it never strikes back.</li>
            <li><b>Phase 2 — the clash</b>: every red melee success blunts the creature's fixed Attack by one, then all red successes become delayed melee hits (after the creature's Armor). The clash is simultaneous, so a creature may still wound you as it falls.</li>
            <li>Each green 🛡 die that meets the creature's Threat blocks one point of Attack. Red clash guard and green guard combine before flat hero Armor reduces whatever remains. In hero duels, attack dice hit on 5+ (8s crit) and guard succeeds on 6+.</li>
            <li>Before rolling you may use <b>one ability</b> (costs energy) and up to <b>one consumable</b>.</li>
            <li>Great beasts fight with <b>⚑ minions</b>: your hits strike the minions first, and each living minion adds fixed Attack — a sharp volley clears them before they matter.</li>
            <li>Creature <b>traits</b> change the normal rhythm — inspect the region or combat card before committing.</li>
            <li>You may <b>flee</b> between rounds — normal creatures keep their wounds but grow <b>😡 provoked</b> (+1 fixed Attack, up to +2, also when they fell a hero), while Vhalrax regenerates 5 health, grows provoked, and that healed damage no longer counts toward faction contribution.</li>
            <li>If you die: you lose half your gold and return to your capital, restored, on your next turn.</li>
          </ul>

          <h3>Growth</h3>
          <ul>
            <li>Kills and quests give <b>XP</b>. Levels (max 5) grant health, energy, dice and armor.</li>
            <li>At <b>levels 2 and 4</b> you choose a <b>talent</b>; new <b>ability slots</b> open at levels 2, 4 and 5.</li>
            <li>Visit a town <b>Trainer</b> to buy class abilities with gold — attacks, wards and passives unique to your hero.</li>
            <li>Gold also buys <b>items</b> in towns: one weapon, one armor, one trinket, plus up to 3 consumables.</li>
            <li>Press <b>C</b> (or click your portrait) to open the <b>character sheet</b> with equipment, spells and record.</li>
            <li>Slain creatures return to their region two rounds later — sometimes as <b>👑 Elites</b> with extra health that pay out +1 XP, gold and VP.</li>
            <li>Slain creatures sometimes drop a <b>💰 treasure cache</b> on their region — the first hero to arrive loots it.</li>
          </ul>

          <h3>Duels (PvP)</h3>
          <ul>
            <li>From <b>round 1</b>, sharing a region with an enemy hero lets you spend your action to <b>duel</b> them.</li>
            <li>Duels are hero against hero, so <b>both heroes still roll</b>. They use the same colored volley/clash pools: the attacker's ranged dice fire first, then the defender answers in the clash. The defender's green Guard roll is shared across both attack phases; the attacker's Guard protects against the counterattack. Flat armor protects both sides.</li>
            <li>The defender secretly chooses a response before the roll: brace, counter, use an ability or consumable, or withdraw.</li>
            <li>Win a duel: <b>+2 VP, +2 XP</b>, and you loot the gold the loser drops. The loser retreats to their capital.</li>
            <li>If both heroes fall in the same clash, the duel has no victor — no VP, XP or loot for either side.</li>
            <li><b>Towns are sanctuaries</b> — no duels inside any town. You may withdraw between duel rounds.</li>
          </ul>

          <h3>Quests</h3>
          <ul>
            <li>You always work on up to <b>2 quests</b>. When below that, you <b>draw two quest cards and keep one</b>.</li>
            <li>Quests reward <b>XP, gold and victory points</b> — shown on every card before you choose.</li>
            <li>Hunt quests want a specific beast; travel quests just need you to reach a place.</li>
            <li>At a town, you may abandon or reroll an impossible contract.</li>
          </ul>

          <h3>Camera</h3>
          <ul>
            <li><b>Drag</b> to rotate, <b>scroll</b> to zoom, <b>right-drag</b> to pan around the table.</li>
            <li>Keys: <b>Q/E</b> rotate, <b>W/S</b> tilt, <b>+/−</b> zoom, <b>F</b> focus your hero, <b>R</b> reset view.</li>
            <li>Or use the camera buttons in the lower-right corner. Hover any region or creature for details.</li>
          </ul>

          <h3>Rounds &amp; events</h3>
          <p>
            Every round begins with an <b>event card</b> that shapes the whole round —
            blood moons empower monsters, caravans lower prices, storms slow travel...
          </p>
        </div>
        <button className="btn-primary" onClick={onClose}>Close</button>
    </ModalShell>
  )
}
