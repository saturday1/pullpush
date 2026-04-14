import { useCallback, useRef } from 'react'
import tickSound from '../sounds/cinematic_tick.wav'
import goSound from '../sounds/Go.mp3'

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

  // Preload audio files
  const tickAudioRef = useRef<HTMLAudioElement | null>(null)
  const goAudioRef = useRef<HTMLAudioElement | null>(null)

  function playFile(ref: React.MutableRefObject<HTMLAudioElement | null>, src: string): void {
    if (!isEnabled()) return
    try {
      if (!ref.current) ref.current = new Audio(src)
      ref.current.currentTime = 0
      ref.current.play().catch(() => {})
    } catch {}
  }

  // Countdown tick: cinematic tick sound file
  const playCountdownTick = useCallback(() => {
    playFile(tickAudioRef, tickSound)
  }, [])

  // GO! sound file
  const playGo = useCallback(() => {
    playFile(goAudioRef, goSound)
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
