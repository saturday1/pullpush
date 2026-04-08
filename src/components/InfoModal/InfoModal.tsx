import { useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './InfoModal.module.scss'

interface InfoModalProps {
  title: string
  text: string
}

export default function InfoModal({ title, text }: InfoModalProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(false)
  const [closing, setClosing] = useState<boolean>(false)

  function requestClose(): void {
    if (closing) return
    setClosing(true)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, 200)
  }

  return (
    <>
      <button
        className={styles.trigger}
        onClick={() => setOpen(true)}
        type="button"
        aria-label={`Info om ${title}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </button>

      {open && createPortal(
        <div
          className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
          onClick={requestClose}
        >
          <div
            className={`${styles.modal} ${closing ? styles.modalClosing : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalTitle}>{title}</div>
            <p className={styles.modalText}>{text}</p>
            <button className={styles.closeBtn} onClick={requestClose} type="button">
              Stäng
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
