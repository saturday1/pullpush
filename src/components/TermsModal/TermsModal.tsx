import { useState } from 'react'
import { Drawer } from 'vaul'
import { useTranslation } from 'react-i18next'
import { terms } from './terms'
import styles from './TermsModal.module.scss'

interface Props {
    onClose: () => void
}

export default function TermsModal({ onClose }: Props): React.ReactElement {
    const { i18n } = useTranslation()
    const [open, setOpen] = useState(true)

    function handleClose(): void {
        setOpen(false)
        setTimeout(onClose, 500)
    }

    const lang = i18n.language.split('-')[0]
    const content = terms[lang] ?? terms.sv

    return (
        <Drawer.Root open={open} onOpenChange={v => { if (!v) handleClose() }}>
            <Drawer.Portal>
                <Drawer.Overlay className={styles.overlay} />
                <Drawer.Content className={styles.sheet}>
                    <Drawer.Handle className={styles.handle} />
                    <div className={styles.header}>
                        <Drawer.Title className={styles.title}>{content.title}</Drawer.Title>
                        <button className={styles.closeBtn} onClick={handleClose}>✕</button>
                    </div>
                    <div className={styles.body}>
                        {content.sections.map(s => (
                            <div key={s.heading} className={styles.section}>
                                <h3 className={styles.sectionHeading}>{s.heading}</h3>
                                <p className={styles.sectionText}>{s.text}</p>
                            </div>
                        ))}
                        <p className={styles.updated}>{content.updated}</p>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
