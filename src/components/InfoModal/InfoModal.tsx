import { useState } from 'react'
import styles from './InfoModal.module.scss'

interface InfoModalProps {
  title: string
  text: string
}

export default function InfoModal({ title, text }: InfoModalProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <>
      <button
        className={styles.trigger}
        onClick={() => setOpen(true)}
        type="button"
        aria-label={`Info om ${title}`}
      >
        🔍
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>{title}</div>
            <p className={styles.modalText}>{text}</p>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} type="button">
              Stäng
            </button>
          </div>
        </div>
      )}
    </>
  )
}
