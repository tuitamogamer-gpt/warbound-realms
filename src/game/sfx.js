// Tiny procedural sound kit — no audio files, just WebAudio oscillators.
let ctx = null
let muted = false
try {
  muted = localStorage.getItem('wb-muted') === '1'
} catch {
  /* storage blocked (cookies disabled / sandboxed iframe) — default to unmuted */
}

const ac = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export const isMuted = () => muted
export const setMuted = (m) => {
  muted = m
  try {
    localStorage.setItem('wb-muted', m ? '1' : '0')
  } catch {
    /* private mode — sound preference just won't persist */
  }
}

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
    /* audio unavailable — play silently on */
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

export const sfx = {
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
}
