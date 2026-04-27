import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useMotionValue, animate, useMotionValueEvent } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import Logo from '../Logo/Logo'
import styles from './Nav.module.scss'

interface NavLinkItem {
    to: string
    label: string
}

const links: NavLinkItem[] = [
    { to: '/traning', label: 'Training' },
    // { to: '/vecka',   label: 'Week' },
    { to: '/vikt',    label: 'Weight' },
    { to: '/mat',     label: 'Food' },
    { to: '/stats',   label: 'Stats' },
    { to: '/coach',   label: 'Coach' },
]

function GearIcon(): React.ReactElement {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    )
}

export default function Nav(): React.ReactElement {
    const { t } = useTranslation()
    const [navHeight, setNavHeight] = useState<number>(0)
    const navRef = useRef<HTMLElement | null>(null)
    const y = useMotionValue<number>(0)
    const lastScrollY = useRef<number>(0)
    const lastTime = useRef<number>(performance.now())
    const isAnimating = useRef<boolean>(false)
    const hasSnappedIn = useRef<boolean>(false)
    // NOTE: Capacitor naming is inverted vs iOS UIKit:
    // Style.Dark   → UIStatusBarStyleLightContent → vita ikoner (för mörk bakgrund)
    // Style.Light  → UIStatusBarStyleDarkContent  → mörka ikoner (för ljus bakgrund)
    const isDarkRef = useRef(window.matchMedia('(prefers-color-scheme: dark)').matches)
    const lastStatusStyle = useRef<Style | null>(null)

    function getSafeAreaTop(): number {
        const el = document.createElement('div')
        el.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px)'
        document.body.appendChild(el)
        const val = parseFloat(getComputedStyle(el).paddingTop) || 0
        document.body.removeChild(el)
        return val
    }

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        const safeTop = getSafeAreaTop()
        const THRESHOLD = -(safeTop + 10)
        const HYSTERESIS = 5

        const mq = window.matchMedia('(prefers-color-scheme: dark)')

        const applyStyle = (style: Style) => {
            if (style === lastStatusStyle.current) return
            lastStatusStyle.current = style
            StatusBar.setStyle({ style })
        }

        const update = (latest: number, dark: boolean) => {
            if (dark) {
                applyStyle(Style.Dark) // vita ikoner alltid i dark mode
                return
            }
            if (latest < THRESHOLD - HYSTERESIS) applyStyle(Style.Dark)   // vita ikoner (nav borta)
            else if (latest > THRESHOLD + HYSTERESIS) applyStyle(Style.Light) // mörka ikoner (nav synlig)
        }

        const onThemeChange = (e: MediaQueryListEvent) => {
            isDarkRef.current = e.matches
            update(y.get(), e.matches)
        }

        mq.addEventListener('change', onThemeChange)
        update(y.get(), mq.matches)

        const unsubY = y.on('change', (latest) => update(latest, isDarkRef.current))

        return () => {
            mq.removeEventListener('change', onThemeChange)
            unsubY()
        }
    }, [y])

    useEffect((): (() => void) | undefined => {
        if (!navRef.current) return
        const ro = new ResizeObserver((): void => {
            const h: number = navRef.current?.getBoundingClientRect().height ?? 0
            if (h > 0) {
                setNavHeight(h)
                document.documentElement.style.setProperty('--topbar-height', `${h}px`)
            }
        })
        ro.observe(navRef.current)
        return () => ro.disconnect()
    }, [])

    useEffect((): (() => void) | undefined => {
        if (!navHeight) return

        const SNAP_BACK_TRIGGER: number = 80

        function onScroll(): void {
            const currentY: number = window.scrollY
            const delta: number = currentY - lastScrollY.current
            const now: number = performance.now()
            const timeDelta: number = now - lastTime.current
            const velocity: number = timeDelta > 0 ? delta / timeDelta : 0

            lastScrollY.current = currentY
            lastTime.current = now

            if (isAnimating.current) return

            const currentNavY: number = y.get()

            // Near top + scrolling up → snap back
            if (delta < 0 && currentY <= SNAP_BACK_TRIGGER && currentNavY < 0 && !hasSnappedIn.current) {
                isAnimating.current = true
                hasSnappedIn.current = true
                animate(y, 0, { duration: 0.2, type: 'tween' }).then((): void => { isAnimating.current = false })
                return
            }

            // At very top
            if (currentY <= 0) {
                y.set(0)
                return
            }

            // Scrolling down → hide pixel by pixel
            if (delta > 0) {
                hasSnappedIn.current = false
                y.set(Math.max(-navHeight, currentNavY - delta))
                return
            }

            // Fast scroll up (velocity) → snap back animated
            if (velocity < -0.8 && currentNavY < 0 && !hasSnappedIn.current) {
                isAnimating.current = true
                hasSnappedIn.current = true
                animate(y, 0, { duration: 0.2, type: 'tween' }).then((): void => { isAnimating.current = false })
                return
            }

            // Slow scroll up → reveal pixel by pixel
            if (delta < 0 && currentNavY < 0) {
                y.set(Math.min(0, currentNavY - delta))
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [navHeight, y])

    return (
        <>
        {/* Permanent shadow over safe-area — always fixed at top, nav slides under it */}
        <div className={styles.safeShadow} />

        {/* Layer 2: Background — fixed, moves with y, no mask */}
        <motion.div
            className={styles.navBg}
            style={{ y, height: navHeight || 'auto' }}
        />

        {/* Layer 3: Masked wrapper with fade, contains nav content */}
        <div className={styles.navMask}>
            <motion.div style={{ y }}>
                <nav ref={navRef} className={styles.nav}>
                    <NavLink to="/traning" className={styles.logoLink}>
                        <Logo color="currentColor" className={styles.logo} />
                    </NavLink>
                    <div className={styles.navLinks}>
                        {links.map(({ to, label }: NavLinkItem) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }: { isActive: boolean }): string => `${styles.link} ${isActive ? styles.active : ''}`}
                            >
                                {t(label)}
                            </NavLink>
                        ))}
                    </div>

                    <NavLink
                        to="/settings"
                        className={({ isActive }: { isActive: boolean }): string => `${styles.settingsBtn} ${isActive ? styles.active : ''}`}
                        title={t('Settings')}
                    >
                        <GearIcon />
                    </NavLink>
                </nav>
            </motion.div>
        </div>

        {/* Spacer to push content below */}
        <div style={{ height: navHeight }} />
        </>
    )
}
