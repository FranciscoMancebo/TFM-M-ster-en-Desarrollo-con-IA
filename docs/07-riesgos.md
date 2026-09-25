# 07. Registro de riesgos

Escala: probabilidad e impacto de 1 a 5. Exposición = P × I.

| ID | Riesgo | P | I | Exp. | Mitigación | Contingencia |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-01 | Alcance excesivo | 4 | 5 | 20 | Capacidad por fases y backlog Must/Should/Could | Congelar funciones y priorizar evaluación |
| R-02 | Carga recomendada incorrecta | 3 | 5 | 15 | Referencia compatible, reglas puras, 0 kg sin marca y edición | Desactivar sugerencia afectada |
| R-03 | Nivel deportivo sobreestimado | 3 | 5 | 15 | Experiencia limita nivel; pruebas con fuerza relativa | Mostrar nivel inferior y revisión manual |
| R-04 | Acceso cruzado a datos | 2 | 5 | 10 | RLS, RPC limitadas y pruebas con dos usuarios | Retirar función hasta corregir |
| R-05 | Perfil público expone datos ocultos | 2 | 5 | 10 | Tabla base owner-only y proyección RPC | Deshabilitar vista pública |
| R-06 | XP duplicada por reintentos | 2 | 3 | 6 | `event_key` única e inserciones idempotentes | Recalcular libro mayor |
| R-07 | Notificaciones generan ruido | 3 | 2 | 6 | Solo likes/preguntas externas, leídas y límite | Agrupar o permitir preferencias |
| R-08 | Gamificación se confunde con nivel técnico | 3 | 4 | 12 | Etiquetas separadas y explicación | Ocultar rango público temporalmente |
| R-09 | Avatar base64 aumenta filas y tráfico | 3 | 3 | 9 | Compresión 320 px y límite 5 MB de origen | Migrar a Storage |
| R-10 | Dependencia de Supabase | 2 | 4 | 8 | SQL versionado, HTTP estándar y exportación | Restaurar en PostgreSQL compatible |
| R-11 | Dependencia del hosting | 2 | 3 | 6 | Frontend portable y variables externas | Desplegar en alternativa compatible |
| R-12 | Bundle grande por gráficos/UI | 3 | 3 | 9 | Medir y aplicar carga diferida | Dividir vistas pesadas |
| R-13 | Traducción incompleta | 3 | 2 | 6 | Recorrido bilingüe en pruebas | Volver temporalmente a español |
| R-14 | Sondeo de notificaciones innecesario | 2 | 2 | 4 | Intervalo 45 s y límite de resultados | Cargar al abrir o usar Realtime |
| R-15 | Asistente responde fuera de contexto | 2 | 4 | 8 | Intenciones cerradas y mensaje de límite | Restringir sugerencias rápidas |
| R-16 | Falta de evaluación con usuarios | 3 | 4 | 12 | Reclutamiento temprano y protocolo corto | Inspección experta reproducible |
| R-17 | Documentación diverge del código | 3 | 4 | 12 | Documentación en definición de terminado | Auditoría antes de entrega |
| R-18 | Migración aplicada falla parcialmente | 2 | 5 | 10 | Migraciones aditivas, revisión y lint | Nueva migración correctiva |
| R-19 | Credenciales en repositorio | 2 | 5 | 10 | `.env.local` ignorado y claves públicas únicamente | Rotación inmediata |
| R-20 | Confundir recomendación con asesoramiento médico | 2 | 5 | 10 | Límites visibles y lenguaje prudente | Retirar contenido problemático |

## Seguimiento

Los riesgos R-01, R-02, R-04, R-05, R-16 y R-17 se revisan semanalmente. Cada revisión debe añadir fecha, estado, evidencia y responsable en el diario de proyecto.

## Riesgos materializados y respuesta

- La ausencia de una marca producía inicialmente una carga no justificada: la regla consolidada fija 0 kg y comunica el límite.
- La lectura directa de perfiles podía entrar en conflicto con la privacidad granular: se endureció a owner-only y se creó una proyección pública.
- La documentación quedó desactualizada respecto al producto: se incorpora su revisión integral a la fase de consolidación.
