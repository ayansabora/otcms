import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en";
import om from "./locales/om";
import am from "./locales/am";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",       nativeLabel: "English",    flag: "🇪🇹" },
  { code: "om", label: "Afaan Oromoo",  nativeLabel: "Afaan Oromoo", flag: "🟢" },
  { code: "am", label: "Amharic",       nativeLabel: "አማርኛ",      flag: "🇪🇹" },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      om: { translation: om },
      am: { translation: am },
    },
    lng: undefined,          // let the detector choose; falls back to fallbackLng
    fallbackLng: "en",
    defaultNS: "translation",

    // LanguageDetector options — priority order
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "otcms_lang",
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false,    // React already escapes
    },

    // Never display a raw key to the user — always fall back to English
    saveMissing: false,
  });

export default i18n;
