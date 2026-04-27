import { useState, ChangeEvent, FormEvent } from 'react'
import { Drawer } from 'vaul'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../supabase'
import { DB } from '../../constants/database'
import styles from './ContactModal.module.scss'

interface Props {
    onClose: () => void
}

export default function ContactModal({ onClose }: Props): React.ReactElement {
    const { t } = useTranslation()
    const [open, setOpen] = useState(true)
    const [subject, setSubject] = useState('technical')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function handleClose(): void {
        setOpen(false)
        setTimeout(onClose, 500)
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault()
        if (!message.trim()) return
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from(DB.CONTACT_MESSAGES).insert({
            user_id: user?.id ?? null,
            email: user?.email ?? null,
            subject,
            message: message.trim(),
        })

        setLoading(false)
        if (error) {
            setError(t('Something went wrong. Please try again.'))
        } else {
            setSent(true)
            setTimeout(handleClose, 2000)
        }
    }

    const subjectOptions = [
        { value: 'technical', label: t('Technical problem') },
        { value: 'feedback', label: t('Feedback') },
        { value: 'other', label: t('Other') },
    ]

    return (
        <Drawer.Root open={open} onOpenChange={v => { if (!v) handleClose() }}>
            <Drawer.Portal>
                <Drawer.Overlay className={styles.overlay} />
                <Drawer.Content className={styles.sheet}>
                    <Drawer.Handle className={styles.handle} />
                    <div className={styles.header}>
                        <Drawer.Title className={styles.title}>{t('Contact support')}</Drawer.Title>
                        <button className={styles.closeBtn} onClick={handleClose}>✕</button>
                    </div>

                    {sent ? (
                        <div className={styles.successBody}>
                            <div className={styles.successIcon}>✓</div>
                            <p className={styles.successText}>{t('Message sent! We will get back to you.')}</p>
                        </div>
                    ) : (
                        <form className={styles.body} onSubmit={handleSubmit}>
                            <label className={styles.fieldLabel}>
                                {t('Subject')}
                                <select
                                    className={styles.select}
                                    value={subject}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSubject(e.target.value)}
                                >
                                    {subjectOptions.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.fieldLabel}>
                                {t('Your message')}
                                <textarea
                                    className={styles.textarea}
                                    value={message}
                                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                                    rows={5}
                                    maxLength={2000}
                                />
                            </label>
                            {error && <p className={styles.error}>{error}</p>}
                            <button
                                type="submit"
                                className={styles.sendBtn}
                                disabled={loading || !message.trim()}
                            >
                                {loading ? '…' : t('Send')}
                            </button>
                        </form>
                    )}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
