// Small, serializable PRNG helpers. The store persists only the uint32 state,
// so a saved match resumes with exactly the same future rolls and deck order.
export const DEFAULT_SEED = 0x57a2e19d

export const normalizeSeed = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_SEED
  const seed = numeric >>> 0
  return seed || DEFAULT_SEED
}

export const seedFromText = (text) => {
  let hash = 2166136261
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return normalizeSeed(hash)
}

// Mulberry32: compact, quick and deterministic across modern JS runtimes.
export const nextRandom = (state) => {
  const next = (normalizeSeed(state) + 0x6d2b79f5) >>> 0
  let value = next
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return {
    state: next,
    value: ((value ^ (value >>> 14)) >>> 0) / 4294967296,
  }
}
