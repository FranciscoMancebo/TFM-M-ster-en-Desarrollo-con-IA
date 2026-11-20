# 01. Requisitos

## 1. Actores y permisos

| Actor | Consulta | Modifica |
| --- | --- | --- |
| Usuario no autenticado | Pantalla de acceso | Registro e inicio de sesión |
| Usuario autenticado | Sus datos y contenido público permitido | Perfil, marcas, rutinas, sesiones, likes y preguntas propias |
| Autor de rutina | Actividad de sus rutinas | Publicación, respuestas y nuevas versiones |
| Propietario de perfil | Vista completa propia | Visibilidad global y permisos por sección |
| Sistema | Reglas, métricas y eventos autorizados | Notificaciones, XP y logros mediante funciones y triggers |

La identidad efectiva procede de `auth.uid()`. Un identificador enviado desde el navegador nunca concede propiedad.

## 2. Requisitos funcionales

### Identidad, configuración y perfil

- **RF-001:** registrarse, iniciar sesión y cerrar sesión.
- **RF-002:** completar una configuración inicial en cinco pasos.
- **RF-003:** registrar días por semana, altura, peso y experiencia.
- **RF-004:** seleccionar uno o varios objetivos entre técnica, fuerza, movilidad y competición.
- **RF-005:** añadir un avatar opcional, validado y comprimido antes de guardarlo en base64.
- **RF-006:** registrar o declarar desconocidas las marcas de sentadilla, arrancada, sentadilla frontal y dos tiempos.
- **RF-007:** calcular el nivel deportivo a partir de experiencia, peso y marcas relativas disponibles.
- **RF-008:** editar posteriormente todos los datos configurables del perfil.
- **RF-009:** seleccionar español o inglés y persistir la preferencia.
- **RF-010:** publicar o privatizar el perfil y controlar por separado datos de entrenamiento, progreso y rutinas.

### Enciclopedia y marcas

- **RF-020:** consultar un catálogo curado de ejercicios.
- **RF-021:** filtrar o buscar por nombre, categoría y enfoque.
- **RF-022:** mostrar explicación, claves, material, unilateralidad y espacio de vídeo.
- **RF-023:** incluir fuerza, movilidad, arrancada, dos tiempos y variantes con pausa, tempo, hang, bloques, potencia, déficit y complejos.
- **RF-024:** registrar una nueva marca desde el gráfico seleccionado, sin repetir el selector de ejercicio.
- **RF-025:** almacenar carga y fecha, y representar la evolución cronológica.
- **RF-026:** usar únicamente la marca compatible para calcular un porcentaje.

### Rutinas

- **RF-030:** crear, editar y eliminar rutinas propias.
- **RF-031:** elegir modo manual o asistente por reglas.
- **RF-032:** definir título, descripción, nivel, enfoque, semanas y visibilidad.
- **RF-033:** configurar entre uno y siete días independientes.
- **RF-034:** añadir ejercicios con series, repeticiones, intensidad, descanso y notas.
- **RF-035:** generar una propuesta según nivel, enfoque, disponibilidad y marcas.
- **RF-036:** dejar una carga en 0 kg y explicar la ausencia cuando no existe una marca necesaria.
- **RF-037:** publicar una versión inmutable o conservarla privada.
- **RF-038:** activar una rutina propia; solo puede existir una asignación activa por usuario.

### Entrenamiento

- **RF-040:** mostrar el día correspondiente de la rutina activa.
- **RF-041:** iniciar o reanudar una sesión.
- **RF-042:** editar carga y repeticiones de cada serie.
- **RF-043:** marcar una serie como completada o fallida.
- **RF-044:** pausar el temporizador sin perder la sesión.
- **RF-045:** confirmar la finalización si quedan series pendientes.
- **RF-046:** guardar duración, volumen, completadas, fallidas y omitidas.
- **RF-047:** consultar el historial de sesiones terminadas.
- **RF-048:** detectar al finalizar una sesión las nuevas mejores marcas en los cuatro movimientos de referencia, guardarlas con origen `workout` y mostrar la mejora en el resumen.
- **RF-049:** planificar en vistas semanal y mensual entrenamientos asociados a días de rutina, descansos, competiciones o sesiones libres; mostrar su estado, permitir reprogramarlos y calcular adherencia semanal/mensual, racha y semanas completas.

### Comunidad y perfiles públicos

- **RF-050:** explorar rutinas públicas.
- **RF-051:** filtrar por nivel del autor y enfoque: movilidad, fuerza, técnica o competición.
- **RF-052:** consultar plan, autor, likes, preguntas y respuestas.
- **RF-053:** dar o retirar like.
- **RF-054:** preguntar al autor; el autor puede responder.
- **RF-055:** importar una rutina como copia propia y activarla.
- **RF-056:** conservar versión y autor de procedencia.
- **RF-057:** mostrar en la biblioteca propia las acciones sociales de la rutina externa importada.
- **RF-058:** abrir el perfil público de un autor.
- **RF-059:** respetar la visibilidad granular del perfil consultado.

### Notificaciones y logros

- **RF-060:** notificar al propietario cuando otro usuario da like a su rutina.
- **RF-061:** notificar cuando recibe una pregunta.
- **RF-062:** mostrar contador de no leídas.
- **RF-063:** marcar una o todas las notificaciones como leídas.
- **RF-064:** otorgar XP idempotente por sesión, marca, publicación e interacción recibida.
- **RF-065:** calcular el nivel de cuenta a partir del XP acumulado.
- **RF-066:** desbloquear logros por umbrales de actividad, volumen acumulado, series completadas, mejoras de marca personal, rachas y semanas completas.
- **RF-067:** mostrar logros desbloqueados, progreso de los pendientes e historial reciente de XP.
- **RF-068:** mostrar nivel, XP y número de logros en perfiles públicos.
- **RF-069:** mostrar una celebración animada y no repetitiva al desbloquear un logro o subir de nivel de cuenta.

### Entrenador contextual

- **RF-070:** responder preguntas predefinidas sobre el entrenamiento del día, cargas, progreso y ejercicios.
- **RF-071:** utilizar perfil, rutina, historial, marcas y enciclopedia como contexto.
- **RF-072:** mantener las respuestas dentro del contexto disponible y declarar sus límites.
- **RF-073:** funcionar sin coste de inferencia ni clave de modelo mediante reglas locales.

### Rendimiento y recuperación

- **RF-074:** detectar 1RM, 2RM, 3RM y 5RM a partir de series satisfactorias al finalizar la sesión.
- **RF-075:** permitir confirmar o descartar cada marca detectada y configurar si la confirmación es necesaria.
- **RF-076:** estimar el 1RM de los récords de repeticiones mediante una fórmula explícita, sin presentarlo como levantamiento real.
- **RF-077:** conservar récords independientes por ejercicio, de modo que una variante no modifique el movimiento principal.
- **RF-078:** registrar RPE opcional entre 1 y 10 en cada serie.
- **RF-079:** registrar dolor, fatiga, sensación general y notas al cerrar una sesión.
- **RF-080:** comparar el volumen planificado con el volumen realizado de las series satisfactorias.
- **RF-081:** avisar cuando el porcentaje de rendimiento desciende durante tres sesiones consecutivas y acumula al menos diez puntos porcentuales de caída.
- **RF-082:** agrupar el volumen satisfactorio por ejercicio y semana natural iniciada en lunes.
- **RF-083:** calcular la intensidad media como porcentaje de la marca compatible vigente en la fecha de cada sesión, ponderado por repeticiones.
- **RF-084:** distribuir las series satisfactorias entre fuerza, técnica y movilidad, incluyendo el trabajo sin carga externa.
- **RF-085:** representar la evolución del total olímpico como suma de la última arrancada y el último dos tiempos disponibles en cada fecha.
- **RF-086:** relacionar las últimas marcas canónicas y el total olímpico con el peso corporal actual.
- **RF-087:** dividir una rutina en semanas persistidas que puedan contener sesiones diferentes.
- **RF-088:** asignar a cada semana una fase de acumulación, intensificación o descarga.
- **RF-089:** generar automáticamente una progresión de puntos porcentuales desde una semana base sin alterar las cargas absolutas.
- **RF-090:** configurar o desactivar la semana de descarga y ajustar su reducción porcentual.
- **RF-091:** mostrar la fase y el ajuste de la semana activa durante la preparación y ejecución del entrenamiento.

### Cuenta, privacidad y escalabilidad

- **RF-092:** solicitar un enlace de recuperación de contraseña sin revelar si el correo está registrado y permitir elegir una contraseña nueva al volver desde Supabase Auth.
- **RF-093:** exportar en JSON los datos propios de perfil, entrenamiento, planificación, marcas, rutinas, calendario, actividad social y gamificación.
- **RF-094:** eliminar definitivamente la cuenta y sus datos relacionados tras confirmar el correo del usuario.
- **RF-095:** paginar en servidor las rutinas de comunidad y aplicar allí los filtros de nivel y enfoque.
- **RF-096:** paginar las notificaciones manteniendo un contador exacto de no leídas.
- **RF-097:** permitir saltar al contenido, recorrer acciones por teclado, distinguir el foco y respetar la preferencia de movimiento reducido.
- **RF-098:** comprobar que los pares de color principales satisfacen WCAG AA para texto normal.
- **RF-099:** dividir en chunks las secciones pesadas y hacer fallar la validación cuando un chunk supere el presupuesto documentado.
- **RF-100:** diferenciar el nivel deportivo, que adapta el entrenamiento, del nivel de cuenta, que desbloquea recompensas sin alterar cargas ni recomendaciones.
- **RF-101:** ofrecer tres espacios multimedia desbloqueados en los niveles de cuenta 3, 6 y 9, limitados a imágenes HTTPS directas o vídeos válidos de YouTube.
- **RF-102:** ofrecer hasta cuatro enlaces sociales desbloqueados en los niveles 2, 4, 6 y 8, validando que la URL HTTPS corresponda con la red declarada.
- **RF-103:** permitir ocultar de forma independiente la galería y los enlaces sociales del perfil público, manteniendo sus datos privados accesibles al propietario y en su exportación.
- **RF-104:** desbloquear al menos un color, icono, título u otro cosmético pequeño en cada nivel de cuenta entre el 2 y el 20.
- **RF-105:** conceder una recompensa visual destacada cada cinco niveles y una insignia de prestigio con celebración exclusiva cada diez niveles.
- **RF-106:** asociar recompensas permanentes a hitos verificables de constancia, volumen, técnica, competición, comunidad y progreso.
- **RF-107:** permitir equipar y retirar de forma independiente color, icono, marco, título, insignia y celebración, validando el desbloqueo en servidor.
- **RF-108:** mostrar en el perfil público solo los cosméticos equipados y conservar la selección en la exportación personal.
- **RF-109:** solicitar el año de nacimiento y la categoría de competición masculina o femenina, explicando que la edad federativa se calcula por año natural.
- **RF-110:** asignar la categoría de peso vigente para cada grupo de edad y calcular el total de referencia como arrancada más dos tiempos.
- **RF-111:** comparar el total con las mínimas nacionales RFEH 2026 derivadas de los puntos élite exigidos para Sub-15, Sub-17, Júnior y Absoluto.
- **RF-112:** mostrar todas las categorías de edad simultáneamente aplicables, su mínima, diferencia y estado de cumplimiento.
- **RF-113:** abrir desde el estado un modal que explique baremos, fuentes y requisitos adicionales, sin presentar la estimación como clasificación oficial.
- **RF-114:** consultar el detalle de una sesión terminada con ejercicios, número de serie, carga y repeticiones planificadas y realizadas, resultado, RPE y sensaciones finales.
- **RF-115:** preparar y ejecutar una sesión libre planificada para hoy seleccionando ejercicios del catálogo, series, repeticiones y carga, vincular su finalización con calendario, historial, estadísticas y detección de marcas, y permitir guardarla después como rutina privada de un día.
- **RF-116:** iniciar automáticamente al completar una serie un temporizador con el descanso de la prescripción o el valor de respaldo del perfil, permitir pausarlo, reanudarlo, reiniciarlo, ampliarlo o descartarlo, restaurarlo al recargar y emitir avisos configurables de sonido y vibración al finalizar.

## 3. Historias prioritarias y aceptación

### HU-01 — Configurar mi punto de partida

Como atleta nuevo, quiero indicar experiencia, disponibilidad y referencias para que el sistema no presuponga mi nivel.

**Aceptación:**

- Las marcas son opcionales y cada una admite «Lo desconozco».
- No se completa la configuración sin días, altura, peso, año de nacimiento, categoría de competición, experiencia y un objetivo.
- El nivel queda guardado y puede recalcularse al cambiar datos.
- Una marca ausente nunca se sustituye por una cifra ficticia.

### HU-02 — Crear una rutina por días

Como atleta, quiero configurar cada día por separado para que la rutina represente mi semana real.

**Aceptación:**

- Cada día tiene nombre y lista propia.
- Añadir o eliminar días no copia automáticamente el contenido de otro.
- No se guarda una rutina con un día vacío.
- Manual y asistido producen el mismo formato editable.

### HU-03 — Reutilizar una rutina pública

Como atleta, quiero añadir y activar una rutina de otra persona manteniendo su procedencia.

**Aceptación:**

- Se crea una copia bajo mi propiedad.
- La copia enlaza la versión y el autor de origen.
- Solo una rutina queda activa.
- Likes y preguntas siguen asociados al original.

### HU-04 — Controlar mi perfil público

Como atleta, quiero decidir qué secciones se muestran para compartir solo lo que considero adecuado.

**Aceptación:**

- Un perfil privado no se expone.
- En uno público, entrenamiento, progreso y rutinas se controlan por separado.
- Las tablas base de perfiles siguen siendo de lectura exclusiva del propietario.
- La vista pública se obtiene mediante una función limitada.

### HU-05 — Recibir actividad y progresar

Como autor, quiero conocer likes y preguntas y ver logros de uso.

**Aceptación:**

- Cada interacción genera como máximo una notificación y un evento de XP.
- El propio usuario no recibe recompensa por interactuar con su contenido.
- Marcar como leído solo afecta a las notificaciones propias.
- Nivel deportivo y nivel de cuenta se presentan como conceptos distintos.

### HU-06 — Interpretar rendimiento y recuperación

Como atleta, quiero registrar esfuerzo y sensaciones junto con mis resultados para distinguir una mejora real de una sesión afectada por fatiga o dolor.

**Aceptación:**

- El RPE es opcional por serie y las sensaciones se solicitan al finalizar.
- La carga planificada permanece disponible aunque la carga realizada cambie.
- Un récord pendiente no altera porcentajes ni nivel hasta ser confirmado.
- Cada variante conserva sus propios 1RM, 2RM, 3RM y 5RM.
- La alerta describe datos observados y no realiza un diagnóstico médico.
- Las estadísticas indican cuándo faltan sesiones, referencias o peso corporal, sin sustituir esos datos por estimaciones.

## 4. Requisitos no funcionales

| ID | Área | Requisito |
| --- | --- | --- |
| RNF-001 | Responsive | Flujos principales utilizables desde 360 px y en escritorio. |
| RNF-002 | Accesibilidad | Objetivo WCAG 2.2 AA, navegación por teclado, foco visible y nombres accesibles. |
| RNF-003 | Rendimiento | p75 LCP < 2,5 s e INP < 200 ms en el entorno de prueba documentado. |
| RNF-004 | Seguridad | RLS activa en tablas privadas; RPC autenticadas y de privilegio mínimo. |
| RNF-005 | Privacidad | Perfil privado por defecto y exposición granular explícita. |
| RNF-006 | Integridad | Claves foráneas, checks, unicidad e idempotencia de eventos. |
| RNF-007 | Mantenibilidad | Tipos, repositorio de datos, reglas de dominio y componentes separados. |
| RNF-008 | Portabilidad | Esquema SQL versionado y frontend desacoplado de una única plataforma de hosting. |
| RNF-009 | Internacionalización | La navegación y los flujos funcionales están disponibles en español e inglés. |
| RNF-010 | Seguridad deportiva | Toda carga sugerida es orientativa, explicable y editable. |
| RNF-011 | Disponibilidad | Un fallo de notificaciones o logros no impide entrenar o consultar datos. |
| RNF-012 | Reproducibilidad | Instalación, migraciones, variables y build están documentados. |

## 5. Reglas de negocio

- Una versión publicada no se modifica en el lugar.
- Una copia es independiente y conserva `source_version_id`.
- Solo existe una asignación activa por usuario.
- El foco se normaliza a `mobility`, `strength`, `technique` o `competition`.
- El nivel deportivo solo puede ser `starter`, `beginner`, `intermediate` o `advanced`.
- La experiencia técnica limita el nivel máximo aunque exista fuerza general.
- Los porcentajes se calculan contra una marca fechada del levantamiento correcto.
- Sin referencia, la carga sugerida es 0 kg y se muestra una advertencia.
- El redondeo asistido utiliza incrementos de 2,5 kg.
- Un intento fallido no aumenta una marca.
- Una serie satisfactoria de 1, 2, 3 o 5 repeticiones puede proponer una marca del ejercicio exacto; variantes y movimiento principal nunca se agregan.
- Solo un 1RM confirmado de los cuatro movimientos canónicos actualiza `lift_records`, el nivel deportivo y los porcentajes de rutina.
- Una marca detectada debe superar el mejor registro confirmado del mismo ejercicio y rango de repeticiones; finalizar de nuevo la sesión no puede duplicarla.
- El 1RM estimado usa Epley (`peso × (1 + repeticiones / 30)`) para 2RM, 3RM y 5RM; el 1RM real no se transforma.
- La alerta de caída requiere tres sesiones consecutivas con volumen planificado y una reducción acumulada mínima de diez puntos; es informativa y no médica.
- La intensidad relativa solo incluye series cargadas con una marca compatible fechada el mismo día o antes; las series sin referencia se muestran como cobertura pendiente.
- La distribución utiliza número de series satisfactorias, no tonelaje, para que la movilidad sin carga externa conserve representación.
- La relación con el peso corporal usa el peso actual del perfil y se presenta como cociente, no como clasificación competitiva.
- XP y logros no modifican el nivel deportivo ni prescriben carga.
- Las recompensas usan claves únicas para evitar duplicados.
- El avatar base64 debe proceder de una imagen válida, comprimida y limitada en tamaño.
- Las rutas sociales no permiten like propio ni pregunta propia al autor.

## 6. Datos pendientes de evaluación

La implementación satisface el contrato funcional descrito, pero los umbrales de usabilidad, accesibilidad y rendimiento deben demostrarse con el protocolo de [evaluación](04-plan-de-evaluacion.md). No se presentan como resultados hasta ejecutar y registrar las pruebas.
