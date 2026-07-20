export const d6 = (rng = Math.random) => 1 + Math.floor(rng() * 6)

export const rollDice = (count, rng = Math.random) =>
  Array.from({ length: Math.max(0, count) }, () => d6(rng))

// Heroes: 4-5 = 1 hit, 6 = 2 hits (crit). With critOn5, 5s also crit.
export const heroHits = (rolls, critOn5 = false) =>
  rolls.reduce((h, r) => h + (r >= (critOn5 ? 5 : 6) ? 2 : r >= 4 ? 1 : 0), 0)

// Creatures: hit on `hitOn`+
export const creatureHits = (rolls, hitOn) => rolls.reduce((h, r) => h + (r >= hitOn ? 1 : 0), 0)

export const shuffle = (arr, rng = Math.random) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)]
