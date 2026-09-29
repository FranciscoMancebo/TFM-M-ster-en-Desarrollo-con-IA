'use client';

import { useState } from 'react';
import { Activity, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import type { SessionFeedback, SessionFeeling } from '@/lib/workout/types';

export function WorkoutFeedbackDialog({
  open,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: SessionFeedback) => Promise<void>;
}) {
  const { tr } = useI18n();
  const [painLevel, setPainLevel] = useState(0);
  const [fatigueLevel, setFatigueLevel] = useState(5);
  const [overallFeeling, setOverallFeeling] = useState<SessionFeeling>('good');
  const [notes, setNotes] = useState('');

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    await onSubmit({ painLevel, fatigueLevel, overallFeeling, notes });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="feedback-dialog">
        <DialogHeader>
          <DialogTitle>{tr('¿Cómo ha ido la sesión?', 'How did the session feel?')}</DialogTitle>
          <DialogDescription>{tr('Este registro ayuda a interpretar el rendimiento y detectar acumulación de fatiga.', 'This helps interpret performance and detect accumulated fatigue.')}</DialogDescription>
        </DialogHeader>
        <form id="workout-feedback-form" className="feedback-form" onSubmit={(event) => void submit(event)}>
          <label className="feedback-range">
            <span><HeartPulse aria-hidden="true" /><strong>{tr('Dolor', 'Pain')}</strong><output>{painLevel}/10</output></span>
            <input type="range" min={0} max={10} step={1} value={painLevel} onChange={(event) => setPainLevel(Number(event.target.value))} />
            <small>{tr('0 = sin dolor · 10 = dolor máximo', '0 = no pain · 10 = maximum pain')}</small>
          </label>
          <label className="feedback-range">
            <span><Activity aria-hidden="true" /><strong>{tr('Fatiga', 'Fatigue')}</strong><output>{fatigueLevel}/10</output></span>
            <input type="range" min={0} max={10} step={1} value={fatigueLevel} onChange={(event) => setFatigueLevel(Number(event.target.value))} />
            <small>{tr('Valora cómo terminas, no solo el esfuerzo de la última serie.', 'Rate how you finish, not only the effort of the last set.')}</small>
          </label>
          <label><span>{tr('Sensación general', 'Overall feeling')}</span><select value={overallFeeling} onChange={(event) => setOverallFeeling(event.target.value as SessionFeeling)}>
            <option value="poor">{tr('Mala', 'Poor')}</option>
            <option value="okay">{tr('Regular', 'Okay')}</option>
            <option value="good">{tr('Buena', 'Good')}</option>
            <option value="excellent">{tr('Excelente', 'Excellent')}</option>
          </select></label>
          <label><span>{tr('Notas opcionales', 'Optional notes')}</span><textarea rows={3} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={tr('Molestias, sueño, estrés o cualquier contexto útil.', 'Discomfort, sleep, stress or any useful context.')} /></label>
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>{tr('Seguir entrenando', 'Keep training')}</Button>
          <Button type="submit" form="workout-feedback-form" disabled={saving}>{saving ? tr('Guardando…', 'Saving…') : tr('Guardar y finalizar', 'Save and finish')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
