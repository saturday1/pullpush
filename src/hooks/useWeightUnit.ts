import { useState, useCallback } from 'react'

export type WeightUnit = 'both' | 'kg' | 'lbs'

const STORAGE_KEY = 'pullpush_weightUnit'
const KG_TO_LBS = 2.20462

function getStored(): WeightUnit {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'kg' || v === 'lbs' || v === 'both') return v
  return 'both'
}

export function useWeightUnit(): [WeightUnit, (unit: WeightUnit) => void] {
  const [unit, setUnit] = useState<WeightUnit>(getStored)
  const set = useCallback((u: WeightUnit) => {
    setUnit(u)
    localStorage.setItem(STORAGE_KEY, u)
  }, [])
  return [unit, set]
}

export function toLbs(kg: number): number {
  return +(kg * KG_TO_LBS).toFixed(1)
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  const lbs = toLbs(kg)
  switch (unit) {
    case 'kg': return `${kg} kg`
    case 'lbs': return `${lbs} lbs`
    case 'both': return `${kg} kg / ${lbs} lbs`
  }
}

export function formatWeightJsx(kg: number, unit: WeightUnit): [string, string | null] {
  const lbs = toLbs(kg)
  switch (unit) {
    case 'kg': return [`${kg} kg`, null]
    case 'lbs': return [`${lbs} lbs`, null]
    case 'both': return [`${kg} kg`, `${lbs} lbs`]
  }
}
