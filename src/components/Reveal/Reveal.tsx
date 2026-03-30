import type { ReactNode } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import styles from './Reveal.module.scss'

interface RevealProps {
  children: ReactNode
  className?: string
}

export default function Reveal({ children, className = '' }: RevealProps): React.JSX.Element {
  const [ref, isVisible] = useScrollReveal()
  return (
    <div ref={ref} className={`${styles.reveal} ${isVisible ? styles.visible : ''} ${className}`}>
      {children}
    </div>
  )
}
