import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import ru from "../locales/ru.json";
import en from "../locales/en.json";

const dictionaries = { ru, en };

export const LocaleContext = createContext({
  locale: "ru",
  setLocale: () => {},
  t: (k, v) => k,
});

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(() => {
    try { return localStorage.getItem("locale") || "ru"; } catch { return "ru"; }
  });

  const setLocale = useCallback((lng) => {
    try { localStorage.setItem("locale", lng); } catch {}
    setLocaleState(lng);
  }, []);

  // безопасно определяем dev-режим и под Vite, и под CRA/Webpack
  const isDev = useMemo(() => {
    let v = false;
    try {
      // Vite
      // (важно: НЕ typeof import, а обращение к import.meta)
      v = typeof import.meta !== "undefined" && import.meta?.env?.MODE === "development";
    } catch {}
    if (!v) {
      try {
        // CRA/Webpack/Node
        v = typeof process !== "undefined" && (
          process?.env?.MODE === "development" || process?.env?.NODE_ENV === "development"
        );
      } catch {}
    }
    return v;
  }, []);

  const t = useCallback(
    (key, vars = {}) => {
      const dict = dictionaries[locale] || {};
      const template = dict[key];
      if (!template) {
        if (isDev) console.warn(`Missing translation: "${key}" (${locale})`);
        return key;
      }
      // поддерживаем и {var}, и {{var}}
      return String(template)
        .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, v) => (v in vars ? vars[v] : `{{${v}}}`))
        .replace(/\{\s*(\w+)\s*\}/g,   (_, v) => (v in vars ? vars[v] : `{${v}}`));
    },
    [locale, isDev]
  );

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};
