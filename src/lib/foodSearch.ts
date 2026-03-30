import { supabase } from '../supabase'
import { searchOpenFoodFacts, type FoodProduct } from './openfoodfacts'

export async function searchFood(query: string): Promise<FoodProduct[]> {
  // 1. Search OpenFoodFacts API first
  const apiResults = await searchOpenFoodFacts(query)
  if (apiResults.length > 0) return apiResults

  // 2. Fallback: search our local food_products table
  const { data } = await supabase
    .from('food_products')
    .select('*')
    .ilike('product_name', `%${query}%`)
    .limit(8)
  return (data as FoodProduct[]) ?? []
}
