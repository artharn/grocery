import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import th from "./locales/th";

export const SUPPORTED_LANGUAGES = ["en", "th"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_STORAGE_KEY = "grocery.language";

const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage: SupportedLanguage =
  storedLanguage && (SUPPORTED_LANGUAGES as readonly string[]).includes(storedLanguage)
    ? (storedLanguage as SupportedLanguage)
    : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    th: { translation: th },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
});

export default i18n;
