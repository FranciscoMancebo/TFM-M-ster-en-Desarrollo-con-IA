# 05. Plan de desarrollo

## 1. Método

El proyecto sigue entregas verticales: cada incremento incorpora interfaz, reglas, datos, seguridad y validación. La documentación, las migraciones y los ADR forman parte de la definición de terminado.

## 2. Plan original de capacidades

| Fase | Resultado |
| --- | --- |
| 0. Descubrimiento | Visión, referentes, requisitos, riesgos y wireflow |
| 1. Base técnica | Auth, Supabase, RLS, catálogo mínimo y sesión |
| 2. Personalización | Onboarding, marcas, experiencia y nivel |
| 3. Planificación | Rutinas manuales/asistidas y días independientes |
| 4. Progreso y conocimiento | Gráficos y enciclopedia |
| 5. Comunidad | Publicación, perfiles, likes, preguntas e importación |
| 6. Adherencia | Notificaciones, XP, niveles de cuenta y logros |
| 7. Consolidación | Internacionalización, documentación, pruebas y evaluación |
| 8. Entrega | Despliegue estable, memoria y defensa |

## 3. Estado de implementación

| Capacidad | Estado | Evidencia principal |
| --- | --- | --- |
| Auth y aprovisionamiento | Implementada | migraciones 001–002 y pantalla de acceso |
| Onboarding y perfil | Implementada | migraciones 003–006 y `app/page.tsx` |
| Nivel deportivo | Implementada | `lifts.ts` y constraints |
| Marcas y gráficos | Implementada | `lift-progress.tsx` |
| Enciclopedia ampliada | Implementada | migraciones 005 y 010 |
| Rutinas sociales | Implementada | migraciones 007–009 |
| Rutinas por días | Implementada | migración 011 |
| Activación e importación | Implementada | migración 012 |
| Datos ficticios | Implementada | migración 012 |
| Perfiles públicos y privacidad | Implementada | migraciones 013–014 |
| Notificaciones y logros | Implementada | migración 015, consola y celebraciones globales |
| Español/inglés | Implementada | `i18n.tsx` y preferencia persistida |
| Entrenador por reglas | Implementada | `coach-assistant.tsx` |
| Calendario y adherencia | Implementada | migración `202609280002`, `training-calendar.tsx` y pruebas de fechas |
| Rendimiento y recuperación | Implementada | migración `202609280003`, `performance.ts` y diálogo de cierre |
| Récords por ejercicio y repeticiones | Implementada | `exercise_records`, `performance-records.tsx` y pgTAP `0005` |
| Estadísticas avanzadas | Implementada | `statistics.ts`, `advanced-statistics.tsx` y pruebas unitarias |
| Suite automatizada inicial | Implementada | Vitest, Playwright y pgTAP |
| Suite funcional/E2E completa | En curso | faltan sesiones, rutinas e importación |
| Evaluación con usuarios | Pendiente | protocolo definido |
| Exportación y borrado autoservicio | Pendiente | trabajo futuro priorizado |

## 4. Incrementos

### Incremento A — Identidad y recorrido mínimo

- autenticación;
- perfil y aprovisionamiento;
- catálogo semilla;
- rutina asignada;
- sesión y series;
- RLS.

### Incremento B — Perfil adaptativo

- configuración guiada;
- días, medidas, experiencia y objetivos;
- marcas opcionales;
- avatar;
- cálculo de cuatro niveles;
- corrección de cargas sin referencia.

### Incremento C — Planificación completa

- crear, editar y eliminar;
- público/privado;
- modo manual y reglas;
- días independientes;
- ejercicios y prescripciones;
- activación exclusiva.

### Incremento D — Conocimiento y progreso

- enciclopedia por secciones;
- variantes técnicas;
- registro de marcas desde gráfico;
- detección automática de nuevas marcas al finalizar sesiones;
- confirmación configurable, récords 1RM/2RM/3RM/5RM y estimación de 1RM;
- récords separados para cada variante;
- RPE por serie, sensaciones de cierre y comparación planificado/realizado;
- aviso de caída sostenida de rendimiento;
- volumen por ejercicio/semana, intensidad relativa, distribución, total olímpico y cocientes corporales;
- evolución fechada;
- entrenador contextual.

### Incremento E — Comunidad y privacidad

- filtros;
- likes;
- preguntas y respuestas;
- importación y procedencia;
- perfiles públicos;
- controles granulares;
- datos ficticios de demostración.

### Incremento F — Adherencia e internacionalización

- calendario semanal y mensual;
- planificación, reprogramación y estados por fecha;
- descansos, competiciones y sesiones libres;
- porcentajes, rachas y semanas perfectas;
- notificaciones;
- XP y nivel de cuenta;
- logros;
- rango público;
- español e inglés.

### Incremento G — Calidad y entrega

- consolidación documental;
- pruebas automatizadas;
- evaluación con usuarios;
- accesibilidad y rendimiento;
- memoria y defensa.

## 5. Backlog restante

### Must antes de la entrega académica

- ejecutar la suite pgTAP social con Docker operativo y conservar su salida;
- ampliar E2E a sesiones, rutinas e importación con cuentas aisladas;
- ampliar el lint con auditoría específica de accesibilidad sobre los recorridos completos;
- ejecutar evaluación de accesibilidad;
- realizar y documentar evaluación con usuarios o inspección experta;
- completar matriz de trazabilidad con resultados reales;
- preparar datos y guion de demo.

### Should

- exportación y borrado autoservicio;
- paginación;
- recuperación de contraseña;
- reordenación accesible de ejercicios;
- estados offline acotados.

### Could

- vídeos reales de técnica;
- Storage para avatares;
- notificaciones push;
- proveedor opcional de IA con guardas;
- panel de entrenador.

## 6. Definición de terminado

Una capacidad está terminada cuando:

- cumple requisitos y reglas de negocio;
- contempla carga, vacío, error y éxito;
- funciona en móvil y escritorio;
- aplica RLS y comprobaciones de identidad;
- mantiene traducción de controles funcionales;
- supera tipos y build;
- añade migración si cambia datos;
- actualiza documentos y trazabilidad;
- no depende de un commit creado automáticamente.

## 7. Estrategia de código y entregas

- Una única rama principal integrada.
- La persona responsable del repositorio crea los commits.
- Ningún agente automatizado realiza commits.
- Las migraciones aplicadas son inmutables; los cambios se añaden en una nueva migración.
- El despliegue solo se realiza sobre una versión validada y elegida por el responsable.
- No se incluye `.env.local` ni credenciales en Git.

## 8. Evidencia de trabajo

Por cada hito se recomienda registrar fecha, objetivo, cambios, decisión, prueba, incidencia y siguiente paso. Este registro permite transformar la implementación en metodología y resultados de la memoria.
