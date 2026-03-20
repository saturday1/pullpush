import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { supabase } from '../../../supabase'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Mat.module.scss'

const EMPTY_FORM = { time_label: '', label: '', food: '', note: '', protein_g: '', carbs_g: '', fat_g: '', kcal: '' }

function BarcodeScanner({ onResult, onClose, t }) {
    const videoRef = useRef(null)
    const controlsRef = useRef(null)
    const [camError, setCamError] = useState(null)

    useEffect(() => {
        const reader = new BrowserMultiFormatReader()
        let handled = false
        reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
            if (result && !handled) {
                handled = true
                controlsRef.current?.stop()
                onResult(result.getText())
            }
        }).then(controls => {
            controlsRef.current = controls
        }).catch(() => {
            setCamError(t('Could not open camera'))
        })
        return () => { controlsRef.current?.stop() }
    }, [])

    return (
        <div className={styles.scannerOverlay} onClick={onClose}>
            <div className={styles.scannerModal} onClick={e => e.stopPropagation()}>
                <div className={styles.scannerTitle}>{t('Point camera at barcode')}</div>
                {camError
                    ? <div className={styles.scannerError}>{camError}</div>
                    : <div className={styles.scannerVideoWrap}>
                        <video ref={videoRef} className={styles.scannerVideo} />
                        <div className={styles.scannerTarget} />
                    </div>
                }
                <button className={styles.scannerCancelBtn} onClick={onClose} type="button">{t('Cancel')}</button>
            </div>
        </div>
    )
}

function MealModal({ initial, onSave, onClose, saving, t }) {
    const [form, setForm] = useState(initial ?? { ...EMPTY_FORM, label: t('Breakfast') })
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const valid = form.label.trim() && form.food.trim()

    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [grams, setGrams] = useState('100')
    const [scannerOpen, setScannerOpen] = useState(false)
    const [scanError, setScanError] = useState('')
    const dropdownRef = useRef(null)

    useEffect(() => {
        if (!searchQuery.trim()) { setSearchResults([]); setShowDropdown(false); return }
        const timer = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const res = await fetch(
                    `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(searchQuery)}&pageSize=8&api_key=${import.meta.env.VITE_USDA_API_KEY}`
                )
                const data = await res.json()
                const products = (data.foods ?? []).map(f => ({
                    product_name: f.description,
                    brands: f.brandOwner ?? f.brandName ?? '',
                    nutriments: {
                        proteins_100g: f.foodNutrients?.find(n => n.nutrientId === 1003)?.value ?? 0,
                        carbohydrates_100g: f.foodNutrients?.find(n => n.nutrientId === 1005)?.value ?? 0,
                        fat_100g: f.foodNutrients?.find(n => n.nutrientId === 1004)?.value ?? 0,
                        'energy-kcal_100g': f.foodNutrients?.find(n => n.nutrientId === 1008)?.value ?? 0,
                    }
                }))
                setSearchResults(products)
                setShowDropdown(products.length > 0)
            } catch {
                setSearchResults([])
            }
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

    function selectProduct(product) {
        const g = parseFloat(grams) || 100
        const factor = g / 100
        const n = product.nutriments ?? {}
        const protein = Math.round((n['proteins_100g'] ?? 0) * factor)
        const carbs = Math.round((n['carbohydrates_100g'] ?? 0) * factor)
        const fat = Math.round((n['fat_100g'] ?? 0) * factor)
        const kcal = Math.round((n['energy-kcal_100g'] ?? (n['energy_100g'] ?? 0) / 4.184) * factor)
        setForm(f => ({
            ...f,
            food: `${g}g ${product.product_name}`,
            protein_g: String(protein),
            carbs_g: String(carbs),
            fat_g: String(fat),
            kcal: String(kcal),
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
                selectProduct({
                    product_name: p.product_name,
                    nutriments: {
                        proteins_100g: n.proteins_100g ?? 0,
                        carbohydrates_100g: n.carbohydrates_100g ?? 0,
                        fat_100g: n.fat_100g ?? 0,
                        'energy-kcal_100g': n['energy-kcal_100g'] ?? 0,
                    }
                })
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
                                            <span className={styles.searchItemName}>{p.product_name}</span>
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
                            <span className={styles.gramsUnit}>g</span>
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
                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose} type="button">{t('Cancel')}</button>
                    <button className={styles.saveBtn} onClick={() => onSave(form)} disabled={saving || !valid} type="button">
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

    useEffect(() => { loadMeals() }, [])

    async function loadMeals() {
        const { data: { user } } = await supabase.auth.getUser()
        const { data } = await supabase.from('meals').select('*').eq('user_id', user.id).order('day_type').order('sort_order')
        setMeals(data ?? [])
        setLoading(false)
    }

    async function handleAdd(form) {
        setSaving(true)
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
            protein_g: parseInt(form.protein_g) || 0,
            carbs_g: parseInt(form.carbs_g) || 0,
            fat_g: parseInt(form.fat_g) || 0,
            kcal: parseInt(form.kcal) || 0,
        }
        const { data } = await supabase.from('meals').insert(row).select().single()
        if (data) setMeals(prev => [...prev, data])
        setSaving(false)
        setAddOpen(false)
    }

    async function handleEdit(form) {
        setSaving(true)
        const { data } = await supabase.from('meals').update({
            time_label: form.time_label.trim(),
            label: form.label.trim(),
            food: form.food.trim(),
            note: form.note.trim() || null,
            protein_g: parseInt(form.protein_g) || 0,
            carbs_g: parseInt(form.carbs_g) || 0,
            fat_g: parseInt(form.fat_g) || 0,
            kcal: parseInt(form.kcal) || 0,
        }).eq('id', editMeal.id).select().single()
        if (data) setMeals(prev => prev.map(m => m.id === data.id ? data : m))
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
                    <div className={styles.loadingText}>{t('Loading…')}</div>
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
                    onClose={() => setAddOpen(false)}
                    saving={saving}
                    t={t}
                />
            )}
            {editMeal && (
                <MealModal
                    initial={{ ...editMeal, protein_g: String(editMeal.protein_g), carbs_g: String(editMeal.carbs_g), fat_g: String(editMeal.fat_g), kcal: String(editMeal.kcal), note: editMeal.note ?? '' }}
                    onSave={handleEdit}
                    onClose={() => setEditMeal(null)}
                    saving={saving}
                    t={t}
                />
            )}
        </section>
    )
}
