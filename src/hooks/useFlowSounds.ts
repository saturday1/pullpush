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

  function beep(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3): void {
    if (!isEnabled()) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = type
      osc.frequency.value = freq
      g.gain.value = gain
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  // Countdown tick: short crisp beep
  const playCountdownTick = useCallback(() => {
    beep(880, 0.08, 'square', 0.15)
  }, [])

  // GO! Rising sweep
  const playGo = useCallback(() => {
    if (!isEnabled()) return
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15)
      g.gain.value = 0.2
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
    } catch {}
  }, [])

  // Rest start: soft low tone
  const playRestStart = useCallback(() => {
    beep(440, 0.3, 'sine', 0.2)
  }, [])

  // Rest ending: double beep
  const playRestEnd = useCallback(() => {
    beep(1000, 0.08, 'square', 0.15)
    setTimeout(() => beep(1000, 0.08, 'square', 0.15), 150)
  }, [])

  // Set complete: pleasant two-tone chime
  const playSetComplete = useCallback(() => {
    beep(800, 0.15, 'sine', 0.25)
    setTimeout(() => beep(1200, 0.2, 'sine', 0.25), 120)
  }, [])

  // Call this during a user gesture (click/tap) to unlock AudioContext
  const warmUp = useCallback(() => {
    const ctx = getCtx()
    // Play a silent buffer to unlock audio on iOS
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
