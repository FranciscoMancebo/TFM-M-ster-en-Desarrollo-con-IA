# 04. Plan de evaluación

## 1. Objetivo

Evaluar si Haltero permite configurar, planificar, ejecutar y analizar entrenamiento de halterofilia con una experiencia comprensible, protege la información privada y mantiene correctamente las relaciones sociales y de procedencia.

La evaluación separa tres planos:

- corrección técnica;
- usabilidad y comprensión;
- utilidad percibida y confianza.

## 2. Preguntas y métricas

| Pregunta | Métrica | Evidencia |
| --- | --- | --- |
| ¿Se completa la configuración sin ayuda? | Finalización, tiempo y errores | Prueba moderada |
| ¿Se entiende el nivel deportivo? | Explicación correcta de los factores | Preguntas posteriores |
| ¿Se evita asumir una carga sin marca? | Resultado esperado de 0 kg y mensaje | Caso automatizado + tarea |
| ¿Se configura cada día de forma independiente? | Rutina resultante y errores | Tarea de edición |
| ¿Se registra una sesión con fluidez? | Tiempo y acciones por serie | Observación móvil |
| ¿Se interpreta la progresión? | Respuestas correctas sobre el gráfico | Test de comprensión |
| ¿Se distingue original de copia? | Identificación de autor y procedencia | Tarea comunitaria |
| ¿Se entiende la privacidad granular? | Configuración y predicción de visibilidad | Tarea con dos cuentas |
| ¿Notificaciones y logros son comprensibles? | Detección, lectura y descripción | Tarea social |
| ¿Los datos permanecen aislados? | Pruebas allow/deny | pgTAP e integración |

## 3. Muestra

Entre 5 y 8 deportistas adultos con niveles distintos. Se intentará incluir al menos:

- dos personas con menos de seis meses de experiencia;
- dos personas con más de seis meses;
- una persona que programe o asesore a otras.

La muestra es formativa y no permite generalizar a toda la población.

## 4. Escenarios de prueba

### T1 — Alta y configuración

Crear una cuenta, elegir tres días, introducir altura y peso, declarar experiencia y objetivos, registrar solo sentadilla y sentadilla frontal y dejar desconocidos arrancada y dos tiempos.

**Éxito:** el usuario termina, entiende que las marcas son opcionales y no aparece una carga ficticia para movimientos sin referencia.

### T2 — Rutina asistida por días

Generar una rutina de tres días con enfoque técnico, revisar la explicación de cargas y cambiar únicamente el segundo día.

**Éxito:** los días conservan contenidos diferentes y el usuario identifica qué datos originaron la propuesta.

### T3 — Entrenamiento

Activar la rutina, iniciar la sesión, completar una serie, fallar otra, pausar, reanudar y finalizar con una serie pendiente.

**Éxito:** el estado persiste, el resumen coincide con los datos introducidos y una serie completada que supera el máximo histórico muestra y guarda la nueva marca. Un fallo o una variante no la modifica.

### T4 — Progreso

Seleccionar arrancada, añadir una marca con fecha y explicar la tendencia.

**Éxito:** el formulario no pide volver a elegir ejercicio y el punto aparece en el gráfico correcto.

### T5 — Comunidad

Filtrar una rutina por nivel y enfoque, abrir el perfil del autor, dar like, preguntar, importar y activar.

**Éxito:** la copia aparece en Mis rutinas, conserva autor, y las acciones sociales continúan asociadas al original.

### T6 — Privacidad

Publicar el perfil, permitir rutinas pero ocultar datos y progreso. Consultarlo desde otra cuenta.

**Éxito:** solo se muestran las secciones autorizadas.

### T7 — Notificaciones y logros

Desde una segunda cuenta, dar like y formular una pregunta. Volver a la cuenta autora, abrir la campana, marcar como leído y consultar XP/logros.

**Éxito:** existen dos notificaciones, el contador disminuye, la XP no se duplica al recargar y cada nuevo logro o subida de nivel produce una sola celebración animada.

### T8 — Idioma

Cambiar a inglés, recorrer Perfil, Rutinas y Logros y volver a iniciar sesión.

**Éxito:** la preferencia persiste y los controles funcionales aparecen en inglés.

### T9 — Calendario y adherencia

Asignar tres días distintos de la rutina a la semana actual, añadir un descanso y una competición, reprogramar una sesión y completar desde el calendario el entrenamiento de hoy.

**Éxito:** las vistas semanal y mensual coinciden, se conservan fecha de origen y estados, la sesión completada actualiza el calendario y los porcentajes, la racha y los logros se recalculan sin duplicados.

## 5. Evaluación técnica

### Compilación y tipos

- `npx tsc --noEmit`.
- build de producción mediante el script de Sites.
- revisión de advertencias de tamaño de bundle.

### Dominio

Casos unitarios automatizados:

- nivel con y sin marcas;
- limitación por experiencia;
- referencia compatible por ejercicio;
- ausencia de marca;
- redondeo a 2,5 kg;
- selección de variantes de iniciación;
- límite de uno a siete días.
- detección atómica de marcas desde sesiones, exclusión de fallos y variantes e idempotencia al finalizar.
- límites semanales/mensuales, desplazamiento de periodos y rejilla mensual estable de 42 días.

La suite se encuentra en `web/tests/unit` y se ejecuta con `npm.cmd run test`. Incluye la detección no repetitiva de logros y subidas de nivel. Quedan como ampliación la función de volumen y la fórmula de nivel de cuenta.

La prueba pgTAP `0003_workout_personal_bests.test.sql` cubre la detección de marcas en base de datos, el mejor intento de la sesión, la autorización y la repetición segura de la finalización. `0004_training_calendar_adherence.test.sql` cubre RLS del calendario, tipos de día, enlace con sesiones, finalización automática, adherencia, racha y reprogramación.

### Navegador

La suite `web/tests/e2e` comprueba que la pantalla de acceso se representa correctamente y que se puede alternar entre inicio de sesión y creación de cuenta en Chromium. Se ejecuta con `npm.cmd run test:e2e` y no crea usuarios ni modifica datos remotos.

### Datos y seguridad

- RLS positiva y negativa con dos usuarios.
- Perfil base ilegible para terceros.
- Proyección pública según permisos.
- Una sola asignación activa.
- Publicación inmutable.
- Like único y sin auto-like.
- Pregunta y respuesta con roles correctos.
- Notificaciones solo del destinatario.
- XP idempotente.
- RPC inaccesibles para `anon`.

Las pruebas pgTAP residen en `supabase/tests`: `0001` cubre el aislamiento del núcleo de rutinas y sesiones, `0002` cubre privacidad social, likes, preguntas, notificaciones y gamificación, `0003` cubre marcas desde entrenamientos y `0004` calendario/adherencia. Todas usan transacciones con `ROLLBACK`.

### Accesibilidad

- recorrido completo con teclado;
- nombres accesibles de iconos y botones;
- foco visible en diálogos, popovers y formularios;
- contraste y significado no dependiente del color;
- zoom de texto al 200 %;
- anchos de 360, 768 y 1440 px.

### Rendimiento

Medir en el despliegue final:

- LCP, INP y CLS;
- peso del JavaScript inicial;
- tiempo de carga de comunidad, enciclopedia y logros;
- impacto del sondeo de notificaciones cada 45 segundos.

## 6. Umbrales

| Indicador | Objetivo |
| --- | --- |
| Finalización del recorrido principal | ≥ 80 % sin ayuda crítica |
| Configuración inicial | ≥ 80 % sin volver atrás por etiqueta ambigua |
| Registro de una serie ya configurada | Máximo dos acciones tras cambiar el valor |
| Comprensión de carga sin referencia | 100 % identifica que debe elegir una carga técnica |
| Procedencia original/copia | ≥ 80 % de respuestas correctas |
| Privacidad granular | 100 % de tareas sin exposición |
| Aislamiento RLS | 100 % de pruebas |
| Errores críticos | 0 antes de entrega |
| WCAG | Sin incidencias A/AA críticas en flujos |
| p75 LCP / INP | < 2,5 s / < 200 ms en entorno documentado |

## 7. Registro de resultados

Cada ejecución debe conservar:

- versión o commit probado;
- fecha, entorno y dispositivo;
- datos ficticios utilizados;
- resultado por tarea;
- incidencias con severidad;
- captura o salida automatizada cuando sea apropiado;
- decisión tomada.

Los resultados no ejecutados deben figurar como «pendientes», no como superados.

## 8. Amenazas a la validez

- muestra pequeña y de conveniencia;
- familiaridad desigual con la terminología;
- datos ficticios menos significativos;
- conectividad distinta a un gimnasio;
- efecto aprendizaje en tareas relacionadas;
- sesgo del desarrollador como moderador.

Mitigaciones: guion estable, criterios de inclusión, datos comparables, separación entre observación e interpretación y revisión externa cuando sea posible.

