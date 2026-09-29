'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, ExternalLink, Info, Scale, Trophy, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import {
  assessRfehQualification,
  federationAge,
  RFEH_RULES_URL,
  RFEH_STANDARD_YEAR,
  RFEH_STANDARDS_URL,
  type RfehAgeGroup,
} from '@/lib/workout/competition-standards';
import { latestLiftRecords } from '@/lib/workout/lifts';
import type { LiftRecord, UserProfile } from '@/lib/workout/types';

const ageGroupLabels: Record<RfehAgeGroup, [string, string]> = {
  sub15: ['Campeonato de España Sub-15', 'Spanish U15 Championship'],
  sub17: ['Campeonato de España Sub-17', 'Spanish U17 Championship'],
  junior: ['Campeonato de España Júnior', 'Spanish Junior Championship'],
  senior: ['Campeonato de España Absoluto', 'Spanish Senior Championship'],
};

export function CompetitionEligibility({ profile, records }: { profile: UserProfile; records: LiftRecord[] }) {
  const { language, tr } = useI18n();
  const [open, setOpen] = useState(false);
  const latest = useMemo(() => latestLiftRecords(records), [records]);
  const snatch = latest.get('snatch')?.weightKg ?? null;
  const cleanAndJerk = latest.get('clean_and_jerk')?.weightKg ?? null;
  const complete = profile.birthYear !== null && profile.competitionSex !== null && profile.weightKg !== null && snatch !== null && cleanAndJerk !== null;
  const results = complete
    ? assessRfehQualification({
        birthYear: profile.birthYear!,
        sex: profile.competitionSex!,
        bodyWeightKg: profile.weightKg!,
        snatchKg: snatch!,
        cleanAndJerkKg: cleanAndJerk!,
      })
    : [];
  const passed = results.filter((result) => result.meetsReference).length;
  const age = profile.birthYear === null ? null : federationAge(profile.birthYear);
  const currentTotal = snatch !== null && cleanAndJerk !== null ? snatch + cleanAndJerk : null;

  const status = !complete
    ? tr('Faltan datos', 'Missing data')
    : results.length === 0
      ? tr('Sin categoría con mínima', 'No eligible minimum category')
      : passed > 0
        ? tr(`Cumples ${passed} referencia${passed === 1 ? '' : 's'}`, `You meet ${passed} reference${passed === 1 ? '' : 's'}`)
        : tr('Aún no alcanzas la mínima', 'Minimum not reached yet');

  return <>
    <button type="button" className={`competition-eligibility-card${passed > 0 ? ' is-qualified' : ''}`} onClick={() => setOpen(true)}>
      <span className="competition-eligibility-icon">{passed > 0 ? <Trophy aria-hidden="true" /> : complete ? <Scale aria-hidden="true" /> : <CircleDashed aria-hidden="true" />}</span>
      <span><small>{tr('REFERENCIA RFEH 2026', 'RFEH 2026 REFERENCE')}</small><strong>{status}</strong><em>{tr('Ver baremos y requisitos', 'View standards and requirements')}</em></span>
    </button>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="competition-eligibility-dialog">
        <DialogHeader>
          <DialogTitle>{tr('Referencia para Campeonatos de España', 'Spanish Championship reference')}</DialogTitle>
          <DialogDescription>{tr('Comparación orientativa con las mínimas nacionales RFEH de la temporada 2026.', 'Indicative comparison with the RFEH national minimums for the 2026 season.')}</DialogDescription>
        </DialogHeader>

        <div className="competition-reference-summary">
          <div><span>{tr('Edad federativa', 'Federation age')}</span><strong>{age === null ? '—' : `${age} ${tr('años', 'years')}`}</strong></div>
          <div><span>{tr('Peso actual', 'Current weight')}</span><strong>{profile.weightKg === null ? '—' : `${profile.weightKg} kg`}</strong></div>
          <div><span>{tr('Total de referencia', 'Reference total')}</span><strong>{currentTotal === null ? '—' : `${currentTotal} kg`}</strong><small>{snatch ?? '—'} + {cleanAndJerk ?? '—'} kg</small></div>
        </div>

        {!complete && <div className="competition-reference-missing"><Info aria-hidden="true" /><div><strong>{tr('Completa la referencia', 'Complete your reference')}</strong><p>{tr('Necesitamos año de nacimiento, categoría de competición, peso, arrancada y dos tiempos.', 'We need birth year, competition category, body weight, snatch and clean and jerk.')}</p></div></div>}

        {complete && results.length === 0 && <div className="competition-reference-missing"><Info aria-hidden="true" /><div><strong>{tr('No hay una mínima nacional aplicable', 'No applicable national minimum')}</strong><p>{tr('Las categorías con mínima de Campeonato de España comienzan a los 13 años. La Jornada de Técnica tiene reglas diferentes.', 'Spanish Championship minimum categories start at age 13. The Technique event uses different rules.')}</p></div></div>}

        {results.length > 0 && <div className="competition-standard-list">{results.map((result) => <article className={result.meetsReference ? 'is-qualified' : ''} key={result.ageGroup}>
          <div className="competition-standard-status">{result.meetsReference ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}</div>
          <div><span>{language === 'es' ? ageGroupLabels[result.ageGroup][0] : ageGroupLabels[result.ageGroup][1]}</span><strong>{result.meetsReference ? tr('Referencia alcanzada', 'Reference reached') : tr('Referencia pendiente', 'Reference pending')}</strong><small>{tr('Categoría', 'Category')} {result.weightCategory} · {result.elitePointsRequired} {tr('puntos élite', 'elite points')}</small></div>
          <dl><div><dt>{tr('Mínima', 'Minimum')}</dt><dd>{result.minimumTotalKg} kg</dd></div><div><dt>{tr('Diferencia', 'Difference')}</dt><dd>{result.differenceKg > 0 ? '+' : ''}{result.differenceKg} kg</dd></div></dl>
        </article>)}</div>}

        {age !== null && age >= 35 && <p className="competition-master-note"><Info aria-hidden="true" />{tr('La categoría Máster se rige por su normativa específica y no se incluye en este cálculo.', 'The Masters category follows separate rules and is not included in this calculation.')}</p>}

        <section className="competition-official-note">
          <h3>{tr('Qué significa este resultado', 'What this result means')}</h3>
          <p>{tr('Compara tus referencias personales con el total mínimo calculado desde las tablas oficiales. No confirma por sí solo que seas apto para competir.', 'It compares your personal references with the minimum total calculated from the official tables. It does not by itself confirm eligibility to compete.')}</p>
          <ul>
            <li>{tr('La mínima debe acreditarse en una competición validada por la RFEH.', 'The minimum must be achieved at an RFEH-validated competition.')}</li>
            <li>{tr('Debe haberse realizado durante los siete meses anteriores al campeonato.', 'It must have been achieved during the seven months before the championship.')}</li>
            <li>{tr('También se exige licencia activa, cuotas al corriente y no tener una sanción vigente.', 'An active licence, paid fees and no current sanction are also required.')}</li>
            <li>{tr('Peso y categoría deben confirmarse según la inscripción y el pesaje oficiales.', 'Weight and category must be confirmed through official entry and weigh-in procedures.')}</li>
          </ul>
          <div><a href={RFEH_RULES_URL} target="_blank" rel="noreferrer">{tr('Bases reglamentarias 4.2026', 'Rules 4.2026')}<ExternalLink aria-hidden="true" /></a><a href={RFEH_STANDARDS_URL} target="_blank" rel="noreferrer">{tr('Tablas oficiales RFEH', 'Official RFEH tables')}<ExternalLink aria-hidden="true" /></a></div>
          <small>{tr(`Cálculo para la temporada ${RFEH_STANDARD_YEAR}, categorías vigentes desde el 1 de agosto de 2026.`, `Calculation for the ${RFEH_STANDARD_YEAR} season, weight categories effective from 1 August 2026.`)}</small>
        </section>
      </DialogContent>
    </Dialog>
  </>;
}
