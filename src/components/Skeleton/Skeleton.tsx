import type { CSSProperties } from 'react'
import styles from './Skeleton.module.scss'

interface SkeletonProps {
  width?: string | number
  height?: number
  borderRadius?: number
  style?: CSSProperties
}

export default function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps): React.JSX.Element {
  return (
    <span
      className={styles.skeleton}
      style={{ width, height, borderRadius, ...style }}
    />
  )
}

interface SkeletonRowProps {
  columns?: number
  height?: number
}

export function SkeletonRow({ columns = 4, height = 16 }: SkeletonRowProps): React.JSX.Element {
  return (
    <div className={styles.row}>
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  )
}
