import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'

interface Macros {
  bmr: number
  tdee: number
  deficit: number
  targetKcal: number
  protein: number
  fat: number
  carbs: number
  proteinPct: number
  fatPct: number
  carbPct: number
}

interface TrainingSession {
  id: string
  user_id: string
  program_id: string
  name: string
  day_of_week: number
  sort_order: number
  [key: string]: unknown
}

interface TrainingProgram {
  id: string
  user_id: string
  name: string
  created_at: string
  [key: string]: unknown
}

interface ProfileState {
  loading: boolean
  profileLoading: boolean
  weightLoading: boolean
  sessionsLoading: boolean
  programsLoading: boolean
  exercisesLoading: boolean
  firstName: string | null
  lastName: string | null
  birthDate: string | null
  phone: string | null
  startWeight: number | null
  currentWeight: number | null
  goalWeight: number | null
  height: number | null
  age: number | null
  macros: Macros | null
  sessions: TrainingSession[]
  programs: TrainingProgram[]
  activeProgramId: string | null
  restSeconds: number
  secPerRep: number
  countdownSeconds: number
  sidePauseSeconds: number
}

interface ProfileUpdate {
  goal_weight?: number | null
  start_weight?: number | null
  height_cm?: number | null
  first_name?: string | null
  last_name?: string | null
  birth_date?: string | null
  phone?: string | null
  rest_seconds?: number | null
  sec_per_rep?: number | null
  countdown_seconds?: number | null
  side_pause_seconds?: number | null
}

interface SessionInput {
  user_id: string
  program_id: string
  name: string
  day_of_week: number
  [key: string]: unknown
}

interface SessionSaveInput {
  day_of_week: number
  name: string
  [key: string]: unknown
}

interface ProfileContextValue extends ProfileState {
  logWeight: (kg: number) => Promise<boolean>
  updateProfile: (data: ProfileUpdate) => Promise<boolean>
  saveSessions: (sessionsArray: SessionSaveInput[]) => Promise<void>
  addSession: (sessionData: SessionInput) => Promise<TrainingSession | null>
  createProgram: (name: string) => Promise<void>
  switchProgram: (id: string) => Promise<void>
  renameProgram: (id: string, name: string) => Promise<void>
  deleteProgram: (id: string) => Promise<void>
  load: () => Promise<void>
  setExercisesLoading: (loading: boolean) => void
}

function calcMacros(weight: number, height: number, age: number): Macros {
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5)
  const tdee = Math.round(bmr * 1.55)
  const deficit = 280
  const targetKcal = tdee - deficit

  const protein = Math.round(2.85 * weight)
  const proteinKcal = protein * 4
  const fatKcal = Math.round(targetKcal * 0.33)
  const fat = Math.round(fatKcal / 9)
  const carbs = Math.round((targetKcal - proteinKcal - fatKcal) / 4)

  const proteinPct = Math.round((proteinKcal / targetKcal) * 100)
  const fatPct = Math.round((fatKcal / targetKcal) * 100)
  const carbPct = 100 - proteinPct - fatPct

  return { bmr, tdee, deficit, targetKcal, protein, fat, carbs, proteinPct, fatPct, carbPct }
}

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

interface ProfileProviderProps {
  children: ReactNode
}

export function ProfileProvider({ children }: ProfileProviderProps): React.JSX.Element {
  const [state, setState] = useState<ProfileState>({
    loading: true,
    profileLoading: true,
    weightLoading: true,
    sessionsLoading: true,
    programsLoading: true,
    exercisesLoading: true,
    firstName: null,
    lastName: null,
    birthDate: null,
    phone: null,
    startWeight: null,
    currentWeight: null,
    goalWeight: null,
    height: null,
    age: null,
    macros: null,
    sessions: [],
    programs: [],
    activeProgramId: null,
    restSeconds: 90,
    secPerRep: 4,
    countdownSeconds: 10,
    sidePauseSeconds: 5,
  })

  async function load(silent: boolean = false): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Reset loading flags (skip on silent refresh to avoid splash screen)
    if (!silent) {
      setState(prev => ({
        ...prev,
        loading: true,
        profileLoading: true,
        weightLoading: true,
        sessionsLoading: true,
        programsLoading: true,
      }))
    }

    // Fire all queries in parallel, but update state as each resolves
    const profilePromise = supabase
      .from('profile')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const latestLogPromise = supabase
      .from('weight_log')
      .select('weight_kg')
      .eq('user_id', user.id)
      .order('id', { ascending: false })
      .limit(1)
      .single()

    const firstLogPromise = supabase
      .from('weight_log')
      .select('weight_kg')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .limit(1)
      .single()

    const programsPromise = supabase
      .from('training_programs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')

    // Weight data resolves independently
    Promise.all([latestLogPromise, firstLogPromise]).then(([{ data: latestLog }, { data: firstLog }]) => {
      const currentWeight: number | null = latestLog?.weight_kg ?? null
      const firstLogWeight: number | null = firstLog?.weight_kg ?? null
      setState(prev => {
        // Prefer start_weight from profile, fall back to first weight_log entry
        const startWeight = prev.startWeight ?? firstLogWeight
        const newState: ProfileState = { ...prev, currentWeight, startWeight, weightLoading: false }
        // Recalculate macros if profile data is already available
        if (!prev.profileLoading && currentWeight && prev.height && prev.age) {
          newState.macros = calcMacros(currentWeight, prev.height, prev.age)
        }
        newState.loading = !prev.profileLoading && !prev.sessionsLoading && !prev.programsLoading ? false : prev.loading
        return newState
      })
    })

    // Programs resolve independently
    programsPromise.then(({ data: programsData }) => {
      setState(prev => {
        const newState: ProfileState = { ...prev, programs: programsData ?? [], programsLoading: false }
        newState.loading = !prev.profileLoading && !prev.weightLoading && !prev.sessionsLoading ? false : prev.loading
        return newState
      })
    })

    // Profile + sessions: sessions depend on activeProgramId from profile
    profilePromise.then(async ({ data: profile }) => {
      const activeProgramId: string | null = profile?.active_program_id ?? null
      const goalWeight: number | null = profile?.goal_weight ?? null
      const startWeight: number | null = profile?.start_weight ?? null
      const height: number | null = profile?.height_cm ?? null
      const firstName: string | null = profile?.first_name ?? null
      const lastName: string | null = profile?.last_name ?? null
      const birthDate: string | null = profile?.birth_date ?? null
      const phone: string | null = profile?.phone ?? null
      const restSeconds: number = profile?.rest_seconds ?? 90
      const secPerRep: number = profile?.sec_per_rep ?? 4
      const countdownSeconds: number = profile?.countdown_seconds ?? 10
      const sidePauseSeconds: number = profile?.side_pause_seconds ?? 5
      const age = calcAge(birthDate)

      setState(prev => {
        const newState: ProfileState = {
          ...prev,
          firstName, lastName, birthDate, phone, goalWeight, height, age, activeProgramId, restSeconds, secPerRep, countdownSeconds, sidePauseSeconds,
          startWeight: startWeight ?? prev.startWeight,
          profileLoading: false,
        }
        // Recalculate macros if weight data is already available
        if (!prev.weightLoading && prev.currentWeight && height && age) {
          newState.macros = calcMacros(prev.currentWeight, height, age)
        }
        newState.loading = !prev.weightLoading && !prev.sessionsLoading && !prev.programsLoading ? false : prev.loading
        return newState
      })

      // If no active program, try to use the first available one
      let resolvedProgramId = activeProgramId
      if (!resolvedProgramId) {
        const { data: progs } = await supabase.from('training_programs').select('id').eq('user_id', user.id).order('created_at').limit(1)
        if (progs?.[0]) {
          resolvedProgramId = progs[0].id
          await supabase.from('profile').upsert({ user_id: user.id, active_program_id: resolvedProgramId }, { onConflict: 'user_id' })
        }
      }

      // Now fetch sessions based on activeProgramId
      const { data: sessionsData } = resolvedProgramId
        ? await supabase.from('training_sessions').select('*').eq('user_id', user.id).eq('program_id', resolvedProgramId).order('day_of_week')
        : { data: [] as TrainingSession[] }

      setState(prev => {
        const sessions: TrainingSession[] = sessionsData ?? []
        const newState: ProfileState = { ...prev, sessions, sessionsLoading: false, activeProgramId: resolvedProgramId ?? prev.activeProgramId }
        newState.loading = !prev.profileLoading && !prev.weightLoading && !prev.programsLoading ? false : prev.loading
        return newState
      })
    })
  }

  useEffect(() => { load() }, [])

  async function logWeight(kg: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('weight_log').insert({ date: today, weight_kg: kg, user_id: user.id })
    if (!error) await load(true)
    return !error
  }

  async function updateProfile({ goal_weight, start_weight, height_cm, first_name, last_name, birth_date, phone, rest_seconds, sec_per_rep, countdown_seconds, side_pause_seconds }: ProfileUpdate): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const row: Record<string, unknown> = { user_id: user.id, goal_weight, height_cm, first_name, last_name, birth_date, phone }
    if (start_weight != null) row.start_weight = start_weight
    if (rest_seconds != null) row.rest_seconds = rest_seconds
    if (sec_per_rep != null) row.sec_per_rep = sec_per_rep
    if (countdown_seconds != null) row.countdown_seconds = countdown_seconds
    if (side_pause_seconds != null) row.side_pause_seconds = side_pause_seconds
    const { error } = await supabase.from('profile').upsert(
      row,
      { onConflict: 'user_id' }
    )
    if (!error) await load(true)
    return !error
  }

  async function addSession(sessionData: SessionInput): Promise<TrainingSession | null> {
    const { data } = await supabase.from('training_sessions').insert(sessionData).select().single()
    if (data) {
      setState(prev => ({
        ...prev,
        sessions: [...prev.sessions, data as TrainingSession].sort((a, b) => a.day_of_week - b.day_of_week),
      }))
    }
    return (data as TrainingSession | null) ?? null
  }

  async function createProgram(name: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prog } = await supabase.from('training_programs').insert({ user_id: user.id, name }).select().single()
    if (prog) {
      await supabase.from('profile').upsert({ user_id: user.id, active_program_id: prog.id }, { onConflict: 'user_id' })
    }
    await load(true)
  }

  async function switchProgram(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setState(prev => ({ ...prev, activeProgramId: id, sessions: [], sessionsLoading: true }))
    await supabase.from('profile').upsert({ user_id: user.id, active_program_id: id }, { onConflict: 'user_id' })
    const { data: sessionsData } = await supabase.from('training_sessions').select('*').eq('user_id', user.id).eq('program_id', id).order('day_of_week')
    setState(prev => ({ ...prev, sessions: (sessionsData ?? []) as TrainingSession[], sessionsLoading: false }))
  }

  async function renameProgram(id: string, name: string): Promise<void> {
    await supabase.from('training_programs').update({ name }).eq('id', id)
    await load(true)
  }

  async function deleteProgram(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Switch to another program first if this is active
    const other = state.programs.find(p => p.id !== id)
    if (other) {
      await supabase.from('profile').upsert({ user_id: user.id, active_program_id: other.id }, { onConflict: 'user_id' })
    } else {
      await supabase.from('profile').upsert({ user_id: user.id, active_program_id: null }, { onConflict: 'user_id' })
    }
    await supabase.from('training_programs').delete().eq('id', id)
    await load(true)
  }

  async function saveSessions(sessionsArray: SessionSaveInput[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('training_sessions').delete().eq('user_id', user.id)
    if (sessionsArray.length > 0) {
      const rows = sessionsArray.map((s, i) => ({
        user_id: user.id,
        day_of_week: s.day_of_week,
        name: s.name,
        sort_order: i,
      }))
      await supabase.from('training_sessions').insert(rows)
    }
    await load(true)
  }

  function setExercisesLoading(loading: boolean): void {
    setState(prev => ({ ...prev, exercisesLoading: loading }))
  }

  return (
    <ProfileContext.Provider value={{ ...state, logWeight, updateProfile, saveSessions, addSession, createProgram, switchProgram, renameProgram, deleteProgram, load, setExercisesLoading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue | null {
  return useContext(ProfileContext)
}
