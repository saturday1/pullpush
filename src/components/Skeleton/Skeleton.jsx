import styles from './Skeleton.module.scss'

export default function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }) {
  return (
    <span
      className={styles.skeleton}
      style={{ width, height, borderRadius, ...style }}
    />
  )
}

export function SkeletonRow({ columns = 4, height = 16 }) {
  return (
    <div className={styles.row}>
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  )
}
