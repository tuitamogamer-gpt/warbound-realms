// Sound kit: ElevenLabs-generated MP3s in /public/sfx, with the original
// procedural WebAudio synth as a fallback while files load (or if they fail).
let ctx = null
let muted = false
try {
  muted = localStorage.getItem('wb-muted') === '1'
} catch {
  /* storage blocked (cookies disabled / sandboxed iframe) — default to unmuted */
}

// decode every fetched mp3 as soon as we have a context (first user gesture),
// so one-shot stingers like boss/death play their real files, not the synth
function decodePending(a) {
  for (const entry of Object.values(BANK)) {
    if (!entry.raw) continue
    const raw = entry.raw
    entry.raw = null
    a.decodeAudioData(
      raw,
      (buf) => {
        entry.buffer = buf
      },
      () => {
        entry.failed = true
      }
    )
  }
}

const ac = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended' && !muted) ctx.resume()
  decodePending(ctx)
  return ctx
}

export const isMuted = () => muted
export const setMuted = (m) => {
  muted = m
  // silence in-flight audio immediately (stingers run up to ~2.8s)
  if (ctx) {
    if (m) ctx.suspend()
    else ctx.resume()
  }
  try {
    localStorage.setItem('wb-muted', m ? '1' : '0')
  } catch {
    /* private mode — sound preference just won't persist */
  }
}

// ---------- file-backed playback ----------
// name -> { gain, raw?: ArrayBuffer, buffer?: AudioBuffer, failed?: bool }
const BANK = {
  click: { gain: 0.3 },
  move: { gain: 0.35 },
  dice: { gain: 0.55 },
  hit: { gain: 0.55 },
  kill: { gain: 0.5 },
  coin: { gain: 0.45 },
  levelup: { gain: 0.5 },
  death: { gain: 0.55 },
  boss: { gain: 0.65 },
  flee: { gain: 0.45 },
  quest: { gain: 0.5 },
  pvp: { gain: 0.55 },
}

// fetch eagerly (no user gesture needed); decode lazily on first play
if (typeof window !== 'undefined') {
  for (const [name, entry] of Object.entries(BANK)) {
    fetch(`/sfx/${name}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((raw) => {
        entry.raw = raw
      })
      .catch(() => {
        entry.failed = true // synth fallback takes over
      })
  }
}

function play(name) {
  if (muted) return
  const entry = BANK[name]
  try {
    const a = ac()
    if (entry.buffer) {
      const src = a.createBufferSource()
      src.buffer = entry.buffer
      const g = a.createGain()
      g.gain.value = entry.gain
      src.connect(g).connect(a.destination)
      src.start()
      return
    }
  } catch {
    /* audio unavailable */
  }
  // file not decoded yet (or failed) — cover the gap with the synth
  FALLBACK[name]?.()
}

// ---------- procedural fallback synth ----------
function tone({ freq = 440, dur = 0.15, type = 'triangle', gain = 0.08, when = 0, slide = 0 }) {
  if (muted) return
  try {
    const a = ac()
    const t0 = a.currentTime + when
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur)
    g.gain.setValueAtTime(gain, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(a.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  } catch {
    /* ignore */
  }
}

function noise({ dur = 0.12, gain = 0.06, when = 0 }) {
  if (muted) return
  try {
    const a = ac()
    const t0 = a.currentTime + when
    const len = Math.floor(a.sampleRate * dur)
    const buf = a.createBuffer(1, len, a.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = a.createBufferSource()
    src.buffer = buf
    const g = a.createGain()
    g.gain.setValueAtTime(gain, t0)
    src.connect(g).connect(a.destination)
    src.start(t0)
  } catch {
    /* ignore */
  }
}

const FALLBACK = {
  click: () => tone({ freq: 620, dur: 0.06, type: 'square', gain: 0.035 }),
  move: () => tone({ freq: 320, dur: 0.1, type: 'sine', gain: 0.05, slide: 120 }),
  dice: () => {
    noise({ dur: 0.09, gain: 0.05 })
    noise({ dur: 0.07, gain: 0.045, when: 0.08 })
    tone({ freq: 900, dur: 0.05, type: 'square', gain: 0.02, when: 0.15 })
  },
  hit: () => {
    noise({ dur: 0.1, gain: 0.07 })
    tone({ freq: 160, dur: 0.14, type: 'sawtooth', gain: 0.05, slide: -80 })
  },
  kill: () => {
    tone({ freq: 392, dur: 0.12, gain: 0.06 })
    tone({ freq: 523, dur: 0.12, gain: 0.06, when: 0.1 })
    tone({ freq: 659, dur: 0.2, gain: 0.06, when: 0.2 })
  },
  coin: () => {
    tone({ freq: 988, dur: 0.07, type: 'square', gain: 0.04 })
    tone({ freq: 1319, dur: 0.12, type: 'square', gain: 0.035, when: 0.06 })
  },
  levelup: () => {
    tone({ freq: 523, dur: 0.1, gain: 0.06 })
    tone({ freq: 659, dur: 0.1, gain: 0.06, when: 0.09 })
    tone({ freq: 784, dur: 0.1, gain: 0.06, when: 0.18 })
    tone({ freq: 1047, dur: 0.25, gain: 0.06, when: 0.27 })
  },
  death: () => {
    tone({ freq: 220, dur: 0.3, type: 'sawtooth', gain: 0.06, slide: -140 })
    tone({ freq: 110, dur: 0.45, type: 'sawtooth', gain: 0.05, when: 0.2, slide: -60 })
  },
  boss: () => {
    tone({ freq: 65, dur: 0.7, type: 'sawtooth', gain: 0.09, slide: -20 })
    tone({ freq: 98, dur: 0.5, type: 'sawtooth', gain: 0.06, when: 0.15, slide: -30 })
    noise({ dur: 0.4, gain: 0.03, when: 0.1 })
  },
  flee: () => tone({ freq: 500, dur: 0.18, type: 'sine', gain: 0.05, slide: -260 }),
  quest: () => {
    tone({ freq: 784, dur: 0.1, gain: 0.05 })
    tone({ freq: 988, dur: 0.1, gain: 0.05, when: 0.08 })
    tone({ freq: 1319, dur: 0.22, gain: 0.05, when: 0.16 })
  },
  pvp: () => {
    noise({ dur: 0.08, gain: 0.06 })
    tone({ freq: 1200, dur: 0.16, type: 'square', gain: 0.03, slide: -300 })
    tone({ freq: 800, dur: 0.2, type: 'square', gain: 0.025, when: 0.07, slide: -200 })
  },
}

export const sfx = {
  click: () => play('click'),
  move: () => play('move'),
  dice: () => play('dice'),
  hit: () => play('hit'),
  kill: () => play('kill'),
  coin: () => play('coin'),
  levelup: () => play('levelup'),
  death: () => play('death'),
  boss: () => play('boss'),
  flee: () => play('flee'),
  quest: () => play('quest'),
  pvp: () => play('pvp'),
}
