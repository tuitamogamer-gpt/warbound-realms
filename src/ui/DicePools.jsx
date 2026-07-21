export default function DicePools({
  ranged = 0,
  melee = 0,
  guard = 0,
  compact = false,
  className = '',
}) {
  return (
    <span
      className={`dice-pool-row ${compact ? 'dice-pool-row-compact' : ''} ${className}`.trim()}
      role="group"
      aria-label={`Hero dice pools: blue ranged ${ranged}, red melee ${melee}, green guard ${guard}`}
    >
      <span className="dice-pool-chip pool-ranged" title="Blue ranged dice · volley">
        <span aria-hidden="true">🏹</span>
        <span className="dice-pool-name">Ranged</span>
        <strong>{ranged}</strong>
      </span>
      <span className="dice-pool-chip pool-melee" title="Red melee dice · against creatures, every success reduces fixed Attack and then deals delayed damage">
        <span aria-hidden="true">⚔</span>
        <span className="dice-pool-name">Melee</span>
        <strong>{melee}</strong>
      </span>
      <span className="dice-pool-chip pool-defense" title="Green guard dice · test against creature Threat (5+ in duels)">
        <span aria-hidden="true">🛡</span>
        <span className="dice-pool-name">Guard</span>
        <strong>{guard}</strong>
      </span>
    </span>
  )
}
