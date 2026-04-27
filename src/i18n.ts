import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import sv from './locales/sv.json'
import en from './locales/en.json'
import nb from './locales/nb.json'
import da from './locales/da.json'
import fi from './locales/fi.json'
import is from './locales/is.json'
import de from './locales/de.json'
import fr from './locales/fr.json'
import es from './locales/es.json'
import it from './locales/it.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      sv: { translation: sv },
      en: { translation: en },
      nb: { translation: nb },
      da: { translation: da },
      fi: { translation: fi },
      is: { translation: is },
      de: { translation: de },
      fr: { translation: fr },
      es: { translation: es },
      it: { translation: it },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
