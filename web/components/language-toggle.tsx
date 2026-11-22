'use client';

import { Languages } from 'lucide-react';
import type { Language } from '@/lib/workout/types';
import { useI18n } from '@/lib/i18n';

export function LanguageToggle({ onChange }: { onChange: (language: Language) => void }) {
  const { language, tr } = useI18n();
  return (
    <fieldset className="language-toggle" aria-label={tr('Seleccionar idioma', 'Select language')}>
      <Languages aria-hidden="true" />
      <button type="button" className={language === 'es' ? 'is-active' : ''} aria-pressed={language === 'es'} onClick={() => onChange('es')}>ES</button>
      <button type="button" className={language === 'en' ? 'is-active' : ''} aria-pressed={language === 'en'} onClick={() => onChange('en')}>EN</button>
    </fieldset>
  );
}
