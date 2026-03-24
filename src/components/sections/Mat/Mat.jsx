import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { supabase } from '../../../supabase'
import Skeleton from '../../Skeleton/Skeleton'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Mat.module.scss'

const EMPTY_FORM = { time_label: '', label: '', food: '', note: '', protein_g: '', carbs_g: '', fat_g: '', kcal: '', product_id: null, grams: '' }

function BarcodeScanner({ onResult, onClose, t }) {
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const [camError, setCamError] = useState(null)

    function stopCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
    }

    function handleClose() {
        stopCamera()
        onClose()
    }

    useEffect(() => {
        let handled = false
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                streamRef.current = stream
                videoRef.current.srcObject = stream
                videoRef.current.play()
                const reader = new BrowserMultiFormatReader()
                return reader.decodeFromStream(stream, videoRef.current, (result) => {
                    if (result && !handled) {
                        handled = true
                        stopCamera()
                        onResult(result.getText())
                    }
                })
            })
            .catch(() => setCamError(t('Could not open camera')))
        return () => { stopCamera() }
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
                <button className={styles.scannerCancelBtn} onClick={handleClose} type="button">{t('Cancel')}</button>
            </div>
        </div>
    )
}

function MealModal({ initial, onSave, onClose, saving, saveError, t }) {
    const [form, setForm] = useState(initial ?? { ...EMPTY_FORM, label: t('Breakfast') })
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const valid = form.label.trim() && form.food.trim()

    const [productId, setProductId] = useState(initial?.product_id ?? null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const parsedGrams = initial?.food?.match(/^(\d+(?:\.\d+)?)(g|ml)\s/)?.[1]
    const parsedUnit = initial?.food?.match(/^(\d+(?:\.\d+)?)(g|ml)\s/)?.[2] ?? 'g'
    const [grams, setGrams] = useState(parsedGrams ?? '100')
    const [unit, setUnit] = useState(parsedUnit)
    const [scannerOpen, setScannerOpen] = useState(false)
    const [scanError, setScanError] = useState('')
    const dropdownRef = useRef(null)
    const baseNutrients = useRef(null)

    useEffect(() => {
        if (!initial || !parsedGrams) return
        const g = parseFloat(parsedGrams)
        const factor = g / 100
        baseNutrients.current = {
            proteins_100g: (parseFloat(initial.protein_g) || 0) / factor,
            carbohydrates_100g: (parseFloat(initial.carbs_g) || 0) / factor,
            fat_100g: (parseFloat(initial.fat_g) || 0) / factor,
            'energy-kcal_100g': (parseFloat(initial.kcal) || 0) / factor,
        }
    }, [])

    const r = v => Math.round(v * 10) / 10

    useEffect(() => {
        if (!baseNutrients.current) return
        const g = parseFloat(grams) || 100
        const factor = g / 100
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

            // Search both sources independently so one failing doesn't block the other
            const usdaPromise = fetch(
                `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(searchQuery)}&pageSize=8&api_key=${import.meta.env.VITE_USDA_API_KEY}`
            ).then(res => res.json()).then(data => (data.foods ?? []).map(f => ({
                product_name: f.description,
                brands: f.brandOwner ?? f.brandName ?? '',
                nutriments: {
                    proteins_100g: f.foodNutrients?.find(n => n.nutrientId === 1003)?.value ?? 0,
                    carbohydrates_100g: f.foodNutrients?.find(n => n.nutrientId === 1005)?.value ?? 0,
                    fat_100g: f.foodNutrients?.find(n => n.nutrientId === 1004)?.value ?? 0,
                    'energy-kcal_100g': f.foodNutrients?.find(n => n.nutrientId === 1008)?.value ?? 0,
                }
            }))).catch(() => [])

            const localPromise = supabase
                .from('food_products')
                .select('*')
                .ilike('product_name', `%${searchQuery.trim()}%`)
                .limit(5)
                .then(({ data }) => (data ?? []).map(p => ({
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
                }))).catch(() => [])

            const [usdaProducts, localProducts] = await Promise.all([usdaPromise, localPromise])
            // Local results first, then USDA
            const combined = [...localProducts, ...usdaProducts]
            setSearchResults(combined)
            setShowDropdown(combined.length > 0)
            setSearchLoading(false)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function selectProduct(product) {
        const g = parseFloat(grams) || 100
        const factor = g / 100
        const n = product.nutriments ?? {}
        const base = {
            proteins_100g: n['proteins_100g'] ?? 0,
            carbohydrates_100g: n['carbohydrates_100g'] ?? 0,
            fat_100g: n['fat_100g'] ?? 0,
            'energy-kcal_100g': n['energy-kcal_100g'] ?? (n['energy_100g'] ?? 0) / 4.184,
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
                if (inserted) setProductId(inserted.id)
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

    async function handleBarcode(barcode) {
        setScanError('')
        setSearchLoading(true)
        try {
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

                // Check if barcode already exists in food_products
                try {
                    const { data: existing } = await supabase
                        .from('food_products')
                        .select('*')
                        .eq('barcode', barcode)
                        .maybeSingle()

                    if (existing) {
                        setProductId(existing.id)
                    } else {
                        const { data: inserted } = await supabase.from('food_products').insert({
                            barcode,
                            product_name: p.product_name,
                            brand: p.brands || null,
                            protein_per_100g: nutrients.proteins_100g,
                            carbs_per_100g: nutrients.carbohydrates_100g,
                            fat_per_100g: nutrients.fat_100g,
                            kcal_per_100g: nutrients['energy-kcal_100g'],
                            source: 'barcode',
                        }).select().single()
                        if (inserted) setProductId(inserted.id)
                    }
                } catch { /* ignore – scanning still works without food_products */ }

                selectProduct({
                    product_name: p.product_name,
                    nutriments: nutrients,
                    _skipUpsert: true,
                })
                setScannerOpen(false)
            } else {
                setScanError(t('Product not found') + ' (' + barcode + ')')
            }
        } catch {
            setScanError(t('Could not fetch product'))
        }
        setSearchLoading(false)
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalTitle}>{initial ? t('Edit meal') : t('New meal')}</div>

                <div className={styles.searchSection}>
                    <span className={styles.searchSectionLabel}>{t('Search food database')}</span>
                    <div className={styles.searchRow} ref={dropdownRef}>
                        <div className={styles.searchWrap}>
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
                            <option>{t('Snack')}</option>
                            <option>{t('Lunch')}</option>
                            <option>{t('Dinner')}</option>
                            <option>{t('Evening meal')}</option>
                            <option>{t('Protein')}</option>
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
                    <button className={styles.cancelBtn} onClick={onClose} type="button">{t('Cancel')}</button>
                    <button className={styles.saveBtn} onClick={() => onSave({ ...form, product_id: productId, grams })} disabled={saving || !valid} type="button">
                        {saving ? '…' : t('Save')}
                    </button>
                </div>
            </div>
        </div>
    )
}

function MealTable({ meals, onEdit, onDelete, t }) {
    return (
        <div style={{ overflowX: 'auto' }}>
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
                    {meals.map(meal => (
                        <tr key={meal.id}>
                            <td>
                                <div className={styles.mealTime}>{meal.time_label}</div>
                                <div className={styles.mealLabel}>{meal.label}</div>
                            </td>
                            <td>{meal.food}{meal.note && <em className={styles.mealNote}> {meal.note}</em>}</td>
                            <td><span className="pill pill-p">{meal.protein_g}g</span></td>
                            <td><span className="pill pill-k">{meal.carbs_g}g</span></td>
                            <td><span className="pill pill-f">{meal.fat_g}g</span></td>
                            <td>{meal.kcal}</td>
                            <td className={styles.actionCell}>
                                <button className={styles.editBtn} onClick={() => onEdit(meal)} title={t('Edit')}>✏️</button>
                                <button className={styles.deleteBtn} onClick={() => onDelete(meal.id)} title={t('Delete')}>🗑</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function Mat() {
    const { t } = useTranslation()
    const [tab, setTab] = useState('train')
    const [meals, setMeals] = useState([])
    const [loading, setLoading] = useState(true)
    const [addOpen, setAddOpen] = useState(false)
    const [editMeal, setEditMeal] = useState(null)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    useEffect(() => { loadMeals() }, [])

    async function loadMeals() {
        const { data: { user } } = await supabase.auth.getUser()
        const { data } = await supabase.from('meals').select('*').eq('user_id', user.id).order('day_type').order('sort_order')
        setMeals(data ?? [])
        setLoading(false)
    }

    async function handleAdd(form) {
        setSaving(true)
        setSaveError('')
        const { data: { user } } = await supabase.auth.getUser()
        const currentMax = meals.filter(m => m.day_type === tab).reduce((acc, m) => Math.max(acc, m.sort_order), -1)
        const row = {
            user_id: user.id,
            day_type: tab,
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
        }
        const { data, error } = await supabase.from('meals').insert(row).select().single()
        if (error) { setSaveError(error.message); setSaving(false); return }
        setMeals(prev => [...prev, data])
        setSaving(false)
        setAddOpen(false)
    }

    async function handleEdit(form) {
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
        }).eq('id', editMeal.id).select().single()
        if (error) { setSaveError(error.message); setSaving(false); return }
        setMeals(prev => prev.map(m => m.id === data.id ? data : m))
        setSaving(false)
        setEditMeal(null)
    }

    async function handleDelete(id) {
        await supabase.from('meals').delete().eq('id', id)
        setMeals(prev => prev.filter(m => m.id !== id))
    }

    const shown = meals.filter(m => m.day_type === tab)
    const totals = shown.reduce((acc, m) => ({
        kcal: acc.kcal + m.kcal,
        protein_g: acc.protein_g + m.protein_g,
        carbs_g: acc.carbs_g + m.carbs_g,
        fat_g: acc.fat_g + m.fat_g,
    }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

    const supplements = t('supplements', { returnObjects: true })

    return (
        <section id="mat">
            <SectionHeader number="03" title={t('Food & Nutrition')} />

            <Reveal>
                <div className={styles.tabsRow}>
                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${tab === 'train' ? styles.active : ''}`} onClick={() => setTab('train')}>{t('Training day')}</button>
                        <button className={`${styles.tab} ${tab === 'rest' ? styles.active : ''}`} onClick={() => setTab('rest')}>{t('Rest day')}</button>
                    </div>
                    <button className={styles.addBtn} onClick={() => setAddOpen(true)}>+ {t('Add meal')}</button>
                </div>
            </Reveal>

            <Reveal>
                {loading ? (
                    <div className={styles.loadingText}>
                        {[0, 1, 2].map(i => (
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
                        <div className={styles.totals}>
                            <span>{t('Total:')} <strong>{totals.kcal} kcal</strong></span>
                            <span style={{ color: '#f97316' }}>{t('P')}: {totals.protein_g} g</span>
                            <span style={{ color: '#60a5fa' }}>{t('C')}: {totals.carbs_g} g</span>
                            <span style={{ color: '#22c55e' }}>{t('F')}: {totals.fat_g} g</span>
                        </div>
                        <MealTable meals={shown} onEdit={setEditMeal} onDelete={handleDelete} t={t} />
                    </>
                )}
            </Reveal>

            <Reveal>
                <div className={styles.subHeading}>{t('Creatine & Supplements')}</div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>{t('Supplement')}</th>
                                <th>{t('Dose')}</th>
                                <th>{t('Recommendation')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(supplements) && supplements.map(({ name, dose, info, blue }, i) => (
                                <tr key={i}>
                                    <td><div className={styles.suppName}>{name}</div></td>
                                    <td><span className={styles.suppDose} style={blue ? { color: 'var(--blue)' } : {}}>{dose}</span></td>
                                    <td>{info}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Reveal>

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
                    initial={{ ...editMeal, protein_g: String(editMeal.protein_g), carbs_g: String(editMeal.carbs_g), fat_g: String(editMeal.fat_g), kcal: String(editMeal.kcal), note: editMeal.note ?? '', product_id: editMeal.product_id ?? null }}
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
