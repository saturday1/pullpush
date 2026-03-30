const OFF_API: string = 'https://world.openfoodfacts.org'

export interface FoodProduct {
  product_name: string
  brand: string | null
  barcode?: string
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  kcal_per_100g: number
  source: string
}

interface OFFNutriments {
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
  'energy-kcal_100g'?: number
}

interface OFFProduct {
  product_name?: string
  product_name_en?: string
  brands?: string
  nutriments?: OFFNutriments
}

interface OFFBarcodeResponse {
  status: number
  product: OFFProduct
}

interface OFFSearchResponse {
  products?: OFFProduct[]
}

export async function fetchByBarcode(barcode: string): Promise<FoodProduct | null> {
  const res = await fetch(`${OFF_API}/api/v2/product/${barcode}.json`)
  const json: OFFBarcodeResponse = await res.json()
  if (json.status !== 1) return null
  const p = json.product
  return {
    product_name: p.product_name || p.product_name_en || '',
    brand: p.brands || null,
    barcode,
    protein_per_100g: p.nutriments?.proteins_100g ?? 0,
    carbs_per_100g: p.nutriments?.carbohydrates_100g ?? 0,
    fat_per_100g: p.nutriments?.fat_100g ?? 0,
    kcal_per_100g: p.nutriments?.['energy-kcal_100g'] ?? 0,
    source: 'openfoodfacts',
  }
}

export async function searchOpenFoodFacts(query: string): Promise<FoodProduct[]> {
  try {
    const res = await fetch(
      `${OFF_API}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,nutriments`
    )
    const json: OFFSearchResponse = await res.json()
    if (!json.products?.length) return []
    return json.products
      .filter((p): p is OFFProduct & { product_name: string } => !!p.product_name)
      .map((p): FoodProduct => ({
        product_name: p.product_name,
        brand: p.brands || null,
        protein_per_100g: p.nutriments?.proteins_100g ?? 0,
        carbs_per_100g: p.nutriments?.carbohydrates_100g ?? 0,
        fat_per_100g: p.nutriments?.fat_100g ?? 0,
        kcal_per_100g: p.nutriments?.['energy-kcal_100g'] ?? 0,
        source: 'openfoodfacts',
      }))
  } catch {
    return []
  }
}
