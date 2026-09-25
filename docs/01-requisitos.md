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
- **RF-066:** desbloquear logros por umbrales de actividad, volumen acumulado, series completadas y mejoras de marca personal.
- **RF-067:** mostrar logros desbloqueados, progreso de los pendientes e historial reciente de XP.
- **RF-068:** mostrar nivel, XP y número de logros en perfiles públicos.
- **RF-069:** mostrar una celebración animada y no repetitiva al desbloquear un logro o subir de nivel de cuenta.

### Entrenador contextual

- **RF-070:** responder preguntas predefinidas sobre el entrenamiento del día, cargas, progreso y ejercicios.
- **RF-071:** utilizar perfil, rutina, historial, marcas y enciclopedia como contexto.
- **RF-072:** mantener las respuestas dentro del contexto disponible y declarar sus límites.
- **RF-073:** funcionar sin coste de inferencia ni clave de modelo mediante reglas locales.

## 3. Historias prioritarias y aceptación

### HU-01 — Configurar mi punto de partida

Como atleta nuevo, quiero indicar experiencia, disponibilidad y referencias para que el sistema no presuponga mi nivel.

**Aceptación:**

- Las marcas son opcionales y cada una admite «Lo desconozco».
- No se completa la configuración sin días, altura, peso, experiencia y un objetivo.
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
- XP y logros no modifican el nivel deportivo ni prescriben carga.
- Las recompensas usan claves únicas para evitar duplicados.
- El avatar base64 debe proceder de una imagen válida, comprimida y limitada en tamaño.
- Las rutas sociales no permiten like propio ni pregunta propia al autor.

## 6. Datos pendientes de evaluación

La implementación satisface el contrato funcional descrito, pero los umbrales de usabilidad, accesibilidad y rendimiento deben demostrarse con el protocolo de [evaluación](04-plan-de-evaluacion.md). No se presentan como resultados hasta ejecutar y registrar las pruebas.
