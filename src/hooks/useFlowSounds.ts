import { useCallback, useRef } from 'react'

const STORAGE_KEY = 'pullpush_flowSounds'

export function useFlowSounds(): {
  enabled: boolean
  setEnabled: (v: boolean) => void
  warmUp: () => void
  playCountdownTick: () => void
  playGo: () => void
  playRestStart: () => void
  playRestEnd: () => void
  playSetComplete: () => void
} {
  const ctxRef = useRef<AudioContext | null>(null)

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }

  function isEnabled(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  }

  function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3, fadeOut = true): void {
    if (!isEnabled()) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.value = gain
      if (fadeOut) g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  // 24-style deep countdown: low punchy "bip" (like CTU clock)
  const playCountdownTick = useCallback(() => {
    tone(220, 0.12, 'square', 0.2)
    // Subtle harmonic on top
    setTimeout(() => tone(440, 0.06, 'sine', 0.08), 10)
  }, [])

  // GO! Deep aggressive rising hit
  const playGo = useCallback(() => {
    if (!isEnabled()) return
    try {
      const ctx = getCtx()
      // Low punch
      const osc1 = ctx.createOscillator()
      const g1 = ctx.createGain()
      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(120, ctx.currentTime)
      osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12)
      g1.gain.value = 0.25
      g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc1.connect(g1)
      g1.connect(ctx.destination)
      osc1.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.2)
      // High accent
      const osc2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = 660
      g2.gain.value = 0.15
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc2.connect(g2)
      g2.connect(ctx.destination)
      osc2.start(ctx.currentTime + 0.05)
      osc2.stop(ctx.currentTime + 0.2)
    } catch {}
  }, [])

  // Rest start: deep muted thud
  const playRestStart = useCallback(() => {
    tone(180, 0.25, 'sine', 0.2)
  }, [])

  // Rest ending tick: 24-style double bip
  const playRestEnd = useCallback(() => {
    tone(260, 0.08, 'square', 0.15)
    setTimeout(() => tone(260, 0.08, 'square', 0.15), 120)
  }, [])

  // Set complete: deep satisfying two-tone
  const playSetComplete = useCallback(() => {
    tone(330, 0.15, 'sine', 0.2)
    setTimeout(() => tone(440, 0.2, 'sine', 0.2), 100)
  }, [])

  // Call during user gesture to unlock AudioContext
  const warmUp = useCallback(() => {
    const ctx = getCtx()
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  }, [])

  return {
    enabled: isEnabled(),
    setEnabled: (v: boolean) => localStorage.setItem(STORAGE_KEY, String(v)),
    warmUp,
    playCountdownTick,
    playGo,
    playRestStart,
    playRestEnd,
    playSetComplete,
  }
}
