'use client';

import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { RestTimerState } from '@/lib/workout/rest-timer';

export function RestTimer({
  timer,
  remainingSeconds,
  onPause,
  onResume,
  onRestart,
  onAddTime,
  onSkip,
}: {
  timer: RestTimerState;
  remainingSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onAddTime: () => void;
  onSkip: () => void;
}) {
  const { tr } = useI18n();
  const complete = remainingSeconds < 1;
  const paused = timer.endsAt === null && !complete;
  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
  const progress = timer.durationSeconds > 0
    ? Math.max(0, Math.min(100, remainingSeconds / timer.durationSeconds * 100))
    : 0;

  return (
    <section className={`rest-timer ${complete ? 'is-complete' : paused ? 'is-paused' : ''}`} aria-labelledby="rest-timer-title">
      <header>
        <span className="rest-timer-icon"><Timer aria-hidden="true" /></span>
        <div>
          <p id="rest-timer-title">{complete ? tr('Descanso terminado', 'Rest complete') : paused ? tr('Descanso pausado', 'Rest paused') : tr('Tiempo de descanso', 'Rest timer')}</p>
          <strong>{timer.exerciseName} · {tr('serie', 'set')} {timer.setNumber}</strong>
        </div>
        <button type="button" className="rest-timer-close" onClick={onSkip} aria-label={tr('Cerrar temporizador', 'Close timer')}><X aria-hidden="true" /></button>
      </header>
      <div className="rest-timer-clock" aria-label={`${minutes}:${seconds}`}>
        <strong>{minutes}:{seconds}</strong>
        <span aria-live="polite">{complete ? tr('Puedes comenzar la siguiente serie', 'You can start the next set') : paused ? tr('Pausado', 'Paused') : tr('Recuperando', 'Recovering')}</span>
      </div>
      <div className="rest-timer-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
      <div className="rest-timer-actions">
        {!complete && <Button type="button" variant="outline" size="sm" onClick={paused ? onResume : onPause}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? tr('Reanudar', 'Resume') : tr('Pausar', 'Pause')}</Button>}
        <Button type="button" variant="outline" size="sm" onClick={onRestart}><RotateCcw aria-hidden="true" />{tr('Reiniciar', 'Restart')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onAddTime}>+30 s</Button>
        <Button type="button" size="sm" onClick={onSkip}>{complete ? tr('Cerrar', 'Close') : tr('Saltar', 'Skip')}</Button>
      </div>
    </section>
  );
}
