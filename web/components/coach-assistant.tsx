'use client';

import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Database, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { translateKnownText, useI18n } from '@/lib/i18n';
import { latestLiftRecords, liftDefinitions } from '@/lib/workout/lifts';
import type {
  CompletedWorkout,
  ExerciseLibraryItem,
  LiftRecord,
  RoutinePlan,
  UserProfile,
} from '@/lib/workout/types';

type CoachMessage = {
  id: string;
  role: 'coach' | 'user';
  body: string;
};

type CoachAssistantProps = {
  profile: UserProfile;
  plan: RoutinePlan | null;
  history: CompletedWorkout[];
  liftRecords: LiftRecord[];
  exerciseLibrary: ExerciseLibraryItem[];
  onOpenExercises: () => void;
};

const levelNames = {
  starter: ['Iniciación', 'Starter'],
  beginner: ['Principiante', 'Beginner'],
  intermediate: ['Intermedio', 'Intermediate'],
  advanced: ['Avanzado', 'Advanced'],
} as const;

const goalNames: Record<string, [string, string]> = {
  technique: ['técnica', 'technique'],
  strength: ['fuerza', 'strength'],
  mobility: ['movilidad', 'mobility'],
  competition: ['competición', 'competition'],
};

function normalise(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function messageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function calculateReply(
  question: string,
  profile: UserProfile,
  plan: RoutinePlan | null,
  history: CompletedWorkout[],
  records: LiftRecord[],
  library: ExerciseLibraryItem[],
  language: 'es' | 'en',
) {
  const es = language === 'es';
  const query = normalise(question);
  const has = (...terms: string[]) => terms.some((term) => query.includes(normalise(term)));
  const latest = latestLiftRecords(records);
  const translate = (value: string) => translateKnownText(language, value);

  if (has('dolor', 'lesion', 'lesión', 'mareo', 'pain', 'injury', 'dizzy')) {
    return es
      ? 'Si hay dolor agudo, mareo o una lesión, detén el entrenamiento. No puedo diagnosticar problemas médicos: consulta a un profesional sanitario o fisioterapeuta antes de continuar. Si solo es fatiga normal, reduce la carga y prioriza una ejecución limpia.'
      : 'If you have sharp pain, dizziness or an injury, stop training. I cannot diagnose medical issues: speak to a healthcare professional or physiotherapist before continuing. If it is ordinary fatigue, reduce the load and prioritise clean execution.';
  }

  if (has('hoy', 'sesion', 'sesión', 'entrenamiento', 'today', 'session', 'workout')) {
    if (!plan) {
      return es
        ? 'Ahora mismo no tienes una rutina activa. Crea o asigna una desde Rutinas y podré explicarte la sesión y sus cargas.'
        : 'You do not currently have an active routine. Create or assign one from Routines and I will be able to explain the session and its loads.';
    }
    const items = plan.exercises.map((exercise, index) => {
      const load = exercise.sets[0]?.weight ?? 0;
      const loadText = load > 0 ? ` · ${load} kg` : '';
      return `${index + 1}. ${translate(exercise.name)} — ${exercise.prescription}${loadText}`;
    }).join('\n');
    return es
      ? `Hoy tienes “${translate(plan.title)}”, semana ${plan.weekNumber}, día ${plan.dayIndex}.\n\n${items}\n\nMantén la técnica como criterio principal: si una carga compromete posiciones o velocidad, redúcela.`
      : `Today you have “${translate(plan.title)}”, week ${plan.weekNumber}, day ${plan.dayIndex}.\n\n${items}\n\nUse technique as the main criterion: reduce the load if it compromises positions or speed.`;
  }

  if (has('carga', 'peso usar', 'pesos', 'porcentaje', 'load', 'weight', 'percentage')) {
    if (!plan) return es ? 'Necesito una rutina activa para calcular tus cargas.' : 'I need an active routine to calculate your loads.';
    const lines = plan.exercises.map((exercise) => {
      const load = exercise.sets[0]?.weight ?? 0;
      return load > 0
        ? `• ${translate(exercise.name)}: ${load} kg (${exercise.prescription})`
        : `• ${translate(exercise.name)}: ${es ? 'sin carga calculada; falta una marca de referencia o es trabajo técnico' : 'no calculated load; a reference result is missing or this is technical work'}`;
    });
    return `${es ? 'Estas son las cargas orientativas calculadas con tus últimas marcas:' : 'These are the suggested loads calculated from your latest results:'}\n\n${lines.join('\n')}\n\n${es ? 'Puedes ajustarlas en la sesión según cómo te encuentres.' : 'You can adjust them during the session according to how you feel.'}`;
  }

  if (has('progreso', 'evolucion', 'evolución', 'marcas', 'record', 'progress', 'improv')) {
    if (records.length === 0) {
      return es
        ? 'Todavía no has registrado marcas. Añade la primera desde Progreso para que pueda analizar tu evolución y calcular porcentajes.'
        : 'You have not recorded any results yet. Add your first one from Progress so I can analyse your evolution and calculate percentages.';
    }
    const lines = liftDefinitions.map((lift) => {
      const liftRecords = records.filter((record) => record.lift === lift.id);
      const current = latest.get(lift.id);
      if (!current) return `• ${translate(lift.shortLabel)}: ${es ? 'sin datos' : 'no data'}`;
      const first = liftRecords[0];
      const change = first ? current.weightKg - first.weightKg : 0;
      const changeText = change === 0 ? '' : ` (${change > 0 ? '+' : ''}${change} kg)`;
      return `• ${translate(lift.shortLabel)}: ${current.weightKg} kg${changeText}`;
    });
    const volume = history.reduce((sum, session) => sum + session.volumeKg, 0);
    return `${es ? 'Tu resumen actual:' : 'Your current summary:'}\n\n${lines.join('\n')}\n\n${history.length} ${es ? 'sesiones terminadas' : 'completed sessions'} · ${volume.toLocaleString(es ? 'es-ES' : 'en-GB')} kg ${es ? 'de volumen acumulado' : 'total volume'}.`;
  }

  if (has('nivel', 'principiante', 'intermedio', 'avanzado', 'level', 'beginner', 'intermediate', 'advanced')) {
    const level = levelNames[profile.level][es ? 0 : 1];
    const knownMarks = latest.size;
    return es
      ? `Tu nivel estimado es ${level}. Se obtiene combinando tu experiencia en halterofilia, tu peso corporal (${profile.weightKg ?? 'sin registrar'} kg) y ${knownMarks} ${knownMarks === 1 ? 'marca registrada' : 'marcas registradas'}. La experiencia limita el nivel inicial para no recomendar movimientos demasiado avanzados antes de tiempo.`
      : `Your estimated level is ${level}. It combines your weightlifting experience, body weight (${profile.weightKg ?? 'not recorded'} kg) and ${knownMarks} recorded ${knownMarks === 1 ? 'result' : 'results'}. Experience caps the initial level so advanced movements are not recommended too early.`;
  }

  if (has('objetivo', 'objetivos', 'goal', 'goals')) {
    const goals = profile.goals.map((goal) => goalNames[goal]?.[es ? 0 : 1] ?? goal).join(', ');
    return es
      ? `Tus objetivos activos son: ${goals || 'ninguno'}. Se utilizan para ordenar las recomendaciones de rutinas. Puedes modificarlos en Perfil cuando cambie tu prioridad.`
      : `Your active goals are: ${goals || 'none'}. They are used to prioritise routine recommendations. You can change them in Profile whenever your priorities change.`;
  }

  const exactExercise = library.find((exercise) => {
    const name = normalise(exercise.name);
    const slug = normalise(exercise.slug.replaceAll('-', ' '));
    return query.includes(name) || query.includes(slug);
  });
  if (exactExercise) {
    const cues = exactExercise.cues.slice(0, 3).map((cue) => `• ${translate(cue)}`).join('\n');
    return `${translate(exactExercise.name)}\n\n${translate(exactExercise.summary)}${cues ? `\n\n${es ? 'Puntos clave' : 'Key cues'}:\n${cues}` : ''}\n\n${es ? 'Puedes consultar su ficha completa en Ejercicios.' : 'You can view its full entry under Exercises.'}`;
  }

  const requestedSection = has('movilidad', 'mobility') ? 'mobility'
    : has('arrancada', 'snatch') ? 'snatch'
      : has('dos tiempos', 'cargada', 'jerk', 'clean') ? 'clean_and_jerk'
        : has('fuerza', 'strength') ? 'strength'
          : null;
  if (requestedSection) {
    const suggestions = library.filter((exercise) => exercise.section === requestedSection).slice(0, 4);
    return `${es ? 'Puedes empezar por estas opciones del glosario:' : 'You can start with these options from the exercise library:'}\n\n${suggestions.map((exercise) => `• ${translate(exercise.name)}`).join('\n')}\n\n${es ? 'Consulta Ejercicios para ver el enfoque y los puntos técnicos de cada uno.' : 'Open Exercises to see the focus and technical cues for each one.'}`;
  }

  if (has('hola', 'buenas', 'hello', 'hi')) {
    return es
      ? `Hola, ${profile.displayName}. Tengo acceso al contexto deportivo de tu cuenta. Pregúntame por tu sesión de hoy, tus cargas, tu progreso, tu nivel o un ejercicio concreto.`
      : `Hello, ${profile.displayName}. I can use the training context from your account. Ask me about today's session, your loads, progress, level or a specific exercise.`;
  }

  return es
    ? 'Puedo ayudarte con los datos deportivos que ya existen en Haltero. Prueba a preguntarme “¿Qué entreno hoy?”, “¿Qué pesos debo usar?”, “¿Cómo van mis marcas?” o escribe el nombre de un ejercicio. Para preguntas abiertas que no estén relacionadas con esos datos haría falta activar el modelo de IA opcional.'
    : 'I can help with the training data already stored in Haltero. Try “What am I training today?”, “Which loads should I use?”, “How are my results progressing?” or enter an exercise name. Open-ended questions unrelated to that data would require the optional AI model.';
}

export function CoachAssistant({
  profile,
  plan,
  history,
  liftRecords,
  exerciseLibrary,
  onOpenExercises,
}: CoachAssistantProps) {
  const { language, tr } = useI18n();
  const [messages, setMessages] = useState<CoachMessage[]>(() => [{
    id: messageId(),
    role: 'coach',
    body: language === 'es'
      ? `Hola, ${profile.displayName}. Soy tu entrenador de Haltero. Ya tengo preparados tu perfil, rutina, marcas e historial para darte respuestas personalizadas.`
      : `Hello, ${profile.displayName}. I am your Haltero coach. Your profile, routine, results and history are ready so I can give you personalised answers.`,
  }]);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const latest = useMemo(() => latestLiftRecords(liftRecords), [liftRecords]);
  const quickQuestions = language === 'es'
    ? ['¿Qué entreno hoy?', '¿Qué pesos debo usar?', '¿Cómo van mis marcas?', '¿Cuál es mi nivel?']
    : ['What am I training today?', 'Which loads should I use?', 'How are my results?', 'What is my level?'];

  function welcomeMessage(): CoachMessage {
    return {
      id: messageId(),
      role: 'coach',
      body: tr(
        `Hola, ${profile.displayName}. Soy tu entrenador de Haltero. Ya tengo preparados tu perfil, rutina, marcas e historial para darte respuestas personalizadas.`,
        `Hello, ${profile.displayName}. I am your Haltero coach. Your profile, routine, results and history are ready so I can give you personalised answers.`,
      ),
    };
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    const userMessage: CoachMessage = { id: messageId(), role: 'user', body: cleanQuestion };
    const response: CoachMessage = {
      id: messageId(),
      role: 'coach',
      body: calculateReply(cleanQuestion, profile, plan, history, liftRecords, exerciseLibrary, language),
    };
    setMessages((current) => [...current, userMessage, response]);
    setDraft('');
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(draft);
  }

  function clearConversation() {
    const welcome = welcomeMessage();
    setMessages([welcome]);
  }

  return (
    <div className="page-wrap coach-page">
      <header className="coach-heading">
        <div>
          <p className="eyebrow">{tr('Entrenador personal', 'Personal coach')}</p>
          <h1>{tr('Pregunta. Entrena. Progresa.', 'Ask. Train. Progress.')}</h1>
          <p>{tr('Respuestas personalizadas con los datos deportivos guardados en tu cuenta.', 'Personalised answers using the training data stored in your account.')}</p>
        </div>
        <div className="coach-private-note"><ShieldCheck aria-hidden="true" /><span><strong>{tr('Modo gratuito', 'Free mode')}</strong>{tr('Procesado en tu dispositivo', 'Processed on your device')}</span></div>
      </header>

      <div className="coach-layout">
        <aside className="coach-context" aria-label={tr('Contexto usado por el entrenador', 'Context used by the coach')}>
          <div className="coach-context-title"><Database aria-hidden="true" /><div><strong>{tr('Contexto sincronizado', 'Context synced')}</strong><span>{tr('Datos de Supabase', 'Supabase data')}</span></div></div>
          <dl>
            <div><dt>{tr('Nivel', 'Level')}</dt><dd>{levelNames[profile.level][language === 'es' ? 0 : 1]}</dd></div>
            <div><dt>{tr('Rutina activa', 'Active routine')}</dt><dd>{plan ? translateKnownText(language, plan.title) : tr('Sin rutina', 'No routine')}</dd></div>
            <div><dt>{tr('Marcas conocidas', 'Known results')}</dt><dd>{latest.size}/4</dd></div>
            <div><dt>{tr('Sesiones', 'Sessions')}</dt><dd>{history.length}</dd></div>
          </dl>
          <div className="coach-context-goals">
            <span>{tr('Objetivos', 'Goals')}</span>
            <div>{profile.goals.map((goal) => <small key={goal}>{goalNames[goal]?.[language === 'es' ? 0 : 1] ?? goal}</small>)}</div>
          </div>
          <Button variant="outline" onClick={onOpenExercises}>{tr('Abrir enciclopedia', 'Open exercise library')}</Button>
        </aside>

        <section className="coach-chat" aria-label={tr('Conversación con el entrenador', 'Conversation with the coach')}>
          <header>
            <div className="coach-avatar"><Bot aria-hidden="true" /></div>
            <div><strong>HALTERO COACH</strong><span><i /> {tr('Disponible sin coste', 'Available at no cost')}</span></div>
            <button type="button" onClick={clearConversation} aria-label={tr('Borrar conversación', 'Clear conversation')} title={tr('Borrar conversación', 'Clear conversation')}><Trash2 aria-hidden="true" /></button>
          </header>
          <div className="coach-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`coach-message is-${message.role}`} key={message.id}>
                <span>{message.role === 'coach' ? tr('Entrenador', 'Coach') : tr('Tú', 'You')}</span>
                <p>{message.body}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="coach-suggestions" aria-label={tr('Preguntas sugeridas', 'Suggested questions')}>
            {quickQuestions.map((question) => <button type="button" onClick={() => ask(question)} key={question}>{question}</button>)}
          </div>
          <form className="coach-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="coach-question">{tr('Escribe tu pregunta', 'Enter your question')}</label>
            <textarea id="coach-question" rows={2} maxLength={400} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                ask(draft);
              }
            }} placeholder={tr('Pregunta sobre tu entrenamiento…', 'Ask about your training…')} />
            <Button type="submit" size="icon" disabled={!draft.trim()} aria-label={tr('Enviar pregunta', 'Send question')}><Send aria-hidden="true" /></Button>
          </form>
          <p className="coach-disclaimer">{tr('Las sugerencias son orientativas y no sustituyen a un entrenador presencial ni a un profesional sanitario.', 'Suggestions are for guidance and do not replace an in-person coach or healthcare professional.')}</p>
        </section>
      </div>
    </div>
  );
}
