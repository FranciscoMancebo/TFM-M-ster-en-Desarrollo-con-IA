'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Language } from '@/lib/workout/types';

const I18nContext = createContext<{ language: Language }>({ language: 'es' });

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <I18nContext.Provider value={{ language }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const { language } = useContext(I18nContext);
  return {
    language,
    locale: language === 'es' ? 'es-ES' : 'en-GB',
    tr: (spanish: string, english: string) => language === 'es' ? spanish : english,
  };
}

export function translateKnownText(language: Language, value: string) {
  if (language === 'es') return value;
  return englishText[value] ?? value;
}

const englishText: Record<string, string> = {
  'Iniciación': 'Starter',
  'Principiante': 'Beginner',
  'Intermedio': 'Intermediate',
  'Avanzado': 'Advanced',
  'Fundamentos de halterofilia': 'Weightlifting foundations',
  'Base técnica': 'Technical base',
  'Clásicos y fuerza específica': 'Competition lifts and specific strength',
  'Rendimiento específico': 'Performance training',
  'Primer contacto con las posiciones básicas y el control de la barra.': 'First contact with the basic positions and bar control.',
  'Variantes desde hang para consolidar posiciones antes de aumentar la intensidad.': 'Hang variations to consolidate positions before increasing intensity.',
  'Trabajo de los movimientos de competición con una base sólida de fuerza.': 'Competition lift training built on a solid strength base.',
  'Intensidad alta en los movimientos clásicos y fuerza máxima aplicada.': 'High intensity in the competition lifts and applied maximal strength.',
  'Fundamentos': 'Foundations',
  'Técnica desde hang': 'Hang technique',
  'Clásicos': 'Competition lifts',
  'Rendimiento': 'Performance',
  'Sentadilla': 'Back squat',
  'Snatch o arrancada': 'Snatch',
  'Sentadilla frontal': 'Front squat',
  'S. frontal': 'Front squat',
  'Clean and jerk o dos tiempos': 'Clean and jerk',
  'Peso muerto': 'Deadlift',
  'Peso muerto rumano': 'Romanian deadlift',
  'Press estricto': 'Strict press',
  'Sentadilla búlgara': 'Bulgarian split squat',
  'Remo con barra': 'Barbell row',
  'Dorsiflexión de tobillo en pared': 'Wall ankle dorsiflexion',
  'Sentadilla profunda asistida': 'Assisted deep squat',
  'Estiramiento de flexor de cadera': 'Hip flexor stretch',
  'Rotaciones de cadera 90/90': '90/90 hip rotations',
  'Extensión torácica': 'Thoracic extension',
  'Pasadas de hombro con banda': 'Band shoulder pass-throughs',
  'Preparación de muñecas': 'Wrist preparation',
  'Estiramiento dorsal overhead': 'Overhead lat stretch',
  'Arrancada': 'Snatch',
  'Arrancada muscular': 'Muscle snatch',
  'Arrancada desde hang': 'Hang snatch',
  'Arrancada de potencia': 'Power snatch',
  'Arrancada desde bloques': 'Block snatch',
  'Tirón de arrancada': 'Snatch pull',
  'Sentadilla overhead': 'Overhead squat',
  'Dos tiempos': 'Clean and jerk',
  'Cargada desde hang': 'Hang clean',
  'Cargada de potencia': 'Power clean',
  'Tirón de cargada': 'Clean pull',
  'Cargada desde bloques': 'Block clean',
  'Jerk en split': 'Split jerk',
  'Balance de jerk': 'Jerk balance',
  'Jerk desde rack': 'Jerk from rack',
  'Sentadilla con pausa': 'Pause back squat',
  'Sentadilla frontal con pausa': 'Pause front squat',
  'Sentadilla tempo': 'Tempo back squat',
  'Peso muerto de arrancada': 'Snatch deadlift',
  'Peso muerto de cargada': 'Clean deadlift',
  'Press Sots': 'Sots press',
  'Movilidad de rack frontal': 'Front rack mobility',
  'Sentadilla cosaca': 'Cossack squat',
  'Arrancada con pausa en rodilla': 'Pause snatch at the knee',
  'Arrancada desde hang con pausa': 'Pause hang snatch',
  'Tirón de arrancada con pausa': 'Pause snatch pull',
  'Arrancada sin mover los pies': 'No-foot snatch',
  'Arrancada desde cadera': 'Hip snatch',
  'Arrancada desde déficit': 'Deficit snatch',
  'Arrancada en tres posiciones': 'Three-position snatch',
  'Complejo de arrancada': 'Snatch complex',
  'Cargada con pausa en rodilla': 'Pause clean at the knee',
  'Cargada desde hang con pausa': 'Pause hang clean',
  'Tirón de cargada con pausa': 'Pause clean pull',
  'Cargada sin mover los pies': 'No-foot clean',
  'Cargada en tres posiciones': 'Three-position clean',
  'Jerk con pausa en el dip': 'Pause dip jerk',
  'Jerk tras nuca': 'Behind-the-neck jerk',
  'Complejo de cargada y jerk': 'Clean and jerk complex',
  'Sin asignar': 'Unassigned',
};

