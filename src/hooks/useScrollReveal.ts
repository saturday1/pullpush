import { useEffect, useRef, useState, type RefObject } from 'react'

export function useScrollReveal(threshold: number = 0.1): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState<boolean>(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, isVisible]
}
