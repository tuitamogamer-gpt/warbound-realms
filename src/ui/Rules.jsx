export default function Rules({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal rules-modal" onClick={(e) => e.stopPropagation()}>
        <h2>How to Play</h2>
        <div className="rules-body">
          <h3>Goal</h3>
          <p>
            Two factions — the <b style={{ color: '#5b9bff' }}>Radiant Accord</b> and the{' '}
            <b style={{ color: '#ff6b6b' }}>Emberclaw Dominion</b> — race to slay{' '}
            <b>Vhalrax the Undying</b>. He awakens at Blackspire Citadel at the start of{' '}
            <b>round 6</b>. If nobody kills him by the end of <b>round 10</b>, the faction
            with the most <b>victory points (VP)</b> wins (ties: most gold).
          </p>

          <h3>Your turn</h3>
          <ul>
            <li><b>Move</b> up to your Movement value along connected regions (click a glowing region).</li>
            <li>Take <b>one action</b>: <b>Fight</b> a creature in your region, <b>Duel</b> an enemy hero sharing it, or <b>Rest</b> (+4 HP, +2 energy).</li>
            <li><b>Shopping</b> in a town is free — it does not use your action.</li>
            <li>You may keep moving after your action if you have movement left.</li>
            <li>You cannot enter the enemy capital. Blackspire is sealed until Vhalrax awakens.</li>
          </ul>

          <h3>Combat</h3>
          <ul>
            <li>Each combat round you roll your <b>attack dice</b>: 4–5 = 1 hit, 6 = 2 hits. Hits wound the creature.</li>
            <li>If it survives, it strikes back: it rolls its dice and hits on 5+ (Vhalrax on 4+). Damage = its hits − your armor.</li>
            <li>Before rolling you may use <b>one of your abilities</b> (costs energy) or a consumable.</li>
            <li>You may <b>flee</b> between rounds — the creature keeps its wounds.</li>
            <li>If you die: you lose half your gold and return to your capital, restored, on your next turn.</li>
          </ul>

          <h3>Growth</h3>
          <ul>
            <li>Kills and quests give <b>XP</b>. Levels (max 5) grant health, energy, dice and armor.</li>
            <li>At <b>levels 2 and 4</b> you choose a <b>talent</b> — and unlock a new <b>ability slot</b>.</li>
            <li>Visit a town <b>Trainer</b> to buy class abilities with gold — attacks, wards and passives unique to your hero.</li>
            <li>Gold also buys <b>items</b> in towns: one weapon, one armor, one trinket, plus up to 3 consumables.</li>
            <li>Press <b>C</b> (or click your portrait) to open the <b>character sheet</b> with equipment, spells and record.</li>
            <li>Slain creatures return to their region two rounds later.</li>
          </ul>

          <h3>Duels (PvP)</h3>
          <ul>
            <li>From <b>round 1</b>, sharing a region with an enemy hero lets you spend your action to <b>duel</b> them.</li>
            <li>You attack with your full dice and abilities; they strike back with theirs. Armor blocks on both sides.</li>
            <li>Win a duel: <b>+2 VP, +2 XP</b>, and you loot the gold the loser drops. The loser retreats to their capital.</li>
            <li><b>Towns are sanctuaries</b> — no duels inside any town. You may withdraw between duel rounds.</li>
          </ul>

          <h3>Quests</h3>
          <ul>
            <li>You always work on up to <b>2 quests</b>. When below that, you <b>draw two quest cards and keep one</b>.</li>
            <li>Quests reward <b>XP, gold and victory points</b> — shown on every card before you choose.</li>
            <li>Hunt quests want a specific beast; travel quests just need you to reach a place.</li>
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
      </div>
    </div>
  )
}
