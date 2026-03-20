import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../supabase'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Mat.module.scss'

const EMPTY_FORM = { time_label: '', label: '', food: '', note: '', protein_g: '', carbs_g: '', fat_g: '', kcal: '' }

function MealModal({ initial, onSave, onClose, saving, t }) {
    const [form, setForm] = useState(initial ?? EMPTY_FORM)
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const valid = form.label.trim() && form.food.trim()

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalTitle}>{initial ? t('Edit meal') : t('New meal')}</div>
                <div className={styles.modalFields}>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>{t('Time')}</span>
                        <input className={styles.modalInput} value={form.time_label} onChange={e => set('time_label', e.target.value)} placeholder={t('e.g. 07:00 or After workout')} />
                    </label>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>{t('Label')}</span>
                        <select className={styles.modalInput} value={form.label} onChange={e => set('label', e.target.value)} autoFocus>
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
