# 05. Plan de desarrollo

## 1. Método de trabajo

Se propone un desarrollo iterativo con:

- **descubrimiento ligero:** entrevistas, mapa de flujo y prototipo;
- **entregas verticales:** cada iteración cruza interfaz, dominio, datos y pruebas;
- **trazabilidad:** requisitos → tarea → commit/PR → prueba → evidencia;
- **ADR:** toda decisión de alto impacto se registra;
- **diario de TFM:** decisiones, incidencias, resultados y tiempo invertido cada semana.

No se desarrollarán todas las tablas antes de probar el flujo principal.

## 2. Fases y entregables

### Fase 0 — Descubrimiento y definición (1–2 semanas)

**Trabajo:**

- revisar 3–5 herramientas competidoras con una matriz común;
- entrevistar 3–5 deportistas y, si es posible, un entrenador;
- validar vocabulario, flujo de sesión y datos mínimos;
- priorizar con MoSCoW;
- dibujar prototipo de baja fidelidad;
- cerrar alcance, métricas y riesgos.

**Salida:** documentos 00–07 revisados, guion de entrevista, matriz competitiva y backlog priorizado.

**Puerta:** se puede describir el MVP en una frase y sus criterios de éxito son medibles.

### Fase 1 — Base técnica y recorrido vertical (1 semana)

**Trabajo:**

- crear proyecto, CI y entornos;
- configurar autenticación y primer esquema con migraciones;
- aplicar RLS y sus primeras pruebas;
- construir el flujo mínimo: rutina simple → sesión → serie → historial.

**Salida:** aplicación desplegada en entorno de desarrollo y ADR actualizados.

**Puerta:** un usuario no puede leer datos privados de otro y el recorrido persiste tras recargar.

### Fase 2 — Dominio de rutinas y entrenamiento (2–3 semanas)

**Trabajo:**

- catálogo específico;
- editor por semanas/días;
- ejecución móvil, pausa y reanudación;
- resumen y detección de marcas;
- pruebas unitarias, integración y E2E críticas.

**Salida:** núcleo funcional utilizable.

**Puerta:** un usuario completa el flujo principal con datos realistas.

### Fase 3 — Comunidad y versionado (1–2 semanas)

**Trabajo:**

- publicación explícita;
- exploración y filtros;
- detalle público y autoría;
- copia con procedencia e inmutabilidad.

**Salida:** portal público y pruebas de privacidad/versionado.

**Puerta:** una copia nunca cambia al editar o retirar el original.

### Fase 4 — Progreso y consolidación del producto (1–2 semanas)

**Trabajo:**

- gráficos de evolución y filtros;
- cálculo reproducible de volumen y marcas;
- estados vacíos, errores y recuperación;
- accesibilidad y responsive de todos los flujos principales;
- exportación y borrado de datos.

**Salida:** MVP completo listo para evaluación.

**Puerta:** cada requisito Must tiene una prueba o evidencia vinculada.

### Fase 5 — Evaluación y calidad (1–2 semanas)

**Trabajo:**

- ejecutar evaluación técnica y revisión experta;
- pruebas con usuarios del flujo principal;
- accesibilidad, rendimiento y seguridad;
- corregir defectos críticos y registrar los restantes.

**Salida:** resultados, tablas, evidencias y limitaciones.

**Puerta:** criterios de éxito evaluados con protocolo reproducible.

### Fase 6 — Memoria y defensa (1–2 semanas)

**Trabajo:**

- consolidar memoria, diagramas y anexos;
- crear demostración estable y datos ficticios;
- preparar diapositivas, guion y plan ante fallos de red;
- ensayo cronometrado y revisión final.

**Salida:** memoria, repositorio etiquetado, demo y defensa.

## 3. Backlog priorizado

### Must

- Autenticación y aislamiento de datos.
- Perfil y marcas de referencia.
- Catálogo, creación de rutina y registro de sesión.
- Histórico y progreso básico.
- Publicar, descubrir y copiar rutinas.
- Gráficos de progreso y cálculos reproducibles.
- Pruebas de flujo, RLS y versionado.
- Despliegue y documentación reproducible.

### Should

- PWA instalable y soporte offline acotado.
- Favoritos y valoración simple de rutinas.
- Plantillas del sistema.
- Importación/exportación en un formato documentado.

### Could

- Comentarios moderados.
- Panel de entrenador de un solo atleta.
- Calendario de adherencia y recordatorios configurables.

### Won't, en este TFM

- Inteligencia artificial interna, análisis de vídeo, wearables, pagos, chat y apps nativas.

## 4. Definición de terminado

Una historia está terminada cuando:

- cumple criterios de aceptación;
- incluye estados de carga, vacío, error y éxito relevantes;
- aplica autorización y validación en servidor;
- tiene pruebas proporcionales al riesgo;
- funciona en móvil y teclado cuando procede;
- no introduce errores de lint, tipos o build;
- actualiza documentación/ADR si cambia una decisión;
- deja evidencia vinculable desde la memoria.

## 5. Estrategia de ramas y entregas

- Rama principal siempre desplegable.
- Ramas cortas por capacidad o historia.
- Commits pequeños con intención clara.
- Pull request o revisión equivalente con requisito, capturas/evidencia y pruebas.
- Etiquetas de versión al cerrar cada fase importante.

## 6. Diario de trabajo recomendado

Por cada sesión de trabajo registrar:

| Campo | Contenido |
| --- | --- |
| Fecha y duración | Tiempo real dedicado |
| Objetivo | Resultado que se buscaba |
| Trabajo realizado | Cambios y pruebas |
| Decisiones | Enlace a ADR o justificación breve |
| Evidencia | Commit, resultado, captura o métrica |
| Incidencias | Problema, diagnóstico y resolución |
| Siguiente paso | Acción concreta |

Esto convierte el proceso en material utilizable para metodología, planificación y conclusiones.
