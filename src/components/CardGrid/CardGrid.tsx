import type { CSSProperties, ReactNode } from 'react'
import styles from './CardGrid.module.scss'

interface CardGridProps {
  children: ReactNode
  className?: string
}

export function CardGrid({ children, className = '' }: CardGridProps): React.JSX.Element {
    return (
        <div className={`${styles.grid} ${className}`}>
            {children}
        </div>
    )
}

interface CardGridItemProps {
  label: ReactNode
  value: ReactNode
  sub?: string
  valueStyle?: CSSProperties
  className?: string
}

export function CardGridItem({ label, value, sub, valueStyle, className = '' }: CardGridItemProps): React.JSX.Element {
    return (
        <div className={`${styles.item} fade-in ${className}`}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value} style={valueStyle}>{value}</span>
            {sub && <span className={styles.sub}>{sub}</span>}
        </div>
    )
}
