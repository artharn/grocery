import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

const LABELS: Record<SupportedLanguage, string> = { en: "EN", th: "TH" };

// Reachable from every screen, including /login — per i18n.md criterion 1,
// a Thai-speaking user shouldn't have to read English to get past login.
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage as SupportedLanguage;

  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          aria-pressed={current === lang}
          className={`px-2 py-1 font-medium ${
            current === lang ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
