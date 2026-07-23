// The table rolls eight-siders, as the 2005 classic did.
export const d8 = (rng = Math.random) => 1 + Math.floor(rng() * 8)

export const rollDice = (count, rng = Math.random) =>
  Array.from({ length: Math.max(0, count) }, () => d8(rng))

// Hero attack dice in duels: 5-7 = 1 hit, 8 = 2 hits (crit).
// With critOn5 (the "keen edge" buff), 7s also crit.
export const heroHits = (rolls, critOn5 = false) =>
  rolls.reduce((h, r) => h + (r >= (critOn5 ? 7 : 8) ? 2 : r >= 5 ? 1 : 0), 0)

// Ranged dice score like melee — their edge is the phase: the volley
// resolves before the enemy can answer at all.
export const rangedHits = (rolls, critOn5 = false) =>
  rolls.reduce((h, r) => h + (r >= (critOn5 ? 7 : 8) ? 2 : r >= 5 ? 1 : 0), 0)

// Defense dice in duels: each 6+ blocks one incoming hit before armor applies.
export const defenseBlocks = (rolls) => rolls.reduce((b, r) => b + (r >= 6 ? 1 : 0), 0)

// Creature combat: every hero color tests against the creature's Threat.
// Attack colors retain this game's critical-hit rule; green produces one
// guard for every successful die.
export const threatHits = (rolls, threat, critOn5 = false) =>
  rolls.reduce((hits, face) => {
    if (face < threat) return hits
    return hits + (face >= (critOn5 ? 7 : 8) ? 2 : 1)
  }, 0)

export const threatBlocks = (rolls, threat) =>
  rolls.reduce((blocks, face) => blocks + (face >= threat ? 1 : 0), 0)

export const shuffle = (arr, rng = Math.random) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)]
