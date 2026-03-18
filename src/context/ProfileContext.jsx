import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

function calcMacros(weight, height, age) {
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

function calcAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
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
  })

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profile }, { data: latestLog }, { data: firstLog }, { data: programsData }] = await Promise.all([
      supabase.from('profile').select('goal_weight, height_cm, first_name, last_name, birth_date, phone, active_program_id').eq('user_id', user.id).single(),
      supabase.from('weight_log').select('weight_kg').eq('user_id', user.id).order('id', { ascending: false }).limit(1).single(),
      supabase.from('weight_log').select('weight_kg').eq('user_id', user.id).order('id', { ascending: true }).limit(1).single(),
      supabase.from('training_programs').select('*').eq('user_id', user.id).order('created_at'),
    ])

    const activeProgramId = profile?.active_program_id ?? null
    const programs = programsData ?? []

    const { data: sessionsData } = activeProgramId
      ? await supabase.from('training_sessions').select('*').eq('user_id', user.id).eq('program_id', activeProgramId).order('day_of_week')
      : { data: [] }

    const currentWeight = latestLog?.weight_kg ?? null
    const startWeight = firstLog?.weight_kg ?? null
    const goalWeight = profile?.goal_weight ?? null
    const height = profile?.height_cm ?? null
    const firstName = profile?.first_name ?? null
    const lastName = profile?.last_name ?? null
    const birthDate = profile?.birth_date ?? null
    const phone = profile?.phone ?? null
    const age = calcAge(birthDate)
    const macros = currentWeight && height && age
      ? calcMacros(currentWeight, height, age)
      : null
    const sessions = sessionsData ?? []

    setState({ loading: false, firstName, lastName, birthDate, phone, startWeight, currentWeight, goalWeight, height, age, macros, sessions, programs, activeProgramId })
  }

  useEffect(() => { load() }, [])

  async function logWeight(kg) {
    const { data: { user } } = await supabase.auth.getUser()
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('weight_log').insert({ date: today, weight_kg: kg, user_id: user.id })
    if (!error) await load()
    return !error
  }

  async function updateProfile({ goal_weight, height_cm, first_name, last_name, birth_date, phone }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profile').upsert(
      { user_id: user.id, goal_weight, height_cm, first_name, last_name, birth_date, phone },
      { onConflict: 'user_id' }
    )
    if (!error) await load()
    return !error
  }

  async function createProgram(name) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prog } = await supabase.from('training_programs').insert({ user_id: user.id, name }).select().single()
    if (prog) {
      await supabase.from('profile').upsert({ user_id: user.id, active_program_id: prog.id }, { onConflict: 'user_id' })
    }
    await load()
  }

  async function switchProgram(id) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profile').upsert({ user_id: user.id, active_program_id: id }, { onConflict: 'user_id' })
    await load()
  }

  async function renameProgram(id, name) {
    await supabase.from('training_programs').update({ name }).eq('id', id)
    await load()
  }

  async function deleteProgram(id) {
    const { data: { user } } = await supabase.auth.getUser()
    // Switch to another program first if this is active
    const other = state.programs.find(p => p.id !== id)
    if (other) {
      await supabase.from('profile').upsert({ user_id: user.id, active_program_id: other.id }, { onConflict: 'user_id' })
    } else {
      await supabase.from('profile').upsert({ user_id: user.id, active_program_id: null }, { onConflict: 'user_id' })
    }
    await supabase.from('training_programs').delete().eq('id', id)
    await load()
  }

  async function saveSessions(sessionsArray) {
    const { data: { user } } = await supabase.auth.getUser()
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
    await load()
  }

  return (
    <ProfileContext.Provider value={{ ...state, logWeight, updateProfile, saveSessions, createProgram, switchProgram, renameProgram, deleteProgram, load }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
