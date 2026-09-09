# 07. Registro de riesgos

Escala: probabilidad e impacto de 1 (bajo) a 5 (alto). Exposición = probabilidad × impacto.

| ID | Riesgo | P | I | Exp. | Mitigación | Disparador / contingencia |
| --- | --- | ---: | ---: | ---: | --- | --- |
| R-01 | Alcance excesivo para una persona | 4 | 5 | 20 | MVP cerrado y fases con puertas | Si una fase se retrasa > 1 semana, eliminar primero capacidades Could/Should |
| R-02 | Una regla de cálculo produce cargas o marcas incorrectas | 3 | 5 | 15 | Casos de prueba con ejemplos revisados y funciones puras | Desactivar cálculo derivado y mostrar datos registrados |
| R-03 | Acceso a datos de otro usuario | 2 | 5 | 10 | Grants mínimos, RLS y pruebas allow/deny | Desactivar función afectada y corregir antes de demo |
| R-04 | No conseguir entrenador para evaluar | 3 | 4 | 12 | Contacto temprano y protocolo remoto corto | Evaluación con practicantes avanzados y declarar limitación |
| R-05 | Indisponibilidad de servicios gestionados | 3 | 3 | 9 | Copias, migraciones versionadas y manejo de errores | Activar modo degradado y documentar recuperación |
| R-06 | El portal público expone contenido privado | 2 | 5 | 10 | RLS, filtros explícitos y pruebas con dos usuarios | Retirar portal hasta corregir y verificar |
| R-07 | Historial incompleto produce métricas engañosas | 4 | 3 | 12 | Distinguir ausencia de datos, importaciones y marcas confirmadas | Ocultar el cálculo derivado y mostrar el dato fuente |
| R-08 | Modelo de series demasiado simple | 3 | 4 | 12 | Validar complejos y series escalonadas en fase 0 | Añadir bloque de series antes de comunidad |
| R-09 | Mala experiencia con móvil en gimnasio | 3 | 4 | 12 | Prototipo temprano, objetivos táctiles y prueba contextual | Priorizar flujo de sesión sobre paneles secundarios |
| R-10 | Dependencia excesiva de servicios gestionados | 2 | 3 | 6 | SQL/migraciones versionados y puertos de infraestructura | Documentar exportación y alternativa local |
| R-11 | Memoria se deja para el final | 4 | 4 | 16 | Diario, ADR y evidencia por iteración | Reservar bloque semanal fijo de documentación |
| R-12 | Afirmaciones deportivas sin evidencia | 3 | 5 | 15 | Lenguaje prudente, revisión experta y límites claros | Retirar afirmación o etiquetarla como hipótesis |

## Revisión

Revisar el registro al cerrar cada fase y añadir fecha, responsable y estado cuando comience el desarrollo. Los riesgos R-01, R-02, R-03, R-06 y R-11 se revisan semanalmente.
