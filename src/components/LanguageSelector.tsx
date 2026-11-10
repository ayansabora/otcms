import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n/config";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES[0]!;

  function changeLanguage(code: SupportedLanguage) {
    i18n.changeLanguage(code);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-line-strong)] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
      >
        <Globe size={14} className="shrink-0" />
        {!compact && (
          <span className="font-medium max-w-20 truncate">{current.nativeLabel}</span>
        )}
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-modal)] z-[200] overflow-hidden animate-slide-down">
          <div className="px-3 py-2 border-b border-[var(--color-line)]">
            <p className="text-[10px] text-[var(--color-muted)] font-semibold uppercase tracking-wide">
              Language
            </p>
          </div>
          <ul role="listbox" className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang.code === i18n.language;
              return (
                <li key={lang.code} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-bg)] ${
                      isActive
                        ? "text-[var(--color-primary)] font-semibold"
                        : "text-[var(--color-ink)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{lang.flag}</span>
                      <div className="min-w-0">
                        <p className="truncate leading-tight">{lang.nativeLabel}</p>
                        {lang.nativeLabel !== lang.label && (
                          <p className="text-[10px] text-[var(--color-muted)] truncate">
                            {lang.label}
                          </p>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <Check size={14} className="shrink-0 text-[var(--color-primary)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
