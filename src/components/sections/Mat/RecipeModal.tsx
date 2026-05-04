import { useEffect, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { useTranslation } from 'react-i18next'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { useSubscription } from '../../../context/SubscriptionContext'
import { supabase } from '../../../supabase'
import { DB } from '../../../constants/database'
import { COLOR_PROTEIN, COLOR_CARBS, COLOR_FAT } from '../../../constants/colors'
import styles from './Mat.module.scss'

interface NativeBarcodeScanner {
    scan(): Promise<{ value: string }>
}
const NativeScanner: NativeBarcodeScanner | null = Capacitor.isNativePlatform()
    ? registerPlugin<NativeBarcodeScanner>('BarcodeScanner')
    : null

interface Nutriments {
    proteins_100g: number
    carbohydrates_100g: number
    fat_100g: number
    'energy-kcal_100g': number
}

interface SearchProduct {
    product_name: string
    brands?: string
    nutriments?: Partial<Nutriments & { energy_100g: number }>
    _fromCatalog?: boolean
    _catalogId?: number
    _skipUpsert?: boolean
}

interface FoodProduct {
    id: number
    barcode: string | null
    product_name: string
    brand: string | null
    protein_per_100g: number
    carbs_per_100g: number
    fat_per_100g: number
    kcal_per_100g: number
    source: string
}

export interface RecipeIngredient {
    id?: string
    product_id: number | string | null
    product_name: string
    quantity_g: number
    protein_g: number
    carbs_g: number
    fat_g: number
    kcal: number
    sort_order: number
}

export interface Recipe {
    id: string
    user_id: string
    name: string
    created_at: string
    ingredients?: RecipeIngredient[]
}

interface ManualProductFormData {
    product_name: string
    brand: string
    protein_per_100g: string
    carbs_per_100g: string
    fat_per_100g: string
    kcal_per_100g: string
}

interface RecipeModalProps {
    recipe?: Recipe | null
    initialIngredients?: RecipeIngredient[]
    onSaved: () => void
    onClose: () => void
    onDelete?: (id: string) => void
}

const r = (v: number): number => Math.round(v * 10) / 10

function stripGramsPrefix(name: string): string {
    return name.replace(/^\d+(\.\d+)?(g|ml)\s+/, '')
}

function pickFileFromInput(): Promise<File | null> {
    return new Promise(resolve => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.capture = 'environment'
        input.onchange = () => resolve(input.files?.[0] ?? null)
        const onFocus = (): void => { setTimeout(() => { if (!input.files?.length) resolve(null) }, 500); window.removeEventListener('focus', onFocus) }
        window.addEventListener('focus', onFocus)
        input.click()
    })
}

function resizeImageToBase64(file: File, maxSize = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const img = new Image()
            img.onload = () => {
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
                const w = Math.round(img.width * scale)
                const h = Math.round(img.height * scale)
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(img, 0, 0, w, h)
                const dataUrl = canvas.toDataURL('image/jpeg', quality)
                resolve(dataUrl.split(',')[1])
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = reader.result as string
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

export default function RecipeModal({ recipe, initialIngredients, onSaved, onClose, onDelete }: RecipeModalProps): React.JSX.Element {
    const { t } = useTranslation()
    const { requireUpgrade } = useSubscription()
    const [open, setOpen] = useState(true)
    const [name, setName] = useState(recipe?.name ?? '')
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe?.ingredients ?? initialIngredients ?? [])
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    // Ingredient search state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [addGrams, setAddGrams] = useState('100')
    const [unit, setUnit] = useState('g')
    const dropdownRef = useRef<HTMLDivElement | null>(null)

    // Scanner state
    const [scannerOpen, setScannerOpen] = useState(false)
    const [scanError, setScanError] = useState('')
    const [manualBarcode, setManualBarcode] = useState<string | null>(null)

    // Photo state
    const [photoLoading, setPhotoLoading] = useState(false)
    const [photoError, setPhotoError] = useState('')

    function handleClose(): void {
        setOpen(false)
        setTimeout(onClose, 500)
    }

    // Search logic (same as MealModal)
    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return }
        const timer = setTimeout(async () => {
            setSearchLoading(true)
            const q = searchQuery.trim()
            let results: SearchProduct[] = []
            try {
                const res = await fetch(
                    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=8&api_key=${import.meta.env.VITE_USDA_API_KEY}`
                )
                const data = await res.json()
                results = (data.foods ?? []).map((f: { description: string; brandOwner?: string; brandName?: string; foodNutrients?: Array<{ nutrientId: number; value: number }> }) => ({
                    product_name: f.description,
                    brands: f.brandOwner ?? f.brandName ?? '',
                    nutriments: {
                        proteins_100g: f.foodNutrients?.find(n => n.nutrientId === 1003)?.value ?? 0,
                        carbohydrates_100g: f.foodNutrients?.find(n => n.nutrientId === 1005)?.value ?? 0,
                        fat_100g: f.foodNutrients?.find(n => n.nutrientId === 1004)?.value ?? 0,
                        'energy-kcal_100g': f.foodNutrients?.find(n => n.nutrientId === 1008)?.value ?? 0,
                    }
                }))
            } catch { /* API failed */ }

            if (results.length === 0) {
                try {
                    const { data } = await supabase
                        .from(DB.FOOD_PRODUCTS)
                        .select('*')
                        .or(`product_name.ilike.%${q}%,brand.ilike.%${q}%`)
                        .limit(8)
                    results = ((data as FoodProduct[]) ?? []).map((p: FoodProduct) => ({
                        product_name: p.product_name,
                        brands: p.brand ?? '',
                        _fromCatalog: true,
                        _catalogId: p.id,
                        nutriments: {
                            proteins_100g: Number(p.protein_per_100g) || 0,
                            carbohydrates_100g: Number(p.carbs_per_100g) || 0,
                            fat_100g: Number(p.fat_per_100g) || 0,
                            'energy-kcal_100g': Number(p.kcal_per_100g) || 0,
                        }
                    }))
                } catch { /* ignore */ }
            }

            setSearchResults(results)
            setShowDropdown(results.length > 0)
            setSearchLoading(false)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent): void {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function addIngredientFromProduct(product: SearchProduct, productId: number | null): void {
        const g = parseFloat(addGrams) || 100
        const factor = g / 100
        const n = product.nutriments ?? {}
        const kcalPer100 = n['energy-kcal_100g'] ?? ((n as Record<string, number>)['energy_100g'] ?? 0) / 4.184

        const ingredient: RecipeIngredient = {
            product_id: productId,
            product_name: stripGramsPrefix(product.product_name),
            quantity_g: g,
            protein_g: r((n['proteins_100g'] ?? 0) * factor),
            carbs_g: r((n['carbohydrates_100g'] ?? 0) * factor),
            fat_g: r((n['fat_100g'] ?? 0) * factor),
            kcal: r(kcalPer100 * factor),
            sort_order: ingredients.length,
        }
        setIngredients(prev => [...prev, ingredient])
        setSearchQuery('')
        setSearchResults([])
        setShowDropdown(false)
    }

    async function selectProduct(product: SearchProduct): Promise<void> {
        const n = product.nutriments ?? {}
        const kcalPer100 = n['energy-kcal_100g'] ?? ((n as Record<string, number>)['energy_100g'] ?? 0) / 4.184

        let productId: number | null = null
        if (product._fromCatalog && product._catalogId) {
            productId = product._catalogId
        } else if (!product._skipUpsert) {
            try {
                const { data: inserted } = await supabase.from(DB.FOOD_PRODUCTS).insert({
                    product_name: product.product_name,
                    brand: product.brands || null,
                    protein_per_100g: n['proteins_100g'] ?? 0,
                    carbs_per_100g: n['carbohydrates_100g'] ?? 0,
                    fat_per_100g: n['fat_100g'] ?? 0,
                    kcal_per_100g: kcalPer100,
                    source: 'usda',
                }).select().single()
                if (inserted) productId = (inserted as FoodProduct).id
            } catch { /* ignore */ }
        }

        addIngredientFromProduct(product, productId)
    }

    async function handleBarcode(barcode: string): Promise<void> {
        setScanError('')
        setSearchLoading(true)
        try {
            // 1. OpenFoodFacts
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
            const data = await res.json()

            if (data.status === 1 && data.product?.product_name) {
                const p = data.product
                const n = p.nutriments ?? {}
                const nutrients = {
                    proteins_100g: n.proteins_100g ?? 0,
                    carbohydrates_100g: n.carbohydrates_100g ?? 0,
                    fat_100g: n.fat_100g ?? 0,
                    'energy-kcal_100g': n['energy-kcal_100g'] ?? 0,
                }

                let productId: number | null = null
                try {
                    const { data: existing } = await supabase
                        .from(DB.FOOD_PRODUCTS).select('id').eq('barcode', barcode).maybeSingle()
                    if (existing) {
                        productId = (existing as { id: number }).id
                    } else {
                        const { data: inserted } = await supabase.from(DB.FOOD_PRODUCTS).insert({
                            barcode,
                            product_name: p.product_name,
                            brand: p.brands || null,
                            protein_per_100g: nutrients.proteins_100g,
                            carbs_per_100g: nutrients.carbohydrates_100g,
                            fat_per_100g: nutrients.fat_100g,
                            kcal_per_100g: nutrients['energy-kcal_100g'],
                            source: 'openfoodfacts',
                        }).select().single()
                        if (inserted) productId = (inserted as FoodProduct).id
                    }
                } catch { /* ignore */ }

                addIngredientFromProduct({
                    product_name: p.product_name,
                    nutriments: nutrients,
                    _skipUpsert: true,
                }, productId)
                setScannerOpen(false)
                setSearchLoading(false)
                return
            }

            // 2. Local DB
            const { data: localProduct } = await supabase
                .from(DB.FOOD_PRODUCTS).select('*').eq('barcode', barcode).maybeSingle()

            if (localProduct) {
                const lp = localProduct as FoodProduct
                addIngredientFromProduct({
                    product_name: lp.product_name,
                    brands: lp.brand ?? '',
                    _fromCatalog: true,
                    _catalogId: lp.id,
                    _skipUpsert: true,
                    nutriments: {
                        proteins_100g: Number(lp.protein_per_100g) || 0,
                        carbohydrates_100g: Number(lp.carbs_per_100g) || 0,
                        fat_100g: Number(lp.fat_per_100g) || 0,
                        'energy-kcal_100g': Number(lp.kcal_per_100g) || 0,
                    },
                }, lp.id)
                setScannerOpen(false)
                setSearchLoading(false)
                return
            }

            // 3. Not found — manual entry
            setManualBarcode(barcode)
            setScannerOpen(false)
        } catch {
            setScanError(t('Could not fetch product'))
        }
        setSearchLoading(false)
    }

    async function handleManualProduct(manualForm: ManualProductFormData): Promise<void> {
        try {
            const { data: inserted } = await supabase.from(DB.FOOD_PRODUCTS).insert({
                barcode: manualBarcode,
                product_name: manualForm.product_name.trim(),
                brand: manualForm.brand.trim() || null,
                protein_per_100g: parseFloat(manualForm.protein_per_100g) || 0,
                carbs_per_100g: parseFloat(manualForm.carbs_per_100g) || 0,
                fat_per_100g: parseFloat(manualForm.fat_per_100g) || 0,
                kcal_per_100g: parseFloat(manualForm.kcal_per_100g) || 0,
                source: 'user',
            }).select().single()
            if (inserted) {
                const ins = inserted as FoodProduct
                addIngredientFromProduct({
                    product_name: ins.product_name,
                    _skipUpsert: true,
                    nutriments: {
                        proteins_100g: Number(ins.protein_per_100g),
                        carbohydrates_100g: Number(ins.carbs_per_100g),
                        fat_100g: Number(ins.fat_per_100g),
                        'energy-kcal_100g': Number(ins.kcal_per_100g),
                    },
                }, ins.id)
            }
        } catch { /* ignore */ }
        setManualBarcode(null)
    }

    async function handleFoodPhoto(): Promise<void> {
        if (!requireUpgrade('foodPhoto')) return
        setPhotoError('')
        try {
            const file = await pickFileFromInput()
            if (!file) return
            setPhotoLoading(true)
            const image_base64 = await resizeImageToBase64(file)
            const { data, error } = await supabase.functions.invoke('ai-food-scan', { body: { image_base64 } })
            if (error || !data) throw new Error(error?.message ?? 'No data')
            const foodName = stripGramsPrefix(data.food ?? 'Photo food')
            const ingredient: RecipeIngredient = {
                product_id: null,
                product_name: foodName,
                quantity_g: parseFloat(addGrams) || 100,
                protein_g: Math.round(data.protein_g ?? 0),
                carbs_g: Math.round(data.carbs_g ?? 0),
                fat_g: Math.round(data.fat_g ?? 0),
                kcal: Math.round(data.kcal ?? 0),
                sort_order: ingredients.length,
            }
            setIngredients(prev => [...prev, ingredient])
        } catch {
            setPhotoError(t('Could not analyze photo'))
        } finally {
            setPhotoLoading(false)
        }
    }

    function removeIngredient(idx: number): void {
        setIngredients(prev => prev.filter((_, i) => i !== idx))
    }

    const totals = ingredients.reduce(
        (acc, ing) => ({
            protein_g: acc.protein_g + ing.protein_g,
            carbs_g: acc.carbs_g + ing.carbs_g,
            fat_g: acc.fat_g + ing.fat_g,
            kcal: acc.kcal + ing.kcal,
        }),
        { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0 }
    )

    async function handleSave(): Promise<void> {
        if (!requireUpgrade('recipes')) return
        if (!name.trim() || ingredients.length === 0) return
        setSaving(true)
        setSaveError('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            if (recipe) {
                const { error: upErr } = await supabase.from(DB.RECIPES).update({ name: name.trim() }).eq('id', recipe.id)
                if (upErr) throw upErr
                const { error: delErr } = await supabase.from(DB.RECIPE_INGREDIENTS).delete().eq('recipe_id', recipe.id)
                if (delErr) throw delErr
                const { error: insErr } = await supabase.from(DB.RECIPE_INGREDIENTS).insert(
                    ingredients.map((ing, i) => ({
                        recipe_id: recipe.id,
                        product_id: ing.product_id,
                        product_name: ing.product_name,
                        quantity_g: ing.quantity_g,
                        protein_g: ing.protein_g,
                        carbs_g: ing.carbs_g,
                        fat_g: ing.fat_g,
                        kcal: ing.kcal,
                        sort_order: i,
                    }))
                )
                if (insErr) throw insErr
            } else {
                const { data: newRecipe, error } = await supabase.from(DB.RECIPES).insert({
                    user_id: user.id,
                    name: name.trim(),
                }).select().single()
                if (error || !newRecipe) throw error ?? new Error('Failed to create recipe')
                const { error: insErr } = await supabase.from(DB.RECIPE_INGREDIENTS).insert(
                    ingredients.map((ing, i) => ({
                        recipe_id: (newRecipe as Recipe).id,
                        product_id: ing.product_id,
                        product_name: ing.product_name,
                        quantity_g: ing.quantity_g,
                        protein_g: ing.protein_g,
                        carbs_g: ing.carbs_g,
                        fat_g: ing.fat_g,
                        kcal: ing.kcal,
                        sort_order: i,
                    }))
                )
                if (insErr) throw insErr
            }
            onSaved()
            handleClose()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message
                : (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message)
                : String(err)
            setSaveError(msg)
        } finally {
            setSaving(false)
        }
    }

    const valid = !!name.trim() && ingredients.length > 0

    // Manual product form for unknown barcode
    if (manualBarcode) {
        return <ManualProductFormInline barcode={manualBarcode} onSave={handleManualProduct} onCancel={() => setManualBarcode(null)} t={t} />
    }

    return (
        <Drawer.Root open={open} onOpenChange={v => { if (!v) handleClose() }}>
            <Drawer.Portal>
                <Drawer.Overlay className={styles.overlay} />
                <Drawer.Content className={styles.modal}>
                    <Drawer.Handle className={styles.modalHandle} />
                    <Drawer.Title className={styles.modalTitle}>
                        {recipe ? t('Edit recipe') : t('New recipe')}
                    </Drawer.Title>

                    <div className={styles.modalScroll}>
                        <div className={styles.modalFields}>
                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>{t('Recipe name')}</span>
                                <input
                                    className={styles.modalInput}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder={t('e.g. Chicken Bowl, Overnight oats...')}
                                    autoFocus
                                />
                            </label>
                        </div>

                        <div className={styles.searchSection} style={{ marginTop: 16 }}>
                            <span className={styles.searchSectionLabel}>{t('Add ingredient')}</span>
                            <div className={styles.searchRow} ref={dropdownRef}>
                                <div className={styles.searchWrap}>
                                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"/>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                    </svg>
                                    <input
                                        className={styles.searchInput}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder={t('e.g. chicken breast, oats…')}
                                        autoComplete="off"
                                    />
                                    {searchLoading && <span className={styles.searchSpinner} />}
                                    {showDropdown && (
                                        <div className={styles.searchDropdown}>
                                            {searchResults.map((p, i) => (
                                                <button key={i} className={styles.searchItem} type="button" onClick={() => selectProduct(p)}>
                                                    <span className={styles.searchItemName}>
                                                        {p._fromCatalog && <span className={styles.catalogBadge}>★</span>}
                                                        {p.product_name}
                                                    </span>
                                                    {p.brands && <span className={styles.searchItemBrand}>{p.brands.split(',')[0]}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button className={styles.scanBtn} type="button" onClick={() => { if (!requireUpgrade('barcodeScanner')) return; setScanError(''); setScannerOpen(true) }} title={t('Scan barcode')}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                                        <line x1="7" y1="12" x2="7" y2="12"/><line x1="12" y1="7" x2="12" y2="17"/>
                                        <line x1="17" y1="12" x2="17" y2="12"/>
                                    </svg>
                                </button>
                                <button className={styles.photoBtn} type="button" onClick={handleFoodPhoto} disabled={photoLoading} title={t('Snap food photo')}>
                                    {photoLoading ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.spin}>
                                            <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"/>
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                            <circle cx="12" cy="13" r="4"/>
                                        </svg>
                                    )}
                                </button>
                                <div className={styles.gramsWrap}>
                                    <input
                                        className={styles.gramsInput}
                                        type="number"
                                        min="1"
                                        value={addGrams}
                                        onChange={e => setAddGrams(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.unitToggle}
                                        onClick={() => setUnit(u => u === 'g' ? 'ml' : 'g')}
                                        title={t('Toggle g/ml')}
                                    >
                                        {unit}
                                    </button>
                                </div>
                            </div>
                            {scanError && <div className={styles.scanError}>{scanError}</div>}
                            {photoError && <div className={styles.scanError}>{photoError}</div>}
                        </div>

                        {scannerOpen && <BarcodeScannerInline onResult={handleBarcode} onClose={() => setScannerOpen(false)} t={t} />}

                        {ingredients.length > 0 && (
                            <div className={styles.recipeIngredients}>
                                {ingredients.map((ing, i) => (
                                    <div key={i} className={styles.ingredientRow}>
                                        <div className={styles.ingredientInfo}>
                                            <span className={styles.ingredientName}>{ing.quantity_g}{unit} {stripGramsPrefix(ing.product_name)}</span>
                                            <span className={styles.ingredientMacros}>
                                                <span style={{ color: COLOR_PROTEIN }}>{r(ing.protein_g)}p</span>
                                                {' '}
                                                <span style={{ color: COLOR_CARBS }}>{r(ing.carbs_g)}c</span>
                                                {' '}
                                                <span style={{ color: COLOR_FAT }}>{r(ing.fat_g)}f</span>
                                                {' '}
                                                <span>{r(ing.kcal)} kcal</span>
                                            </span>
                                        </div>
                                        <button className={styles.deleteBtn} type="button" onClick={() => removeIngredient(i)} title={t('Delete')}>✕</button>
                                    </div>
                                ))}
                                <div className={styles.recipeTotalRow}>
                                    <span>{t('Total')}</span>
                                    <span className={styles.ingredientMacros}>
                                        <span style={{ color: COLOR_PROTEIN }}>{r(totals.protein_g)}p</span>
                                        {' '}
                                        <span style={{ color: COLOR_CARBS }}>{r(totals.carbs_g)}c</span>
                                        {' '}
                                        <span style={{ color: COLOR_FAT }}>{r(totals.fat_g)}f</span>
                                        {' '}
                                        <span>{r(totals.kcal)} kcal</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {saveError && <div className={styles.saveError}>{saveError}</div>}
                        <div className={styles.modalActions}>
                            {recipe && onDelete && (
                                <button className={styles.cancelBtn} type="button" onClick={() => { if (confirm(t('Delete recipe?'))) { onDelete(recipe.id); handleClose() } }}>
                                    {t('Delete')}
                                </button>
                            )}
                            <button className={styles.cancelBtn} onClick={handleClose} type="button">{t('Cancel')}</button>
                            <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !valid} type="button">
                                {saving ? '…' : t('Save recipe')}
                            </button>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}

// --- Inline barcode scanner (same as Mat.tsx BarcodeScanner) ---

interface BarcodeScannerInlineProps {
    onResult: (barcode: string) => void
    onClose: () => void
    t: (key: string) => string
}

function BarcodeScannerInline({ onResult, onClose, t }: BarcodeScannerInlineProps): React.JSX.Element {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const [camError, setCamError] = useState<string | null>(null)
    const [manualCode, setManualCode] = useState('')

    function stopCamera(): void {
        const video = videoRef.current
        if (video && video.srcObject) {
            (video.srcObject as MediaStream).getTracks().forEach(track => track.stop())
            video.srcObject = null
        }
    }

    function handleClose(): void {
        stopCamera()
        onClose()
    }

    useEffect(() => {
        if (NativeScanner) {
            NativeScanner.scan()
                .then(({ value }) => onResult(value))
                .catch(() => onClose())
            return
        }

        let active = true
        const video = videoRef.current!
        const reader = new BrowserMultiFormatReader()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        let interval: ReturnType<typeof setInterval> | undefined

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                if (!active) { stream.getTracks().forEach(t => t.stop()); return }
                video.srcObject = stream
                video.play()
                interval = setInterval(() => {
                    if (!active || !video.videoWidth) return
                    canvas.width = video.videoWidth
                    canvas.height = video.videoHeight
                    ctx.drawImage(video, 0, 0)
                    try {
                        const result = reader.decodeFromCanvas(canvas)
                        if (result) {
                            active = false
                            clearInterval(interval)
                            stopCamera()
                            onResult(result.getText())
                        }
                    } catch { /* no barcode in frame */ }
                }, 200)
            })
            .catch(() => setCamError(t('Could not open camera')))

        return () => {
            active = false
            clearInterval(interval)
            stopCamera()
        }
    }, [])

    if (NativeScanner) return <></>

    return (
        <div className={styles.scannerOverlay} onClick={handleClose}>
            <div className={styles.scannerModal} onClick={e => e.stopPropagation()}>
                <div className={styles.scannerTitle}>{t('Point camera at barcode')}</div>
                {camError
                    ? <div className={styles.scannerError}>{camError}</div>
                    : <div className={styles.scannerVideoWrap}>
                        <video ref={videoRef} className={styles.scannerVideo} />
                        <div className={styles.scannerTarget} />
                    </div>
                }
                <div className={styles.scannerManualRow}>
                    <input
                        className={styles.scannerManualInput}
                        type="text"
                        inputMode="numeric"
                        value={manualCode}
                        onChange={e => setManualCode(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && manualCode.trim()) { stopCamera(); onResult(manualCode.trim()) } }}
                        placeholder={t('Enter barcode manually…')}
                    />
                    <button
                        className={styles.scannerManualBtn}
                        type="button"
                        disabled={!manualCode.trim()}
                        onClick={() => { stopCamera(); onResult(manualCode.trim()) }}
                    >{t('Search')}</button>
                </div>
                <button className={styles.scannerCancelBtn} onClick={handleClose} type="button">{t('Cancel')}</button>
            </div>
        </div>
    )
}

// --- Inline manual product form (same as Mat.tsx ManualProductForm) ---

interface ManualProductFormInlineProps {
    barcode: string
    onSave: (form: ManualProductFormData) => Promise<void>
    onCancel: () => void
    t: (key: string) => string
}

function ManualProductFormInline({ barcode, onSave, onCancel, t }: ManualProductFormInlineProps): React.JSX.Element {
    const [form, setForm] = useState<ManualProductFormData>({ product_name: '', brand: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '', kcal_per_100g: '' })
    const [saving, setSaving] = useState(false)
    const set = (k: keyof ManualProductFormData, v: string): void => setForm(f => ({ ...f, [k]: v }))
    const valid = !!form.product_name.trim()

    async function handleSave(): Promise<void> {
        setSaving(true)
        await onSave(form)
        setSaving(false)
    }

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ position: 'relative', maxHeight: '80vh', margin: 'auto' }}>
                <div className={styles.modalTitle}>{t('New product')}</div>
                <div className={styles.scanBarcodeLabel}>{t('Barcode')}: {barcode}</div>
                <div className={styles.modalScroll}>
                    <div className={styles.modalFields}>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel}>{t('Product name')} *</span>
                            <input className={styles.modalInput} value={form.product_name} onChange={e => set('product_name', e.target.value)} autoFocus />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel}>{t('Brand')}</span>
                            <input className={styles.modalInput} value={form.brand} onChange={e => set('brand', e.target.value)} />
                        </label>
                        <div className={styles.macroInputRow}>
                            <label className={styles.modalField}>
                                <span className={styles.modalLabel} style={{ color: COLOR_PROTEIN }}>{t('Protein / 100g')}</span>
                                <input className={styles.modalInput} type="number" min="0" step="0.1" value={form.protein_per_100g} onChange={e => set('protein_per_100g', e.target.value)} />
                            </label>
                            <label className={styles.modalField}>
                                <span className={styles.modalLabel} style={{ color: COLOR_CARBS }}>{t('Carbs / 100g')}</span>
                                <input className={styles.modalInput} type="number" min="0" step="0.1" value={form.carbs_per_100g} onChange={e => set('carbs_per_100g', e.target.value)} />
                            </label>
                            <label className={styles.modalField}>
                                <span className={styles.modalLabel} style={{ color: COLOR_FAT }}>{t('Fat / 100g')}</span>
                                <input className={styles.modalInput} type="number" min="0" step="0.1" value={form.fat_per_100g} onChange={e => set('fat_per_100g', e.target.value)} />
                            </label>
                            <label className={styles.modalField}>
                                <span className={styles.modalLabel}>Kcal / 100g</span>
                                <input className={styles.modalInput} type="number" min="0" step="0.1" value={form.kcal_per_100g} onChange={e => set('kcal_per_100g', e.target.value)} />
                            </label>
                        </div>
                    </div>
                    <div className={styles.modalActions}>
                        <button className={styles.cancelBtn} onClick={onCancel} type="button">{t('Cancel')}</button>
                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !valid} type="button">
                            {saving ? '…' : t('Save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
