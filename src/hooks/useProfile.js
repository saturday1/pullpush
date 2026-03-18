import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function calcMacros(weight, height, age, goalWeight) {
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

export function useProfile() {
  const [state, setState] = useState({
    loading: true,
    currentWeight: null,
    goalWeight: null,
    height: null,
    age: null,
    macros: null,
  })

  async function load() {
    const [{ data: profile }, { data: latestLog }] = await Promise.all([
      supabase.from('profile').select('goal_weight, height_cm, age').single(),
      supabase.from('weight_log').select('weight_kg, date').order('date', { ascending: false }).limit(1).single(),
    ])

    const currentWeight = latestLog?.weight_kg ?? null
    const goalWeight = profile?.goal_weight ?? null
    const height = profile?.height_cm ?? null
    const age = profile?.age ?? null
    const macros = currentWeight && height && age
      ? calcMacros(currentWeight, height, age, goalWeight)
      : null

    setState({ loading: false, currentWeight, goalWeight, height, age, macros })
  }

  useEffect(() => { load() }, [])

  async function logWeight(kg) {
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('weight_log').insert({ date: today, weight_kg: kg })
    if (!error) await load()
    return !error
  }

  async function updateProfile({ goal_weight, height_cm, age }) {
    const { error } = await supabase.from('profile').upsert({ id: 1, goal_weight, height_cm, age })
    if (!error) await load()
    return !error
  }

  return { ...state, logWeight, updateProfile }
}
