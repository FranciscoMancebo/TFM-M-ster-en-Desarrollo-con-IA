# 06. Guion de la memoria

La estructura debe adaptarse a la plantilla académica, pero mantiene una narrativa de producto coherente desde el problema inicial hasta la evaluación.

## 1. Resumen / Abstract

- problema de fragmentación y falta de especialización;
- propuesta Haltero;
- método iterativo;
- arquitectura React/Supabase;
- alcance del MVP;
- evaluación realizada y resultado principal;
- palabras clave en español e inglés.

## 2. Introducción

- contexto de la halterofilia;
- registro y planificación digital;
- motivación;
- objetivo general y específicos;
- preguntas de investigación;
- alcance y limitaciones.

## 3. Estado del arte

- aplicaciones generalistas de fuerza;
- herramientas específicas de halterofilia;
- programación por porcentajes y experiencia;
- comunidades deportivas;
- gamificación y adherencia;
- privacidad de datos personales/deportivos;
- asistentes deterministas frente a modelos generativos.

## 4. Análisis del problema

- personas;
- recorrido actual;
- fricciones;
- hipótesis;
- matriz de referentes;
- resultados de entrevistas, si se ejecutan;
- criterios de priorización.

## 5. Requisitos

- actores y permisos;
- requisitos funcionales por capacidad;
- no funcionales;
- historias y aceptación;
- reglas de negocio;
- matriz de trazabilidad.

## 6. Diseño de la solución

### Arquitectura

- contexto;
- frontend modular;
- Supabase Auth/PostgreSQL/RLS;
- RPC y triggers;
- GPT Sites;
- portabilidad.

### Dominio

- perfil y dos tipos de nivel;
- marcas;
- ejercicios;
- rutinas versionadas;
- sesiones;
- comunidad;
- notificaciones y gamificación.

### Experiencia

- configuración guiada;
- creación manual/asistida;
- sesión activa;
- progreso;
- enciclopedia;
- comunidad y perfiles;
- campana y consola de logros;
- español e inglés.

### Seguridad

- autorización por fila;
- perfil público como proyección;
- publicación explícita;
- idempotencia de recompensas;
- límites del asistente.

## 7. Implementación

Presentar recorridos verticales, no un listado de archivos:

1. alta y aprovisionamiento;
2. nivel y cargas sin datos inventados;
3. rutinas por días;
4. importación y procedencia;
5. privacidad de perfiles;
6. notificaciones y XP;
7. entrenador contextual.

Usar fragmentos mínimos, diagramas y referencias al repositorio.

## 8. Pruebas y evaluación

- estrategia y entorno;
- tipos y build;
- pruebas de dominio;
- RLS;
- tareas de usuario;
- accesibilidad;
- rendimiento;
- resultados reales;
- incidencias y correcciones.

No convertir objetivos en resultados. Las pruebas no ejecutadas deben constar como pendientes.

## 9. Resultados y discusión

Responder cada pregunta de investigación:

- fricción del registro;
- comprensión del nivel;
- confianza en recomendaciones;
- utilidad de procedencia y perfiles;
- efecto percibido de notificaciones/logros.

Separar datos, interpretación y limitaciones.

## 10. Conclusiones

- contribución técnica;
- contribución de producto;
- aprendizaje;
- límites;
- evolución priorizada por evidencia.

## 11. Anexos

- requisitos completos;
- migraciones;
- políticas y pruebas RLS;
- guiones;
- consentimientos;
- matriz de trazabilidad;
- manual de operación;
- resultados automatizados;
- capturas con datos ficticios;
- ADR.

## Evidencias a capturar

- versión exacta evaluada;
- esquema y migraciones aplicadas;
- build final;
- pruebas allow/deny;
- casos de carga con y sin referencia;
- perfil privado frente a público;
- importación con procedencia;
- notificaciones y XP idempotente;
- interacción móvil;
- mediciones de rendimiento.
