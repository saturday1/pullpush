const OFF_API = 'https://world.openfoodfacts.org'

export async function fetchByBarcode(barcode) {
  const res = await fetch(`${OFF_API}/api/v2/product/${barcode}.json`)
  const json = await res.json()
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

export async function searchOpenFoodFacts(query) {
  try {
    const res = await fetch(
      `${OFF_API}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,nutriments`
    )
    const json = await res.json()
    if (!json.products?.length) return []
    return json.products
      .filter(p => p.product_name)
      .map(p => ({
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
