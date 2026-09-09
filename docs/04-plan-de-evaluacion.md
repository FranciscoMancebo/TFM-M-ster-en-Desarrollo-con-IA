# 04. Plan de evaluación

## 1. Objetivo

La evaluación debe demostrar si Haltero permite planificar y registrar entrenamientos de halterofilia con menos fricción, mantiene la privacidad de los datos y conserva correctamente la procedencia de las rutinas compartidas.

## 2. Preguntas y métricas

| Pregunta | Métrica principal | Evidencia |
| --- | --- | --- |
| ¿Se registra una sesión con fluidez desde móvil? | Tiempo, errores y número de acciones por serie | Prueba moderada con tareas |
| ¿Se entiende el progreso mostrado? | Respuestas correctas a preguntas sobre gráficos | Test de comprensión |
| ¿Se distingue una copia de su original? | Identificación de autor, versión y estado | Prueba de portal y copia |
| ¿Los datos privados permanecen aislados? | Pruebas allow/deny superadas | Suite RLS y pruebas de integración |
| ¿La aplicación resulta usable? | SUS o UMUX-Lite + observaciones | Cuestionario posterior |

## 3. Evaluación con usuarios

### Muestra inicial

Entre 5 y 8 participantes para evaluación formativa, procurando incluir niveles y métodos de registro distintos. Si es posible, añadir una revisión separada con un entrenador.

La muestra no permite generalizar al conjunto de deportistas; sirve para encontrar problemas y obtener evidencia inicial.

### Tareas

1. Crear un perfil y registrar marcas de referencia.
2. Crear una rutina de dos semanas con dos días por semana.
3. Iniciar una sesión, completar series, registrar un fallo y finalizar.
4. Interpretar la evolución de un movimiento.
5. Encontrar una rutina pública, identificar su autor y copiarla.
6. Modificar la copia y comprobar que se mantiene privada e independiente.

### Datos recogidos

- finalización de tarea;
- tiempo por tarea;
- errores, retrocesos y solicitudes de ayuda;
- número de acciones para registrar una serie;
- comentarios mediante pensamiento en voz alta;
- puntuación de usabilidad;
- entrevista breve sobre utilidad y confianza.

No se usarán marcas o datos de salud reales si no son necesarios. Se facilitarán datos ficticios y se solicitará consentimiento informado.

## 4. Evaluación técnica

### Funcional

- Pruebas unitarias para reglas de carga, volumen, marcas y versionado.
- Pruebas de integración para casos de uso y persistencia.
- Pruebas E2E para sesión, publicación y copia.

### Seguridad y privacidad

- Una política de prueba positiva y negativa por operación protegida.
- Intentos de acceso cruzado entre dos usuarios de prueba.
- Verificación de que una rutina privada no aparece en rutas ni búsquedas públicas.
- Exportación y borrado con comprobación de datos relacionados.

### Accesibilidad y rendimiento

- Navegación por teclado y lector de pantalla en flujos críticos.
- Auditoría automática complementada con revisión manual.
- Core Web Vitals en páginas representativas y condiciones documentadas.
- Comprobación desde 360 px y escritorio, sin depender solo de emulación.

## 5. Umbrales iniciales

| Indicador | Umbral |
| --- | --- |
| Finalización del flujo principal | ≥ 80 % sin ayuda crítica |
| Registro de una serie ya configurada | Máximo 2 acciones tras cambiar el dato necesario |
| Comprensión de autoría/procedencia | ≥ 80 % de respuestas correctas |
| Pruebas de aislamiento | 100 % superadas |
| Errores críticos abiertos | 0 antes de la entrega |
| Accesibilidad | Sin incidencias A/AA críticas en flujos principales |
| p75 LCP / INP | < 2,5 s / < 200 ms en el entorno documentado |

Los umbrales se revisarán después del prototipo, antes de observar resultados, y cualquier cambio quedará justificado.

## 6. Análisis

- Resumir métricas cuantitativas con mediana y rango cuando la muestra sea pequeña.
- Clasificar incidencias por severidad, frecuencia y flujo.
- Separar observación, interpretación y decisión de diseño.
- Relacionar cada hallazgo con requisito y cambio realizado o trabajo futuro.
- Informar también resultados negativos y participantes excluidos.

## 7. Amenazas a la validez

- Muestra pequeña y de conveniencia.
- Participantes con distinto conocimiento técnico/deportivo.
- Efecto aprendizaje al repetir tareas.
- Datos ficticios menos significativos que una sesión real.
- Condiciones de laboratorio distintas a un gimnasio.

Mitigaciones: criterios de inclusión explícitos, mismo guion, orden de tareas estable o contrabalanceado cuando proceda, registro de incidencias y una prueba contextual breve si es viable y segura.

