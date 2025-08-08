import React, { createContext, useCallback, useEffect, useState } from "react";
import ru from "../locales/ru.json";
import en from "../locales/en.json";

const dictionaries = { ru, en };

export const LocaleContext = createContext({
  locale: "ru",
  setLocale: () => {},
  t: (k, v) => k,
});

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(
    localStorage.getItem("locale") || "ru"
  );

  const setLocale = useCallback((lng) => {
    localStorage.setItem("locale", lng);
    setLocaleState(lng);
  }, []);

  const t = useCallback(
    (key, vars = {}) => {
      const template = dictionaries[locale][key];
      if (!template) {
        if (import.meta.env.MODE === "development")
          console.warn(`Missing translation: "${key}" (${locale})`);
        return key;
      }
      return template.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
    },
    [locale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};
