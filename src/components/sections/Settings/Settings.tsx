import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../context/ThemeContext'
import { supabase } from '../../../supabase'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Profil from '../Profil/Profil'
import Tips from '../Tips/Tips'
import styles from './Settings.module.scss'

export default function Settings(): React.ReactElement {
    const { t, i18n } = useTranslation()
    const themeCtx = useTheme()
    const theme = themeCtx?.theme ?? 'light'
    const toggle = themeCtx?.toggle ?? (() => {})

    return (
        <section id="settings">
            <SectionHeader title={t('Settings')} />

            <Profil />

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

            <Tips />

            <Reveal>
                <button className={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
                    {t('Log out')}
                </button>
            </Reveal>
        </section>
    )
}
