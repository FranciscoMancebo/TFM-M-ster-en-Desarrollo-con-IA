'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Play, Search } from 'lucide-react';
import type { ExerciseLibraryItem, ExerciseSection } from '@/lib/workout/types';
import { translateKnownText, useI18n } from '@/lib/i18n';

const sections: Array<{ id: ExerciseSection; label: string; labelEn: string; description: string; descriptionEn: string }> = [
  { id: 'strength', label: 'Fuerza básica', labelEn: 'Basic strength', description: 'Patrones que construyen la base física para los movimientos olímpicos.', descriptionEn: 'Movement patterns that build the physical base for Olympic lifts.' },
  { id: 'mobility', label: 'Movilidad', labelEn: 'Mobility', description: 'Trabajo de rango, control y posiciones de recepción.', descriptionEn: 'Range, control and receiving-position work.' },
  { id: 'snatch', label: 'Arrancada', labelEn: 'Snatch', description: 'Progresiones, variantes y accesorios del movimiento a un tiempo.', descriptionEn: 'Progressions, variations and accessories for the snatch.' },
  { id: 'clean_and_jerk', label: 'Dos tiempos', labelEn: 'Clean and jerk', description: 'Cargada, jerk y ejercicios auxiliares del movimiento a dos tiempos.', descriptionEn: 'Clean, jerk and assistance exercises for the clean and jerk.' },
];

const equipmentLabels: Record<string, string> = {
  barbell: 'Barra',
  plates: 'Discos',
  rack: 'Rack',
  dumbbells: 'Mancuernas',
  bench: 'Banco',
  band: 'Banda',
  'foam-roller': 'Foam roller',
  blocks: 'Bloques',
};

export function ExerciseEncyclopedia({ exercises }: { exercises: ExerciseLibraryItem[] }) {
  const { language, tr } = useI18n();
  const [activeSection, setActiveSection] = useState<ExerciseSection>('strength');
  const [search, setSearch] = useState('');
  const currentSection = sections.find((section) => section.id === activeSection) ?? sections[0];
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(language);
    return exercises.filter((exercise) => exercise.section === activeSection && (
      !query
      || exercise.name.toLocaleLowerCase('es').includes(query)
      || translateKnownText(language, exercise.name).toLocaleLowerCase(language).includes(query)
      || exercise.summary.toLocaleLowerCase('es').includes(query)
      || exercise.focus.some((focus) => focus.toLocaleLowerCase('es').includes(query))
    ));
  }, [activeSection, exercises, language, search]);

  return (
    <div className="page-wrap encyclopedia-page">
      <header className="top-bar">
        <div className="mobile-brand"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true">H</span><span>HALTERO</span></div></div>
        <div className="date-block"><span>{tr('Biblioteca técnica', 'Technical library')}</span><strong>{exercises.length} {tr('ejercicios', 'exercises')}</strong></div>
        <BookOpen aria-hidden="true" />
      </header>

      <section className="encyclopedia-heading">
        <div><p className="eyebrow">{tr('Enciclopedia', 'Encyclopedia')}</p><h1>{tr('Biblioteca de ejercicios', 'Exercise library')}</h1><p>{tr('La base técnica desde la que se construyen y adaptan tus rutinas.', 'The technical base used to build and adapt your routines.')}</p></div>
        <label className="exercise-search"><Search aria-hidden="true" /><span className="sr-only">{tr('Buscar ejercicios', 'Search exercises')}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr('Buscar por nombre o enfoque', 'Search by name or focus')} /></label>
      </section>

      <nav className="exercise-sections" aria-label={tr('Categorías de ejercicios', 'Exercise categories')}>
        {sections.map((section) => (
          <button type="button" className={activeSection === section.id ? 'is-active' : ''} aria-current={activeSection === section.id ? 'page' : undefined} onClick={() => setActiveSection(section.id)} key={section.id}>
            <span>{language === 'es' ? section.label : section.labelEn}</span><strong>{exercises.filter((exercise) => exercise.section === section.id).length.toString().padStart(2, '0')}</strong>
          </button>
        ))}
      </nav>

      <div className="exercise-section-copy"><p className="eyebrow">{language === 'es' ? currentSection.label : currentSection.labelEn}</p><h2>{language === 'es' ? currentSection.description : currentSection.descriptionEn}</h2></div>

      {filtered.length ? (
        <section className="exercise-library-grid" aria-live="polite">
          {filtered.map((exercise) => (
            <article className="exercise-library-card" key={exercise.id}>
              <div className="exercise-video-slot">
                <Play aria-hidden="true" />
                <span>{exercise.videoUrl ? tr('Ver demostración', 'Watch demonstration') : tr('Vídeo próximamente', 'Video coming soon')}</span>
              </div>
              <div className="exercise-library-body">
                <span className="exercise-category">{language === 'es' ? currentSection.label : currentSection.labelEn}</span>
                <h3>{translateKnownText(language, exercise.name)}</h3>
                <p>{exercise.summary}</p>
                <div className="exercise-focus" aria-label={tr('Enfoque', 'Focus')}>{exercise.focus.map((focus) => <span key={focus}>{focus}</span>)}</div>
                <details>
                  <summary>{tr('Claves de ejecución', 'Execution cues')}</summary>
                  <ul>{exercise.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
                  <p><strong>{tr('Material:', 'Equipment:')}</strong> {exercise.equipment.length ? exercise.equipment.map((item) => language === 'es' ? (equipmentLabels[item] ?? item) : item.replace('-', ' ')).join(', ') : tr('Sin material', 'No equipment')}</p>
                </details>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="history-empty"><BookOpen aria-hidden="true" /><h3>{tr('No hay coincidencias', 'No matches')}</h3><p>{tr('Prueba con otro término o cambia de categoría.', 'Try another term or change category.')}</p></div>
      )}
    </div>
  );
}
