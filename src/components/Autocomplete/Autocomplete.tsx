import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Autocomplete.module.scss'

interface AutocompleteItem {
  id?: string | number
  [key: string]: unknown
}

interface DropdownPosition {
  top: number
  left: number
  width: number
}

interface AutocompleteProps {
  searchFn: (query: string) => Promise<AutocompleteItem[]>
  displayKey?: string
  secondaryKey?: string
  onSelect: (item: AutocompleteItem) => void
  onCreate?: (value: string) => void
  placeholder?: string
  value?: string
  createLabel?: string
}

export default function Autocomplete({
  searchFn,
  displayKey = 'name',
  secondaryKey,
  onSelect,
  onCreate,
  placeholder = '',
  value = '',
  createLabel,
}: AutocompleteProps): React.JSX.Element {
  const [query, setQuery] = useState<string>(value)
  const [results, setResults] = useState<AutocompleteItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [highlight, setHighlight] = useState<number>(-1)
  const [pos, setPos] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQuery(value) }, [value])

  const updatePos = useCallback((): void => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const dropdownHeight = dropdownRef.current?.offsetHeight ?? 200
    const spaceBelow = window.innerHeight - rect.bottom
    const fitsBelow = spaceBelow >= dropdownHeight + 4

    setPos({
      top: fitsBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    // Delay one frame so dropdownRef has rendered and has its real height
    requestAnimationFrame(updatePos)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, results, updatePos])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(val: string): void {
    setQuery(val)
    setHighlight(-1)

    if (timerRef.current) clearTimeout(timerRef.current)

    if (val.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchFn(val.trim())
        setResults(data ?? [])
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(item: AutocompleteItem): void {
    setQuery((item[displayKey] as string) || '')
    setOpen(false)
    onSelect(item)
  }

  function handleCreate(): void {
    setOpen(false)
    if (onCreate) onCreate(query.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open) return
    const total = results.length + (onCreate ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => (h + 1) % total)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => (h - 1 + total) % total)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0 && highlight < results.length) {
        handleSelect(results[highlight])
      } else if (highlight === results.length && onCreate) {
        handleCreate()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const dropdown = open && (results.length > 0 || onCreate) ? createPortal(
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {results.map((item, i) => (
        <button
          key={item.id ?? i}
          className={`${styles.option} ${i === highlight ? styles.highlighted : ''}`}
          onMouseEnter={() => setHighlight(i)}
          onClick={() => handleSelect(item)}
          type="button"
        >
          <span className={styles.optionMain}>{String(item[displayKey] ?? '')}</span>
          {secondaryKey && item[secondaryKey] ? (
            <span className={styles.optionSub}>{String(item[secondaryKey])}</span>
          ) : null}
        </button>
      ))}

      {onCreate && (
        <button
          className={`${styles.option} ${styles.createOption} ${highlight === results.length ? styles.highlighted : ''}`}
          onMouseEnter={() => setHighlight(results.length)}
          onClick={handleCreate}
          type="button"
        >
          + {createLabel ?? query.trim()}
        </button>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading && <span className={styles.spinner} />}
      {dropdown}
    </div>
  )
}
