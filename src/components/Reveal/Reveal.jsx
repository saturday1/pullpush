import { useScrollReveal } from '../../hooks/useScrollReveal'
import styles from './Reveal.module.scss'

export default function Reveal({ children, className = '' }) {
  const [ref, isVisible] = useScrollReveal()
  return (
    <div ref={ref} className={`${styles.reveal} ${isVisible ? styles.visible : ''} ${className}`}>
      {children}
    </div>
  )
}
