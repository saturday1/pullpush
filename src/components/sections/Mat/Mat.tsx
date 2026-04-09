import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { supabase } from '../../../supabase'
import { useProfile } from '../../../context/ProfileContext'
import Skeleton from '../../Skeleton/Skeleton'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Mat.module.scss'

// --- Data interfaces ---

interface MealFormData {
    time_label: string
    label: string
    food: string
    note: string
    protein_g: string
    carbs_g: string
    fat_g: string
    kcal: string
    product_id: number | null
    grams: string
}

interface Meal {
    id: number
    user_id: string
    day_type: string
    sort_order: number
    time_label: string
    label: string
    food: string
    note: string | null
    protein_g: number
    carbs_g: number
    fat_g: number
    kcal: number
    product_id: number | null
    grams: number | null
    meal_date: string
    is_recurring: boolean
    recurring_until: string | null
}

interface Nutriments {
    proteins_100g: number
    carbohydrates_100g: number
    fat_100g: number
    'energy-kcal_100g': number
}

interface BaseNutrients {
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

interface ManualProductFormData {
    product_name: string
    brand: string
    protein_per_100g: string
    carbs_per_100g: string
    fat_per_100g: string
    kcal_per_100g: string
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

interface Supplement {
    name: string
    dose: string
    info: string
    blue?: boolean
}

interface MealTotals {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
}

// --- Constants ---

const EMPTY_FORM: MealFormData = { time_label: '', label: '', food: '', note: '', protein_g: '', carbs_g: '', fat_g: '', kcal: '', product_id: null, grams: '' }

// --- Date helpers ---

function localDateStr(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() + days)
    return localDateStr(dt)
}

function formatDateLabel(dateStr: string, todayStr: string, t: TFunction): string {
    if (dateStr === todayStr) return t('Today')
    if (dateStr === addDays(todayStr, -1)) return t('Yesterday')
    if (dateStr === addDays(todayStr, 1)) return t('Tomorrow')
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${t(dayNames[dt.getDay()])} ${dt.getDate()} ${t(monthNames[dt.getMonth()])}`
}

// --- Sub-components ---

interface DatePickerProps {
    value: string
    todayStr: string
    anchorRect: DOMRect
    onChange: (dateStr: string) => void
    onClose: () => void
    t: TFunction
}

function DatePicker({ value, todayStr, anchorRect, onChange, onClose, t }: DatePickerProps): React.JSX.Element {
    const [vy, vm] = value.split('-').map(Number)
    const [viewYear, setViewYear] = useState<number>(vy)
    const [viewMonth, setViewMonth] = useState<number>(vm - 1) // 0-indexed
    const popoverRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        function onDocClick(e: MouseEvent): void {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        function onKey(e: KeyboardEvent): void {
            if (e.key === 'Escape') onClose()
        }
        // Defer so the click that opened the popover doesn't immediately close it
        const id = setTimeout(() => {
            document.addEventListener('mousedown', onDocClick)
        }, 0)
        document.addEventListener('keydown', onKey)
        return () => {
            clearTimeout(id)
            document.removeEventListener('mousedown', onDocClick)
            document.removeEventListener('keydown', onKey)
        }
    }, [onClose])

    // Position: centered horizontally under the anchor, clamped to viewport
    const popWidth = Math.min(300, window.innerWidth - 32)
    const anchorCenterX = anchorRect.left + anchorRect.width / 2
    let left = anchorCenterX - popWidth / 2
    const margin = 12
    if (left < margin) left = margin
    if (left + popWidth > window.innerWidth - margin) left = window.innerWidth - margin - popWidth
    const top = anchorRect.bottom + 10
    const arrowLeft = anchorCenterX - left // arrow position relative to popover

    function prevMonth(): void {
        if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
        else setViewMonth(viewMonth - 1)
    }
    function nextMonth(): void {
        if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
        else setViewMonth(viewMonth + 1)
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    // Build day grid (Monday-first)
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    // JS getDay(): 0=Sun, 1=Mon...6=Sat. Convert to Mon=0..Sun=6
    const firstDow = (firstOfMonth.getDay() + 6) % 7
    const cells: Array<{ day: number; dateStr: string } | null> = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
        const mm = String(viewMonth + 1).padStart(2, '0')
        const dd = String(d).padStart(2, '0')
        cells.push({ day: d, dateStr: `${viewYear}-${mm}-${dd}` })
    }
    while (cells.length % 7 !== 0) cells.push(null)

    return createPortal(
        <div
            ref={popoverRef}
            className={styles.datePickerPopover}
            role="dialog"
            aria-label={t('Pick a date')}
            style={{ top: `${top}px`, left: `${left}px`, width: `${popWidth}px` }}
        >
            <div className={styles.datePickerArrow} style={{ left: `${arrowLeft}px` }} />
            <div className={styles.datePickerHeader}>
                <button type="button" className={styles.datePickerNavBtn} onClick={prevMonth} aria-label={t('Previous month')}>‹</button>
                <div className={styles.datePickerTitle}>{t(monthNames[viewMonth])} {viewYear}</div>
                <button type="button" className={styles.datePickerNavBtn} onClick={nextMonth} aria-label={t('Next month')}>›</button>
            </div>
            <div className={styles.datePickerWeekdays}>
                {weekdayLabels.map(w => <div key={w} className={styles.datePickerWeekday}>{t(w)}</div>)}
            </div>
            <div className={styles.datePickerGrid}>
                {cells.map((cell, i) => {
                    if (!cell) return <div key={i} className={styles.datePickerCellEmpty} />
                    const isToday = cell.dateStr === todayStr
                    const isSelected = cell.dateStr === value
                    const cls = [
                        styles.datePickerCell,
                        isToday ? styles.datePickerCellToday : '',
                        isSelected ? styles.datePickerCellSelected : '',
                    ].filter(Boolean).join(' ')
                    return (
                        <button
                            key={i}
                            type="button"
                            className={cls}
                            onClick={() => { onChange(cell.dateStr); onClose() }}
                        >{cell.day}</button>
                    )
                })}
            </div>
            <div className={styles.datePickerFooter}>
                <button
                    type="button"
                    className={styles.datePickerTodayBtn}
                    onClick={() => { onChange(todayStr); onClose() }}
                >{t('Jump to today')}</button>
            </div>
        </div>,
        document.body
    )
}

interface BarcodeScannerProps {
    onResult: (barcode: string) => void
    onClose: () => void
    t: TFunction
}

function BarcodeScanner({ onResult, onClose, t }: BarcodeScannerProps): React.JSX.Element {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const [camError, setCamError] = useState<string | null>(null)
    const [manualCode, setManualCode] = useState<string>('')

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

interface ManualProductFormProps {
    barcode: string
    onSave: (form: ManualProductFormData) => Promise<void>
    onCancel: () => void
    t: TFunction
}

function ManualProductForm({ barcode, onSave, onCancel, t }: ManualProductFormProps): React.JSX.Element {
    const [form, setForm] = useState<ManualProductFormData>({ product_name: '', brand: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '', kcal_per_100g: '' })
    const [saving, setSaving] = useState<boolean>(false)
    const set = (k: keyof ManualProductFormData, v: string): void => setForm(f => ({ ...f, [k]: v }))
    const valid: boolean = !!form.product_name.trim()

    async function handleSave(): Promise<void> {
        setSaving(true)
        await onSave(form)
        setSaving(false)
    }

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalTitle}>{t('New product')}</div>
                <div className={styles.scanBarcodeLabel}>{t('Barcode')}: {barcode}</div>
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
                            <span className={styles.modalLabel} style={{ color: '#f97316' }}>{t('Protein / 100g')}</span>
                            <input className={styles.modalInput} type="number" min="0" step="0.1" value={form.protein_per_100g} onChange={e => set('protein_per_100g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#60a5fa' }}>{t('Carbs / 100g')}</span>
                            <input className={styles.modalInput} type="number" min="0" step="0.1" value={form.carbs_per_100g} onChange={e => set('carbs_per_100g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#22c55e' }}>{t('Fat / 100g')}</span>
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
    )
}

interface MealModalProps {
    initial?: MealFormData
    onSave: (form: MealFormData) => void
    onClose: () => void
    saving: boolean
    saveError: string
    t: TFunction
}

function MealModal({ initial, onSave, onClose, saving, saveError, t }: MealModalProps): React.JSX.Element {
    const [form, setForm] = useState<MealFormData>(initial ?? { ...EMPTY_FORM, label: t('Breakfast') })
    const set = (k: keyof MealFormData, v: string | number | null): void => setForm(f => ({ ...f, [k]: v }))
    const valid: boolean = !!(form.label.trim() && form.food.trim())
    const [closing, setClosing] = useState<boolean>(false)
    const requestClose = (): void => {
        if (closing) return
        setClosing(true)
        window.setTimeout(onClose, 200)
    }

    const [productId, setProductId] = useState<number | null>(initial?.product_id ?? null)
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
    const [searchLoading, setSearchLoading] = useState<boolean>(false)
    const [showDropdown, setShowDropdown] = useState<boolean>(false)
    const parsedGrams: string | undefined = initial?.food?.match(/^(\d+(?:\.\d+)?)(g|ml)\s/)?.[1]
    const parsedUnit: string = initial?.food?.match(/^(\d+(?:\.\d+)?)(g|ml)\s/)?.[2] ?? 'g'
    const [grams, setGrams] = useState<string>(parsedGrams ?? '100')
    const [unit, setUnit] = useState<string>(parsedUnit)
    const [scannerOpen, setScannerOpen] = useState<boolean>(false)
    const [scanError, setScanError] = useState<string>('')
    const [manualBarcode, setManualBarcode] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement | null>(null)
    const baseNutrients = useRef<BaseNutrients | null>(null)

    useEffect(() => {
        if (!initial || !parsedGrams) return
        const g: number = parseFloat(parsedGrams)
        const factor: number = g / 100
        baseNutrients.current = {
            proteins_100g: (parseFloat(initial.protein_g) || 0) / factor,
            carbohydrates_100g: (parseFloat(initial.carbs_g) || 0) / factor,
            fat_100g: (parseFloat(initial.fat_g) || 0) / factor,
            'energy-kcal_100g': (parseFloat(initial.kcal) || 0) / factor,
        }
    }, [])

    const r = (v: number): number => Math.round(v * 10) / 10

    useEffect(() => {
        if (!baseNutrients.current) return
        const g: number = parseFloat(grams) || 100
        const factor: number = g / 100
        const n = baseNutrients.current
        setForm(f => ({
            ...f,
            food: f.food.replace(/^\d+(\.\d+)?(g|ml) /, `${g}${unit} `),
            protein_g: String(r(n.proteins_100g * factor)),
            carbs_g: String(r(n.carbohydrates_100g * factor)),
            fat_g: String(r(n.fat_100g * factor)),
            kcal: String(r(n['energy-kcal_100g'] * factor)),
        }))
    }, [grams, unit])

    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return }
        const timer = setTimeout(async () => {
            setSearchLoading(true)
            const q: string = searchQuery.trim()

            // 1. Search USDA API first
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
            } catch { /* API failed, fall through to local */ }

            // 2. If no API results, search our local food_products database
            if (results.length === 0) {
                try {
                    const { data } = await supabase
                        .from('food_products')
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

            // 3. If still nothing, user can type freely (manual input)
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

    async function selectProduct(product: SearchProduct): Promise<void> {
        const g: number = parseFloat(grams) || 100
        const factor: number = g / 100
        const n = product.nutriments ?? {}
        const base: BaseNutrients = {
            proteins_100g: n['proteins_100g'] ?? 0,
            carbohydrates_100g: n['carbohydrates_100g'] ?? 0,
            fat_100g: n['fat_100g'] ?? 0,
            'energy-kcal_100g': n['energy-kcal_100g'] ?? ((n as Record<string, number>)['energy_100g'] ?? 0) / 4.184,
        }
        baseNutrients.current = base

        // If selected from our own catalog, just use its id
        if (product._fromCatalog && product._catalogId) {
            setProductId(product._catalogId)
        } else if (!product._skipUpsert) {
            try {
                const { data: inserted } = await supabase.from('food_products').insert({
                    product_name: product.product_name,
                    brand: product.brands || null,
                    protein_per_100g: base.proteins_100g,
                    carbs_per_100g: base.carbohydrates_100g,
                    fat_per_100g: base.fat_100g,
                    kcal_per_100g: base['energy-kcal_100g'],
                    source: 'usda',
                }).select().single()
                if (inserted) setProductId((inserted as FoodProduct).id)
            } catch { /* ignore – manual entry still works */ }
        }

        setForm(f => ({
            ...f,
            food: `${g}${unit} ${product.product_name}`,
            protein_g: String(r(base.proteins_100g * factor)),
            carbs_g: String(r(base.carbohydrates_100g * factor)),
            fat_g: String(r(base.fat_100g * factor)),
            kcal: String(r(base['energy-kcal_100g'] * factor)),
        }))
        setSearchQuery('')
        setSearchResults([])
        setShowDropdown(false)
    }

    async function handleBarcode(barcode: string): Promise<void> {
        setScanError('')
        setSearchLoading(true)
        try {
            // 1. Search OpenFoodFacts API first
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
            const data = await res.json()

            if (data.status === 1 && data.product?.product_name) {
                const p = data.product
                const n = p.nutriments ?? {}
                const nutrients: BaseNutrients = {
                    proteins_100g: n.proteins_100g ?? 0,
                    carbohydrates_100g: n.carbohydrates_100g ?? 0,
                    fat_100g: n.fat_100g ?? 0,
                    'energy-kcal_100g': n['energy-kcal_100g'] ?? 0,
                }

                // Save to our DB (upsert by barcode)
                try {
                    const { data: existing } = await supabase
                        .from('food_products').select('id').eq('barcode', barcode).maybeSingle()
                    if (existing) {
                        setProductId((existing as { id: number }).id)
                    } else {
                        const { data: inserted } = await supabase.from('food_products').insert({
                            barcode,
                            product_name: p.product_name,
                            brand: p.brands || null,
                            protein_per_100g: nutrients.proteins_100g,
                            carbs_per_100g: nutrients.carbohydrates_100g,
                            fat_per_100g: nutrients.fat_100g,
                            kcal_per_100g: nutrients['energy-kcal_100g'],
                            source: 'openfoodfacts',
                        }).select().single()
                        if (inserted) setProductId((inserted as FoodProduct).id)
                    }
                } catch { /* ignore */ }

                selectProduct({ product_name: p.product_name, nutriments: nutrients, _skipUpsert: true })
                setScannerOpen(false)
                setSearchLoading(false)
                return
            }

            // 2. If not in API, check our local food_products database
            const { data: localProduct } = await supabase
                .from('food_products').select('*').eq('barcode', barcode).maybeSingle()

            if (localProduct) {
                const lp = localProduct as FoodProduct
                setProductId(lp.id)
                selectProduct({
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
                })
                setScannerOpen(false)
                setSearchLoading(false)
                return
            }

            // 3. Not found anywhere — let user enter values manually
            setManualBarcode(barcode)
            setScannerOpen(false)
        } catch {
            setScanError(t('Could not fetch product'))
        }
        setSearchLoading(false)
    }

    async function handleManualProduct(manualForm: ManualProductFormData): Promise<void> {
        try {
            const { data: inserted } = await supabase.from('food_products').insert({
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
                setProductId(ins.id)
                selectProduct({
                    product_name: ins.product_name,
                    _skipUpsert: true,
                    nutriments: {
                        proteins_100g: Number(ins.protein_per_100g),
                        carbohydrates_100g: Number(ins.carbs_per_100g),
                        fat_100g: Number(ins.fat_per_100g),
                        'energy-kcal_100g': Number(ins.kcal_per_100g),
                    },
                })
            }
        } catch { /* ignore */ }
        setManualBarcode(null)
    }

    if (manualBarcode) {
        return <ManualProductForm barcode={manualBarcode} onSave={handleManualProduct} onCancel={() => setManualBarcode(null)} t={t} />
    }

    return (
        <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onClick={requestClose}>
            <div className={`${styles.modal} ${closing ? styles.modalClosing : ''}`} onClick={e => e.stopPropagation()}>
                <div className={styles.modalTitle}>{initial ? t('Edit meal') : t('New meal')}</div>

                <div className={styles.searchSection}>
                    <span className={styles.searchSectionLabel}>{t('Search food database')}</span>
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
                                    {searchResults.map((p: SearchProduct, i: number) => (
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
                        <button className={styles.scanBtn} type="button" onClick={() => { setScanError(''); setScannerOpen(true) }} title={t('Scan barcode')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                                <line x1="7" y1="12" x2="7" y2="12"/><line x1="12" y1="7" x2="12" y2="17"/>
                                <line x1="17" y1="12" x2="17" y2="12"/>
                            </svg>
                        </button>
                        <div className={styles.gramsWrap}>
                            <input
                                className={styles.gramsInput}
                                type="number"
                                min="1"
                                value={grams}
                                onChange={e => setGrams(e.target.value)}
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
                </div>
                {scannerOpen && <BarcodeScanner onResult={handleBarcode} onClose={() => setScannerOpen(false)} t={t} />}

                <div className={styles.modalFields}>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>{t('Time')}</span>
                        <input className={styles.modalInput} value={form.time_label} onChange={e => set('time_label', e.target.value)} placeholder={t('e.g. 07:00 or After workout')} />
                    </label>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>{t('Label')}</span>
                        <select className={styles.modalInput} value={form.label} onChange={e => set('label', e.target.value)}>
                            <option>{t('Breakfast')}</option>
                            <option>{t('Lunch')}</option>
                            <option>{t('Dinner')}</option>
                            <option>{t('Snack')}</option>
                        </select>
                    </label>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>{t('Food')}</span>
                        <textarea className={styles.modalTextarea} value={form.food} onChange={e => set('food', e.target.value)} placeholder={t('Describe the meal…')} rows={3} />
                    </label>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>{t('Note (optional)')}</span>
                        <input className={styles.modalInput} value={form.note} onChange={e => set('note', e.target.value)} placeholder={t('e.g. skip the sweet potato')} />
                    </label>
                    <div className={styles.macroInputRow}>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#f97316' }}>{t('Protein (g)')}</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.protein_g} onChange={e => set('protein_g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#60a5fa' }}>{t('Carbs (g)')}</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.carbs_g} onChange={e => set('carbs_g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#22c55e' }}>{t('Fat (g)')}</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.fat_g} onChange={e => set('fat_g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel}>Kcal</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.kcal} onChange={e => set('kcal', e.target.value)} />
                        </label>
                    </div>
                </div>
                {saveError && <div className={styles.saveError}>{saveError}</div>}
                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={requestClose} type="button">{t('Cancel')}</button>
                    <button className={styles.saveBtn} onClick={() => onSave({ ...form, product_id: productId, grams })} disabled={saving || !valid} type="button">
                        {saving ? '…' : t('Save')}
                    </button>
                </div>
            </div>
        </div>
    )
}

interface MealTableProps {
    meals: Meal[]
    onEdit: (meal: Meal) => void
    onDelete: (id: number) => void
    onToggleRecurring: (meal: Meal) => void
    t: TFunction
}

function MealTable({ meals, onEdit, onDelete, onToggleRecurring, t }: MealTableProps): React.JSX.Element {
    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>{t('Time')}</th>
                    <th>{t('Food')}</th>
                    <th style={{ color: '#f97316' }}>{t('P')}</th>
                    <th style={{ color: '#60a5fa' }}>{t('C')}</th>
                    <th style={{ color: '#22c55e' }}>{t('F')}</th>
                    <th>Kcal</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {meals.map((meal: Meal) => (
                    <tr key={meal.id}>
                        <td>
                            <div className={styles.mealTime}>{meal.time_label}</div>
                            <div className={styles.mealLabel}>{meal.label}</div>
                        </td>
                        <td>{meal.food}{meal.note && <em className={styles.mealNote}> {meal.note}</em>}</td>
                        <td><span className="pill pill-p">{meal.protein_g}g</span></td>
                        <td><span className="pill pill-k">{meal.carbs_g}g</span></td>
                        <td><span className="pill pill-f">{meal.fat_g}g</span></td>
                        <td><span className="pill pill-kcal">{meal.kcal}</span></td>
                        <td className={styles.actionCell}>
                            <button
                                className={`${styles.starBtn} ${meal.is_recurring ? styles.starBtnActive : ''}`}
                                onClick={() => onToggleRecurring(meal)}
                                title={meal.is_recurring ? t('Unsave daily') : t('Save daily')}
                            >
                                {meal.is_recurring ? '★' : '☆'}
                            </button>
                            <button className={styles.editBtn} onClick={() => onEdit(meal)} title={t('Edit')}>✏️</button>
                            <button className={styles.deleteBtn} onClick={() => onDelete(meal.id)} title={t('Delete')}>🗑</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// --- Main component ---

function buildTips(weight: number | null, age: number | null, t: TFunction): { icon: string; title: string; detail: string }[] {
    const w = weight ?? 80
    const tips: { icon: string; title: string; detail: string }[] = []

    // Kreatin: 0.07 g/kg kroppsvikt, avrundat till närmaste halva gram
    const creatine = Math.round(w * 0.07 * 2) / 2
    tips.push({
        icon: '💊',
        title: t('Creatine'),
        detail: t('creatineTip', { dose: creatine, weight: w }),
    })

    // Protein: 1.6-2.0 g/kg
    const proteinMin = Math.round(w * 1.6)
    const proteinMax = Math.round(w * 2.0)
    tips.push({
        icon: '🥛',
        title: t('Protein'),
        detail: t('proteinTip', { min: proteinMin, max: proteinMax }),
    })

    // Vatten: 0.033 l/kg, avrundat
    const water = (w * 0.033).toFixed(1)
    tips.push({
        icon: '💧',
        title: t('Water'),
        detail: t('waterTip', { liters: water }),
    })

    // Sömn baserat på ålder
    const sleepHours = age && age > 40 ? '7–9' : '7–8'
    tips.push({
        icon: '😴',
        title: t('Sleep'),
        detail: t('sleepTip', { hours: sleepHours }),
    })

    return tips
}

export default function Mat(): React.JSX.Element {
    const { t } = useTranslation()
    const profile = useProfile()
    const todayStr: string = localDateStr(new Date())
    const [selectedDate, setSelectedDate] = useState<string>(todayStr)
    const todayRef = useRef<string>(todayStr)
    const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null)
    const dateLabelBtnRef = useRef<HTMLButtonElement | null>(null)
    const [meals, setMeals] = useState<Meal[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [addOpen, setAddOpen] = useState<boolean>(false)
    const [editMeal, setEditMeal] = useState<Meal | null>(null)
    const [saving, setSaving] = useState<boolean>(false)
    const [saveError, setSaveError] = useState<string>('')

    useEffect(() => { loadMeals() }, [])

    useEffect(() => {
        function checkDayRollover(): void {
            const now = localDateStr(new Date())
            if (now !== todayRef.current) {
                const prevToday = todayRef.current
                setSelectedDate(prev => (prev === prevToday ? now : prev))
                todayRef.current = now
            }
        }
        const interval = setInterval(checkDayRollover, 30_000)
        document.addEventListener('visibilitychange', checkDayRollover)
        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', checkDayRollover)
        }
    }, [])

    async function loadMeals(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser()
        const { data } = await supabase.from('meals').select('*').eq('user_id', user!.id).order('sort_order')
        setMeals((data as Meal[]) ?? [])
        setLoading(false)
    }

    async function handleAdd(form: MealFormData): Promise<void> {
        setSaving(true)
        setSaveError('')
        const { data: { user } } = await supabase.auth.getUser()
        const currentMax: number = meals.reduce((acc: number, m: Meal) => Math.max(acc, m.sort_order), -1)
        const row = {
            user_id: user!.id,
            sort_order: currentMax + 1,
            time_label: form.time_label.trim(),
            label: form.label.trim(),
            food: form.food.trim(),
            note: form.note.trim() || null,
            protein_g: Math.round(parseFloat(form.protein_g)) || 0,
            carbs_g: Math.round(parseFloat(form.carbs_g)) || 0,
            fat_g: Math.round(parseFloat(form.fat_g)) || 0,
            kcal: Math.round(parseFloat(form.kcal)) || 0,
            product_id: form.product_id ?? null,
            grams: parseFloat(form.grams) || null,
            meal_date: selectedDate,
            is_recurring: false,
            recurring_until: null,
        }
        const { data, error } = await supabase.from('meals').insert(row).select().single()
        if (error) { setSaveError(error.message); setSaving(false); return }
        setMeals(prev => [...prev, data as Meal])
        setSaving(false)
        setAddOpen(false)
    }

    async function handleToggleRecurring(meal: Meal): Promise<void> {
        if (!meal.is_recurring) {
            const { data, error } = await supabase.from('meals').update({
                is_recurring: true,
                recurring_until: null,
            }).eq('id', meal.id).select().single()
            if (error) return
            setMeals(prev => prev.map((m: Meal) => m.id === (data as Meal).id ? (data as Meal) : m))
        } else {
            const until = selectedDate >= meal.meal_date ? selectedDate : meal.meal_date
            const { data, error } = await supabase.from('meals').update({
                is_recurring: false,
                recurring_until: until,
            }).eq('id', meal.id).select().single()
            if (error) return
            setMeals(prev => prev.map((m: Meal) => m.id === (data as Meal).id ? (data as Meal) : m))
        }
    }

    async function handleEdit(form: MealFormData): Promise<void> {
        setSaving(true)
        setSaveError('')
        const { data, error } = await supabase.from('meals').update({
            time_label: form.time_label.trim(),
            label: form.label.trim(),
            food: form.food.trim(),
            note: form.note.trim() || null,
            protein_g: Math.round(parseFloat(form.protein_g)) || 0,
            carbs_g: Math.round(parseFloat(form.carbs_g)) || 0,
            fat_g: Math.round(parseFloat(form.fat_g)) || 0,
            kcal: Math.round(parseFloat(form.kcal)) || 0,
            product_id: form.product_id ?? null,
            grams: parseFloat(form.grams) || null,
        }).eq('id', editMeal!.id).select().single()
        if (error) { setSaveError(error.message); setSaving(false); return }
        setMeals(prev => prev.map((m: Meal) => m.id === (data as Meal).id ? (data as Meal) : m))
        setSaving(false)
        setEditMeal(null)
    }

    async function handleDelete(id: number): Promise<void> {
        await supabase.from('meals').delete().eq('id', id)
        setMeals(prev => prev.filter((m: Meal) => m.id !== id))
    }

    const shown: Meal[] = meals.filter((m: Meal) => {
        const wasRecurring = m.is_recurring || m.recurring_until !== null
        if (!wasRecurring) return m.meal_date === selectedDate
        return m.meal_date <= selectedDate
            && (m.recurring_until === null || selectedDate <= m.recurring_until)
    })
    const totals: MealTotals = shown.reduce((acc: MealTotals, m: Meal) => ({
        kcal: acc.kcal + m.kcal,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
    }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

    const tips = buildTips(profile?.currentWeight ?? null, profile?.age ?? null, t)

    return (
        <section id="mat">
            <SectionHeader number="03" title={t('Food & Nutrition')} />

            <Reveal>
                <div className={styles.dateNav}>
                    <button
                        type="button"
                        className={styles.dateNavBtn}
                        onClick={() => setSelectedDate(prev => addDays(prev, -1))}
                        title={t('Previous day')}
                        aria-label={t('Previous day')}
                    >‹</button>
                    <div className={styles.dateLabel}>
                        <button
                            ref={dateLabelBtnRef}
                            type="button"
                            className={styles.dateLabelMainBtn}
                            onClick={() => {
                                if (pickerAnchor) { setPickerAnchor(null); return }
                                const rect = dateLabelBtnRef.current?.getBoundingClientRect() ?? null
                                setPickerAnchor(rect)
                            }}
                            title={t('Pick a date')}
                            aria-label={t('Pick a date')}
                            aria-expanded={pickerAnchor !== null}
                        >{formatDateLabel(selectedDate, todayStr, t)}</button>
                        {selectedDate !== todayStr && (
                            <button
                                type="button"
                                className={styles.dateLabelToday}
                                onClick={() => setSelectedDate(todayStr)}
                            >{t('Jump to today')}</button>
                        )}
                        {pickerAnchor && (
                            <DatePicker
                                value={selectedDate}
                                todayStr={todayStr}
                                anchorRect={pickerAnchor}
                                onChange={setSelectedDate}
                                onClose={() => setPickerAnchor(null)}
                                t={t}
                            />
                        )}
                    </div>
                    <button
                        type="button"
                        className={styles.dateNavBtn}
                        onClick={() => setSelectedDate(prev => addDays(prev, 1))}
                        title={t('Next day')}
                        aria-label={t('Next day')}
                    >›</button>
                </div>
            </Reveal>

            <Reveal>
                {loading ? (
                    <div className={styles.loadingText}>
                        {[0, 1, 2].map((i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <Skeleton width={50} height={14} />
                                <Skeleton width="60%" height={14} />
                                <Skeleton width={30} height={14} />
                                <Skeleton width={30} height={14} />
                                <Skeleton width={30} height={14} />
                                <Skeleton width={40} height={14} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {profile?.macros ? (
                            <div className={styles.macroRings}>
                                {([
                                    { key: 'kcal', label: 'KCAL', current: totals.kcal, target: profile.macros.targetKcal, unit: '', color: '#e8197d' },
                                    { key: 'protein', label: 'PROT', current: totals.protein_g, target: profile.macros.protein, unit: 'g', color: '#f97316' },
                                    { key: 'carbs', label: 'CARBS', current: totals.carbs_g, target: profile.macros.carbs, unit: 'g', color: '#60a5fa' },
                                    { key: 'fat', label: 'FAT', current: totals.fat_g, target: profile.macros.fat, unit: 'g', color: '#22c55e' },
                                ] as const).map(row => {
                                    const pct = row.target > 0 ? Math.min(100, (row.current / row.target) * 100) : 0
                                    return (
                                        <div key={row.key} className={styles.macroRing}>
                                            <div className={styles.macroRingSvgWrap}>
                                                <svg className={styles.macroRingSvg} viewBox="0 0 36 36">
                                                    <circle
                                                        cx="18" cy="18" r="16"
                                                        fill="none"
                                                        stroke="var(--border)"
                                                        strokeWidth="3"
                                                        pathLength={100}
                                                    />
                                                    <circle
                                                        cx="18" cy="18" r="16"
                                                        fill="none"
                                                        stroke={row.color}
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        pathLength={100}
                                                        strokeDasharray="100 100"
                                                        strokeDashoffset={100 - pct}
                                                        transform="rotate(-90 18 18)"
                                                        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                                                    />
                                                </svg>
                                                <div className={styles.macroRingValue}>
                                                    <span className={styles.macroRingCurrent}>{row.current}{row.unit}</span>
                                                    <span className={styles.macroRingTarget}>/ {row.target}{row.unit}</span>
                                                </div>
                                            </div>
                                            <span className={styles.macroRingLabel}>{row.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className={styles.totals}>
                                <span>{t('Total:')} <strong>{totals.kcal} kcal</strong></span>
                                <span style={{ color: '#f97316' }}>{t('P')}: {totals.protein_g} g</span>
                                <span style={{ color: '#60a5fa' }}>{t('C')}: {totals.carbs_g} g</span>
                                <span style={{ color: '#22c55e' }}>{t('F')}: {totals.fat_g} g</span>
                            </div>
                        )}
                        <MealTable meals={shown} onEdit={setEditMeal} onDelete={handleDelete} onToggleRecurring={handleToggleRecurring} t={t} />
                    </>
                )}
            </Reveal>

            <Reveal>
                <div className={styles.subHeading}>{t('Tips')}</div>
                <div className={styles.tipsGrid}>
                    {tips.map((tip, i) => (
                        <div key={i} className={styles.tipCard}>
                            <span className={styles.tipIcon}>{tip.icon}</span>
                            <div>
                                <div className={styles.tipTitle}>{tip.title}</div>
                                <div className={styles.tipDetail}>{tip.detail}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Reveal>

            {!loading && !addOpen && !editMeal && (
                <button
                    type="button"
                    className={styles.addMealFab}
                    onClick={() => setAddOpen(true)}
                    title={t('Add meal')}
                    aria-label={t('Add meal')}
                >+</button>
            )}

            {addOpen && (
                <MealModal
                    onSave={handleAdd}
                    onClose={() => { setAddOpen(false); setSaveError('') }}
                    saving={saving}
                    saveError={saveError}
                    t={t}
                />
            )}
            {editMeal && (
                <MealModal
                    initial={{ ...editMeal, protein_g: String(editMeal.protein_g), carbs_g: String(editMeal.carbs_g), fat_g: String(editMeal.fat_g), kcal: String(editMeal.kcal), note: editMeal.note ?? '', product_id: editMeal.product_id ?? null, grams: editMeal.grams != null ? String(editMeal.grams) : '' }}
                    onSave={handleEdit}
                    onClose={() => { setEditMeal(null); setSaveError('') }}
                    saving={saving}
                    saveError={saveError}
                    t={t}
                />
            )}
        </section>
    )
}
