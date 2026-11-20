# 09. Matriz de trazabilidad

## 1. Convenciones

- **Implementada:** existe código y modelo de datos.
- **Validación técnica:** tipos/build o restricción estructural comprobable.
- **Pendiente de evidencia:** requiere prueba automatizada adicional o evaluación humana.

## 2. Matriz

| Requisitos | Implementación | Datos | Validación / estado |
| --- | --- | --- | --- |
| RF-001 | `app/page.tsx`, `lib/supabase/client.ts` | Auth | E2E básico y recorrido autenticado remoto superados |
| RF-002–010 | `InitialSetup`, vista Perfil, `i18n.tsx` | migraciones 001, 003, 006, 013–014 | Implementada; tarea T1/T6 pendiente |
| RF-006–007 | `lifts.ts`, `InitialSetup` | migraciones 002–004 | Unitarias de nivel, ratios y límites superadas |
| RF-020–023 | `exercise-encyclopedia.tsx` | migraciones 005 y 010 | Implementada |
| RF-024–026 | `lift-progress.tsx`, `routine-generator.ts` | `lift_records` | Unitarias de ausencia de marca, porcentaje y redondeo superadas |
| RF-030–038 | `routine-hub.tsx`, `routine-generator.ts` | migraciones 007–012 | Implementada; E2E pendiente |
| RF-040–048 | `app/page.tsx`, repositorio | sesiones y series de 001; RPC de migraciones 202609280001 y 202609280003 | E2E autenticado completa una sesión y confirma la marca detectada |
| RF-049 | `training-calendar.tsx`, `calendar.ts`, repositorio | `training_calendar_events` y RPC de migración 202609280002 | Unitarias de fechas y pgTAP de calendario añadidas; E2E pendiente |
| RF-050–057 | `routine-hub.tsx` | migraciones 007–012 | Implementada; RLS social pendiente |
| RF-058–059 | `public-athlete-profile.tsx` | migraciones 013–015 | Prueba pgTAP añadida; ejecución pendiente en entorno DB operativo |
| RF-060–063 | `notification-center.tsx` | migración 015 | Prueba pgTAP añadida; ejecución pendiente en entorno DB operativo |
| RF-064–069 | `achievement-console.tsx`, `gamification-celebration.tsx`, perfil público | migraciones 015, 202609250001 y 202609280002 | Detección de celebraciones probada; volumen, marcas, rachas y semanas cubiertos |
| RF-070–073 | `coach-assistant.tsx` | Contexto cargado por repositorio | Implementada; evaluación de respuestas pendiente |
| RF-074–081 | `performance-records.tsx`, `workout-feedback-dialog.tsx`, `performance.ts`, repositorio | migración 202609280003, `exercise_records`, campos de planificación y recuperación | 4 unitarias y pgTAP `0005` añadidas; E2E pendiente |
| RF-114 | `workout-history-list.tsx`, `history.ts`, repositorio | `workout_sessions` y `performed_sets` | 3 unitarias de numeración y paso E2E autenticado añadidos |
| RF-115 | `training-calendar.tsx`, `free-session.ts`, `app/page.tsx`, repositorio | relaciones opcionales de `workout_sessions` y `performed_sets`, enlace de calendario y RPC de rutinas | 4 unitarias de construcción/conversión y pgTAP `0010` añadidos |
| RF-116 | `rest-timer.tsx`, `rest-timer.ts`, `app/page.tsx`, Perfil | `prescriptions.rest_seconds` y preferencias de migración `202611200001` | 5 unitarias de tiempo/restauración y pgTAP `0011` añadidos |
| RF-082–086 | `advanced-statistics.tsx`, `statistics.ts`, repositorio | sesiones, series, ejercicios, marcas y peso del perfil | 7 unitarias de clasificación, agregación, fechas, exclusiones y vacíos añadidas |
| RF-087–091 | `routine-hub.tsx`, `training-blocks.ts`, repositorio | migración 202609290001 y semanas materializadas en `routine_days` | 3 unitarias de fases, progresión, descarga y cargas absolutas superadas |
| RF-092–094 | `AuthScreen`, `PasswordRecoveryScreen`, Perfil, repositorio | Supabase Auth y migración 202609290002 | E2E de recuperación visible, exportación descargada y borrado real de cuenta efímera |
| RF-095–096 | `routine-hub.tsx`, `notification-center.tsx`, repositorio | RPC paginadas de migración 202609290002 | E2E de dos páginas de comunidad y pgTAP `0006` añadidos |
| RF-097–098 | `AppFrame`, CSS global, `contrast.ts` | — | E2E de orden de teclado y 5 pares de contraste AA superados |
| RF-099 | `React.lazy`, `scripts/check-bundle-size.mjs` | — | 37 chunks; máximo 328,1 kB bruto/96,4 kB gzip; presupuesto integrado en `check` |
| RF-100–103 | `profile-showcase-editor.tsx`, `public-athlete-profile.tsx`, `profile-showcase.ts` | migración 202609290004, tablas y RPC de recompensas | 4 unitarias de niveles/URLs, pgTAP `0007` y recorrido E2E autenticado añadidos |
| RF-104–108 | `achievement-console.tsx`, `gamification-celebration.tsx`, `public-athlete-profile.tsx`, `rewards.ts` | migración 202609290005, catálogo, preferencias y RPC de cosméticos | 3 unitarias, pgTAP `0008` y equipamiento dentro del E2E autenticado añadidos |
| RF-109–113 | `competition-eligibility.tsx`, `competition-standards.ts`, Perfil y onboarding | migración 202609290006, `birth_year` y `competition_sex` | 10 unitarias, pgTAP `0009` y modal dentro del E2E autenticado añadidos |
| RNF-001 | CSS responsive | — | Implementada; QA 360/768/1440 pendiente |
| RNF-002 | UI semántica, primitives | — | Lint de accesibilidad superado; auditoría WCAG manual pendiente |
| RNF-003 | Build de producción | — | Métricas de despliegue pendientes |
| RNF-004–006 | RLS, constraints, claves únicas | todas las migraciones | Cobertura inicial; ampliación pendiente |
| RNF-007 | tipos, reglas y repositorio | — | TypeScript, lint y 64 unitarias superadas; workflow automático añadido |
| RNF-008 | migraciones y variables | — | Documentada |
| RNF-009 | `i18n.tsx` y contenido bilingüe | `preferred_language` | Implementada; recorrido completo pendiente |
| RNF-010 | generador explicable | marcas y notas | Implementada |
| RNF-011 | límites de error por vista | — | Implementada parcialmente |
| RNF-012 | README y guía operativa | migraciones versionadas | Documentada |

## 3. Evidencia que debe añadirse

| ID | Evidencia | Ubicación propuesta |
| --- | --- | --- |
| EV-01 | salida de tipos y build | workflow `quality.yml` y anexo técnico |
| EV-02 | 64 unitarias de nivel, cargas, generador, bloques, celebraciones, calendario, rendimiento, estadísticas, contraste, baremos, recompensas de perfil, historial y temporizador | `web/tests/unit` e informe de pruebas |
| EV-03 | RLS con dos usuarios | informe de seguridad |
| EV-04 | privacidad granular | `supabase/tests/0002_social_privacy_gamification.test.sql` |
| EV-05 | importación y procedencia | prueba E2E |
| EV-06 | notificación, hitos y XP social | `supabase/tests/0002_social_privacy_gamification.test.sql` |
| EV-07 | navegación por teclado | checklist de accesibilidad |
| EV-08 | Core Web Vitals | informe de rendimiento |
| EV-09 | tareas T1–T8 | resultados de usuarios |
| EV-10 | detección, autorización e idempotencia de marcas desde sesiones | `supabase/tests/0003_workout_personal_bests.test.sql` |
| EV-11 | RLS, estados, enlace de sesión, adherencia, racha y reprogramación | `supabase/tests/0004_training_calendar_adherence.test.sql` |
| EV-12 | confirmación de récords, variantes, 1RM estimado, recuperación, comparación plan/real y RLS | `supabase/tests/0005_performance_records_recovery.test.sql` |
| EV-13 | volumen semanal, intensidad, distribución, total olímpico, peso corporal y estados vacíos | `web/tests/unit/statistics.test.ts` |
| EV-14 | sesión autenticada, detección, confirmación y sincronización de una marca canónica | `web/tests/e2e/authenticated-session.spec.ts` |
| EV-15 | fases, descarga configurable y progresión porcentual sin alterar cargas absolutas | `web/tests/unit/training-blocks.test.ts` |
| EV-16 | exportación, borrado de cuenta, páginas remotas y aislamiento por usuario | `authenticated-session.spec.ts` y `supabase/tests/0006_account_privacy_pagination.test.sql` |
| EV-17 | teclado, foco, contraste y presupuesto de chunks | `auth.spec.ts`, `accessibility-contrast.test.ts` y `scripts/check-bundle-size.mjs` |
| EV-18 | desbloqueo por nivel, validación de URLs, privacidad y exportación de galería/enlaces | `profile-showcase.test.ts`, `authenticated-session.spec.ts` y `supabase/tests/0007_profile_level_rewards.test.sql` |
| EV-19 | cosméticos por nivel, hitos 5/10, categorías, equipamiento, exposición pública y exportación | `profile-rewards.test.ts`, `authenticated-session.spec.ts` y `supabase/tests/0008_cosmetic_rewards.test.sql` |
| EV-20 | edad federativa, categoría de peso, mínima RFEH, solapamiento de campeonatos y advertencia normativa | `competition-standards.test.ts`, `authenticated-session.spec.ts` y `supabase/tests/0009_competition_profile.test.sql` |

## 4. Regla de mantenimiento

Todo requisito nuevo debe incorporarse aquí junto a su componente, migración y prueba. Ninguna fila cambia a «validada» sin una evidencia reproducible.
