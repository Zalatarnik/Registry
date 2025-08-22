import { useContext } from 'react';
import { LocaleContext } from '../../context/LocaleContext';

export const useTranslation = () => {
  const { t, locale, setLocale } = useContext(LocaleContext);
  return { t, locale, setLocale };
};