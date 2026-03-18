import styles from './CardGrid.module.scss'

export function CardGrid({ children, className = '' }) {
  return (
    <div className={`${styles.grid} ${className}`}>
      {children}
    </div>
  )
}

export function CardGridItem({ label, value, sub, valueStyle, className = '' }) {
  return (
    <div className={`${styles.item} fade-in ${className}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} style={valueStyle}>{value}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  )
}
