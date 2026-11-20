export type RestTimerState = {
  id: string;
  sessionId: string;
  exerciseName: string;
  setNumber: number;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number | null;
};

const MAX_REST_SECONDS = 3600;

function safeSeconds(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_REST_SECONDS, Math.round(value)));
}

export function resolveRestDuration(prescribedSeconds: number | null, fallbackSeconds: number) {
  return prescribedSeconds !== null && prescribedSeconds > 0
    ? safeSeconds(prescribedSeconds)
    : safeSeconds(fallbackSeconds);
}

export function createRestTimer(
  sessionId: string,
  exerciseName: string,
  setNumber: number,
  durationSeconds: number,
  now = Date.now(),
  idFactory: () => string = () => crypto.randomUUID(),
): RestTimerState {
  const duration = safeSeconds(durationSeconds);
  if (!sessionId || !exerciseName || setNumber < 1 || duration < 1) throw new Error('No se pudo preparar el descanso.');
  return {
    id: idFactory(),
    sessionId,
    exerciseName,
    setNumber,
    durationSeconds: duration,
    remainingSeconds: duration,
    endsAt: now + duration * 1000,
  };
}

export function restSecondsRemaining(timer: RestTimerState, now = Date.now()) {
  if (timer.endsAt === null) return safeSeconds(timer.remainingSeconds);
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

export function pauseRestTimer(timer: RestTimerState, now = Date.now()): RestTimerState {
  return { ...timer, remainingSeconds: restSecondsRemaining(timer, now), endsAt: null };
}

export function resumeRestTimer(timer: RestTimerState, now = Date.now()): RestTimerState {
  const remaining = restSecondsRemaining(timer, now);
  if (remaining < 1) return { ...timer, remainingSeconds: 0, endsAt: null };
  return { ...timer, remainingSeconds: remaining, endsAt: now + remaining * 1000 };
}

export function addRestTimerSeconds(timer: RestTimerState, seconds: number, now = Date.now()): RestTimerState {
  const remaining = Math.min(MAX_REST_SECONDS, restSecondsRemaining(timer, now) + safeSeconds(seconds));
  return {
    ...timer,
    durationSeconds: Math.max(timer.durationSeconds, remaining),
    remainingSeconds: remaining,
    endsAt: timer.endsAt === null ? null : now + remaining * 1000,
  };
}

export function restartRestTimer(timer: RestTimerState, now = Date.now()): RestTimerState {
  return { ...timer, remainingSeconds: timer.durationSeconds, endsAt: now + timer.durationSeconds * 1000 };
}

export function completeRestTimer(timer: RestTimerState): RestTimerState {
  return { ...timer, remainingSeconds: 0, endsAt: null };
}

export function serializeRestTimer(timer: RestTimerState) {
  return JSON.stringify(timer);
}

export function parseRestTimer(value: string | null, sessionId: string): RestTimerState | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<RestTimerState>;
    if (
      typeof candidate.id !== 'string'
      || candidate.sessionId !== sessionId
      || typeof candidate.exerciseName !== 'string'
      || typeof candidate.setNumber !== 'number'
      || typeof candidate.durationSeconds !== 'number'
      || typeof candidate.remainingSeconds !== 'number'
      || (candidate.endsAt !== null && typeof candidate.endsAt !== 'number')
    ) return null;
    return {
      id: candidate.id,
      sessionId,
      exerciseName: candidate.exerciseName,
      setNumber: Math.max(1, Math.round(candidate.setNumber)),
      durationSeconds: safeSeconds(candidate.durationSeconds),
      remainingSeconds: safeSeconds(candidate.remainingSeconds),
      endsAt: candidate.endsAt,
    };
  } catch {
    return null;
  }
}

export function restTimerStorageKey(userId: string) {
  return `haltero-rest-timer:${userId}`;
}
