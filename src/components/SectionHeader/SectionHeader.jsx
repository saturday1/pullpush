import styles from './SectionHeader.module.scss'

export default function SectionHeader({ number, title }) {
  return (
    <div className={styles.header}>
      <span className={styles.number}>{number}</span>
      <h2 className={styles.title}>{title}</h2>
    </div>
  )
}
