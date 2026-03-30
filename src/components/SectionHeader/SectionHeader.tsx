import styles from './SectionHeader.module.scss'

interface SectionHeaderProps {
  title: string
  number?: string
}

export default function SectionHeader({ title }: SectionHeaderProps): React.JSX.Element {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
    </div>
  )
}
