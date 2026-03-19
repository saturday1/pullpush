import { useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Mat.module.scss'

const supplements = [
    { name: 'Kreatin monohydrat', dose: '5 g/dag', info: 'Timing spelar ingen roll — ta det när det passar. Ingen laddningsfas behövs. Kör konsekvent varje dag, även vilodagar.' },
    { name: 'Whey 100 (post-workout)', dose: '1 dl (~30g)', info: 'Drick inom 1–2h efter träning. På vilodagar ingår det i kvällsmålet (i kvargen).' },
    { name: 'Vatten', dose: '3+ liter/dag', info: 'Kreatin ökar vattenbehovet. Tecken på underfuktning: trötthet, sämre prestanda, hunger.', blue: true },
]

const EMPTY_FORM = { time_label: '', label: '', food: '', note: '', protein_g: '', carbs_g: '', fat_g: '', kcal: '' }

function MealModal({ initial, onSave, onClose, saving }) {
    const [form, setForm] = useState(initial ?? EMPTY_FORM)
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const valid = form.label.trim() && form.food.trim()

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalTitle}>{initial ? 'Redigera måltid' : 'Ny måltid'}</div>
                <div className={styles.modalFields}>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>Tid</span>
                        <input className={styles.modalInput} value={form.time_label} onChange={e => set('time_label', e.target.value)} placeholder="t.ex. 07:00 eller Efter pass" />
                    </label>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>Benämning</span>
                        <select className={styles.modalInput} value={form.label} onChange={e => set('label', e.target.value)} autoFocus>
                            <option>Frukost</option>
                            <option>Mellanmål</option>
                            <option>Lunch</option>
                            <option>Middag</option>
                            <option>Kvällsmål</option>
                            <option>Protein</option>
                        </select>
                    </label>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>Mat</span>
                        <textarea className={styles.modalTextarea} value={form.food} onChange={e => set('food', e.target.value)} placeholder="Beskriv måltiden…" rows={3} />
                    </label>
                    <label className={styles.modalField}>
                        <span className={styles.modalLabel}>Not (valfri)</span>
                        <input className={styles.modalInput} value={form.note} onChange={e => set('note', e.target.value)} placeholder="t.ex. skippa sötpotatisen" />
                    </label>
                    <div className={styles.macroInputRow}>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#f97316' }}>Protein (g)</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.protein_g} onChange={e => set('protein_g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#60a5fa' }}>Kolhydr (g)</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.carbs_g} onChange={e => set('carbs_g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel} style={{ color: '#22c55e' }}>Fett (g)</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.fat_g} onChange={e => set('fat_g', e.target.value)} />
                        </label>
                        <label className={styles.modalField}>
                            <span className={styles.modalLabel}>Kcal</span>
                            <input className={styles.modalInput} type="number" min="0" value={form.kcal} onChange={e => set('kcal', e.target.value)} />
                        </label>
                    </div>
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose} type="button">Avbryt</button>
                    <button className={styles.saveBtn} onClick={() => onSave(form)} disabled={saving || !valid} type="button">
                        {saving ? '…' : 'Spara'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function MealTable({ meals, onEdit, onDelete }) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Tid</th>
                        <th>Mat</th>
                        <th style={{ color: '#f97316' }}>P</th>
                        <th style={{ color: '#60a5fa' }}>K</th>
                        <th style={{ color: '#22c55e' }}>F</th>
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
                                <button className={styles.editBtn} onClick={() => onEdit(meal)} title="Redigera">✏️</button>
                                <button className={styles.deleteBtn} onClick={() => onDelete(meal.id)} title="Ta bort">🗑</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function Mat() {
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

    return (
        <section id="mat">
            <SectionHeader number="03" title="Mat & Näring" />

            <Reveal>
                <div className={styles.tabsRow}>
                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${tab === 'train' ? styles.active : ''}`} onClick={() => setTab('train')}>Träningsdag</button>
                        <button className={`${styles.tab} ${tab === 'rest' ? styles.active : ''}`} onClick={() => setTab('rest')}>Vilodag</button>
                    </div>
                    <button className={styles.addBtn} onClick={() => setAddOpen(true)}>+ Lägg till måltid</button>
                </div>
            </Reveal>

            <Reveal>
                {loading ? (
                    <div className={styles.loadingText}>Laddar…</div>
                ) : (
                    <>
                        <div className={styles.totals}>
                            <span>Totalt: <strong>{totals.kcal} kcal</strong></span>
                            <span style={{ color: '#f97316' }}>P: {totals.protein_g} g</span>
                            <span style={{ color: '#60a5fa' }}>K: {totals.carbs_g} g</span>
                            <span style={{ color: '#22c55e' }}>F: {totals.fat_g} g</span>
                        </div>
                        <MealTable meals={shown} onEdit={setEditMeal} onDelete={handleDelete} />
                    </>
                )}
            </Reveal>

            <Reveal>
                <div className={styles.subHeading}>Kreatin &amp; Tillskott</div>
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Tillskott</th>
                                <th>Dos</th>
                                <th>Rekommendation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {supplements.map(({ name, dose, info, blue }) => (
                                <tr key={name}>
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
                />
            )}
            {editMeal && (
                <MealModal
                    initial={{ ...editMeal, protein_g: String(editMeal.protein_g), carbs_g: String(editMeal.carbs_g), fat_g: String(editMeal.fat_g), kcal: String(editMeal.kcal), note: editMeal.note ?? '' }}
                    onSave={handleEdit}
                    onClose={() => setEditMeal(null)}
                    saving={saving}
                />
            )}
        </section>
    )
}
