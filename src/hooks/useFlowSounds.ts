import { useCallback, useRef } from 'react'
import { STORAGE } from '../constants/storage'
import { Capacitor, registerPlugin } from '@capacitor/core'
import goSound from '../sounds/ElevenLabs_2026-04-15T10_49_37_Saga_gen_sp100_s50_sb75_v3.mp3'
import restStartSound from '../sounds/rest.mp3'
import restEndSound from '../sounds/rest is over.mp3'
import beepSound from '../sounds/beep.mp3'
import oneSound from '../sounds/one.mp3'
import twoSound from '../sounds/two.mp3'
import threeSound from '../sounds/three.mp3'
import fourSound from '../sounds/four.mp3'
import fiveSound from '../sounds/five.mp3'

const NUMBER_WORDS: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' }
const NUMBER_SOUNDS: Record<number, string> = { 1: oneSound, 2: twoSound, 3: threeSound, 4: fourSound, 5: fiveSound }

export type CountdownStyle = 'voice' | 'beep'
export function getCountdownStyle(): CountdownStyle {
  return (localStorage.getItem(STORAGE.COUNTDOWN_STYLE) as CountdownStyle) ?? 'voice'
}
export function setCountdownStyle(v: CountdownStyle): void {
  localStorage.setItem(STORAGE.COUNTDOWN_STYLE, v)
}

// How many seconds the audible countdown covers (3 or 5)
export function getCountdownLength(): 3 | 5 {
  const v = localStorage.getItem(STORAGE.COUNTDOWN_LENGTH)
  return v === '3' ? 3 : 5
}
export function setCountdownLength(v: 3 | 5): void {
  localStorage.setItem(STORAGE.COUNTDOWN_LENGTH, String(v))
}

interface RestTimerPlugin {
  playSound(options: { name: string }): Promise<void>
  setKeepAwake(options: { keep: boolean }): Promise<void>
  scheduleSound(options: { name: string, delayMs: number }): Promise<void>
  scheduleSoundSequence(options: { items: { name: string, delayMs: number }[], startTime: number }): Promise<void>
  cancelScheduledSounds(): Promise<void>
}

export const IS_NATIVE = Capacitor.isNativePlatform()

const RestTimer: RestTimerPlugin | null = Capacitor.isNativePlatform()
  ? registerPlugin<RestTimerPlugin>('RestTimer')
  : null

export function useFlowSounds(): {
  enabled: boolean
  setEnabled: (v: boolean) => void
  warmUp: () => void
  playCountdownTick: (seconds: number) => void
  playGo: () => void
  playRestStart: () => void
  playRestEnd: () => void
  playSetComplete: () => void
  scheduleSoundSequence: (items: { name: string, delayMs: number }[], startTime?: number) => void
  cancelScheduledSounds: () => void
  isNative: boolean
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
    return localStorage.getItem(STORAGE.FLOW_SOUNDS) !== 'false'
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
  const goAudioRef = useRef<HTMLAudioElement | null>(null)
  const restStartAudioRef = useRef<HTMLAudioElement | null>(null)
  const restEndAudioRef = useRef<HTMLAudioElement | null>(null)
  const beepAudioRef = useRef<HTMLAudioElement | null>(null)
  const numberAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({})

  function playFile(ref: React.MutableRefObject<HTMLAudioElement | null>, src: string): void {
    if (!isEnabled()) return
    try {
      if (!ref.current) ref.current = new Audio(src)
      ref.current.currentTime = 0
      ref.current.play().catch(() => {})
    } catch {}
  }

  // Countdown tick: voice (speak number) or beep — user-configurable
  const playCountdownTick = useCallback((seconds: number) => {
    if (!isEnabled()) return
    // Only play audible countdown within the user-selected range (3 or 5 seconds)
    if (seconds > getCountdownLength()) return
    const style = getCountdownStyle()
    if (style === 'beep') {
      if (RestTimer) { RestTimer.playSound({ name: 'tick' }).catch(() => {}); return }
      playFile(beepAudioRef, beepSound)
      return
    }
    // voice
    const word = NUMBER_WORDS[seconds]
    const src = NUMBER_SOUNDS[seconds]
    if (!word || !src) return
    if (RestTimer) { RestTimer.playSound({ name: word }).catch(() => {}); return }
    if (!numberAudioRefs.current[seconds]) numberAudioRefs.current[seconds] = new Audio(src)
    const el = numberAudioRefs.current[seconds]!
    el.currentTime = 0
    el.play().catch(() => {})
  }, [])

  // GO! sound: native on iOS (ducks Spotify), HTMLAudio on web
  const playGo = useCallback(() => {
    if (!isEnabled()) return
    if (RestTimer) { RestTimer.playSound({ name: 'go' }).catch(() => {}); return }
    playFile(goAudioRef, goSound)
  }, [])

  // Rest start: voice file (native on iOS, HTMLAudio on web)
  const playRestStart = useCallback(() => {
    if (!isEnabled()) return
    if (RestTimer) { RestTimer.playSound({ name: 'rest' }).catch(() => {}); return }
    playFile(restStartAudioRef, restStartSound)
  }, [])

  // Rest ending tick (last 3 sec warning): 24-style double bip (kept as synth)
  const playRestEnd = useCallback(() => {
    tone(260, 0.08, 'square', 0.15)
    setTimeout(() => tone(260, 0.08, 'square', 0.15), 120)
  }, [])

  // Rest is over / set complete: voice file (native on iOS, HTMLAudio on web)
  const playSetComplete = useCallback(() => {
    if (!isEnabled()) return
    if (RestTimer) { RestTimer.playSound({ name: 'rest_end' }).catch(() => {}); return }
    playFile(restEndAudioRef, restEndSound)
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

  // Schedule a sequence of sounds natively (iOS only) — plays even with locked screen.
  // Accepts optional startTime (JS Date.now() at anchor) so native aligns with JS clock.
  const scheduleSoundSequence = useCallback((items: { name: string, delayMs: number }[], startTime?: number) => {
    if (!isEnabled() || !RestTimer) return
    RestTimer.scheduleSoundSequence({ items, startTime: startTime ?? Date.now() }).catch(() => {})
  }, [])

  const cancelScheduledSounds = useCallback(() => {
    if (!RestTimer) return
    RestTimer.cancelScheduledSounds().catch(() => {})
  }, [])

  return {
    enabled: isEnabled(),
    setEnabled: (v: boolean) => localStorage.setItem(STORAGE.FLOW_SOUNDS, String(v)),
    warmUp,
    playCountdownTick,
    playGo,
    playRestStart,
    playRestEnd,
    playSetComplete,
    scheduleSoundSequence,
    cancelScheduledSounds,
    isNative: IS_NATIVE,
  }
}
