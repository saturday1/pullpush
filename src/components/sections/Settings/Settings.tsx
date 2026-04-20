import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../context/ThemeContext'
import { useWeightUnit, type WeightUnit } from '../../../hooks/useWeightUnit'
import { useFlowSounds } from '../../../hooks/useFlowSounds'
import { supabase } from '../../../supabase'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Profil from '../Profil/Profil'
import Tips from '../Tips/Tips'
import styles from './Settings.module.scss'

type SettingsTab = 'profile' | 'settings' | 'guide'

export default function Settings(): React.ReactElement {
    const { t, i18n } = useTranslation()
    const themeCtx = useTheme()
    const theme = themeCtx?.theme ?? 'light'
    const toggle = themeCtx?.toggle ?? (() => {})
    const [tab, setTab] = useState<SettingsTab>('profile')
    const flowSounds = useFlowSounds()
    const [soundsOn, setSoundsOn] = useState(flowSounds.enabled)
    const [weightUnit, setWeightUnit] = useWeightUnit()

    return (
        <section id="settings">
            <SectionHeader title={t('Account & Settings')} />

            <div className={styles.tabBar}>
                <button className={`${styles.tabBtn} ${tab === 'profile' ? styles.tabBtnActive : ''}`} onClick={() => setTab('profile')}>
                    {t('Profile')}
                </button>
                <button className={`${styles.tabBtn} ${tab === 'settings' ? styles.tabBtnActive : ''}`} onClick={() => setTab('settings')}>
                    {t('Settings')}
                </button>
                <button className={`${styles.tabBtn} ${tab === 'guide' ? styles.tabBtnActive : ''}`} onClick={() => setTab('guide')}>
                    {t('Guide')}
                </button>
            </div>

            {tab === 'profile' && (
                <>
                    <Profil />
                    <Reveal>
                        <button className={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
                            {t('Log out')}
                        </button>
                    </Reveal>
                </>
            )}

            {tab === 'settings' && (
                <>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Language')}</div>
                            <div className={styles.optionRow}>
                                <button
                                    className={`${styles.optionBtn} ${i18n.language === 'sv' ? styles.optionActive : ''}`}
                                    onClick={() => i18n.changeLanguage('sv')}
                                >
                                    <span className={styles.langCode}>SE</span> Svenska
                                </button>
                                <button
                                    className={`${styles.optionBtn} ${i18n.language === 'en' ? styles.optionActive : ''}`}
                                    onClick={() => i18n.changeLanguage('en')}
                                >
                                    <span className={styles.langCode}>EN</span> English
                                </button>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Theme')}</div>
                            <div className={styles.optionRow}>
                                <button
                                    className={`${styles.optionBtn} ${theme === 'light' ? styles.optionActive : ''}`}
                                    onClick={() => theme === 'dark' && toggle()}
                                >
                                    ☀️ {t('Light')}
                                </button>
                                <button
                                    className={`${styles.optionBtn} ${theme === 'dark' ? styles.optionActive : ''}`}
                                    onClick={() => theme === 'light' && toggle()}
                                >
                                    🌙 {t('Dark')}
                                </button>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Weight unit')}</div>
                            <div className={styles.optionRow}>
                                {(['both', 'kg', 'lbs'] as WeightUnit[]).map(u => (
                                    <button
                                        key={u}
                                        className={`${styles.optionBtn} ${weightUnit === u ? styles.optionActive : ''}`}
                                        onClick={() => setWeightUnit(u)}
                                    >
                                        {u === 'both' ? 'KG / LBS' : u.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Flow sounds')}</div>
                            <div className={styles.optionRow}>
                                <button
                                    className={`${styles.optionBtn} ${soundsOn ? styles.optionActive : ''}`}
                                    onClick={() => { flowSounds.setEnabled(true); setSoundsOn(true) }}
                                >
                                    {t('On')}
                                </button>
                                <button
                                    className={`${styles.optionBtn} ${!soundsOn ? styles.optionActive : ''}`}
                                    onClick={() => { flowSounds.setEnabled(false); setSoundsOn(false) }}
                                >
                                    {t('Off')}
                                </button>
                            </div>
                        </div>
                    </Reveal>
                </>
            )}

            {tab === 'guide' && <Tips />}
        </section>
    )
}
