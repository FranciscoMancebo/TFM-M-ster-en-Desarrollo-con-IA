# 01. Requisitos

## 1. Actores y permisos

| Actor | Puede consultar | Puede modificar |
| --- | --- | --- |
| Visitante | Rutinas y perfiles publicados | Nada |
| Usuario autenticado | Contenido público y sus propios datos privados | Su perfil, rutinas, sesiones y publicaciones |
| Autor de rutina | Su publicación y estadísticas agregadas básicas | Publicación y nuevas versiones propias |
| Administrador | Catálogo y contenido denunciado | Catálogo, moderación y estados de contenido |

## 2. Requisitos funcionales del MVP

### Cuenta y perfil

- **RF-001:** el usuario puede registrarse, iniciar y cerrar sesión.
- **RF-002:** el usuario puede definir alias público, nivel, objetivos, días disponibles y equipamiento.
- **RF-003:** el usuario puede mantener privadas sus marcas y sesiones.
- **RF-004:** el usuario puede solicitar exportación y eliminación de sus datos.

### Catálogo y marcas

- **RF-010:** el sistema ofrece un catálogo de movimientos de halterofilia y ejercicios auxiliares.
- **RF-011:** el catálogo distingue movimiento base y variante.
- **RF-012:** el usuario puede registrar una marca con carga, repeticiones, fecha y origen.
- **RF-013:** el sistema detecta una posible nueva marca al finalizar una sesión y pide confirmación.

### Rutinas

- **RF-020:** el usuario puede crear una rutina con nombre, objetivo, nivel, duración y frecuencia.
- **RF-021:** una rutina contiene semanas, días y prescripciones ordenadas.
- **RF-022:** cada prescripción admite series, repeticiones, porcentaje o carga, RPE opcional y descanso.
- **RF-023:** el usuario puede duplicar y editar una rutina sin alterar el original.
- **RF-024:** activar una rutina crea una asignación estable para registrar su ejecución.

### Entrenamientos

- **RF-030:** el usuario puede iniciar la sesión planificada del día.
- **RF-031:** puede registrar carga, repeticiones, RPE, validez del intento y notas.
- **RF-032:** puede añadir, reordenar u omitir ejercicios durante la sesión.
- **RF-033:** puede pausar y reanudar una sesión sin perder datos.
- **RF-034:** al finalizar ve un resumen de volumen, intentos y posibles marcas.

### Comunidad

- **RF-040:** el autor puede publicar o retirar una rutina.
- **RF-041:** un visitante puede buscar y filtrar rutinas por nivel, objetivo, frecuencia y duración.
- **RF-042:** un usuario puede copiar una rutina pública a su biblioteca.
- **RF-043:** la copia conserva identificador y versión de procedencia.
- **RF-044:** las modificaciones posteriores del autor no cambian copias ya creadas.

## 3. Historias de usuario prioritarias

### HU-01 — Registrar una sesión

Como deportista, quiero completar las series desde el móvil para mantener un histórico sin interrumpir el entrenamiento.

**Aceptación:**

- Dada una sesión activa, al confirmar una serie se guarda carga, repeticiones, RPE y validez.
- La siguiente serie reutiliza valores anteriores cuando procede.
- Recargar la página no elimina series ya confirmadas.
- Finalizar muestra un resumen y bloquea modificaciones accidentales; se puede reabrir de forma explícita.

### HU-02 — Copiar una rutina pública

Como deportista, quiero copiar una rutina pública para adaptarla sin modificar la versión del autor.

**Aceptación:**

- La copia pertenece al usuario y comienza como privada.
- Conserva referencia al autor, rutina y versión originales.
- Cambiar la copia no cambia el original y viceversa.

### HU-03 — Crear y activar una rutina

Como deportista, quiero crear una rutina por semanas y días para seguir una planificación clara durante mi ciclo.

**Aceptación:**

- La rutina admite nombre, objetivo, nivel, duración y frecuencia.
- Cada día permite ordenar ejercicios y definir series, repeticiones e intensidad.
- Activarla crea una asignación fechada sin modificar la plantilla.
- Los errores de validación identifican el campo y conservan el resto del borrador.

### HU-04 — Consultar progreso

Como deportista, quiero ver la evolución de mis movimientos principales para valorar el ciclo.

**Aceptación:**

- Puede filtrar por movimiento y periodo.
- El gráfico diferencia marca real de estimaciones, si estas se incorporan.
- Los cálculos se pueden reproducir a partir de las sesiones registradas.

## 4. Requisitos no funcionales

| ID | Área | Requisito medible |
| --- | --- | --- |
| RNF-001 | Usabilidad | Completar una serie requiere como máximo dos acciones tras introducir el valor cambiado. |
| RNF-002 | Responsive | Flujos principales utilizables desde 360 px de ancho y con objetivo táctil suficiente. |
| RNF-003 | Accesibilidad | Objetivo WCAG 2.2 AA; navegación por teclado y etiquetas accesibles en formularios. |
| RNF-004 | Rendimiento | p75 LCP < 2,5 s e INP < 200 ms en páginas principales bajo condiciones de prueba documentadas. |
| RNF-005 | Seguridad | Autorización en servidor/base de datos; ningún usuario accede a filas privadas ajenas. |
| RNF-006 | Privacidad | Minimización, consentimiento explícito para publicar, exportación y borrado. |
| RNF-007 | Disponibilidad | Una interrupción de una función secundaria no bloquea el registro ni la consulta de entrenamientos ya guardados. |
| RNF-008 | Trazabilidad | Cada requisito prioritario se vincula con pruebas y evidencia en la memoria. |
| RNF-009 | Observabilidad | Los errores de aplicación incluyen identificador de correlación sin registrar secretos ni contenido privado innecesario. |
| RNF-010 | Mantenibilidad | Dominio, acceso a datos e interfaz mantienen límites explícitos. |

## 5. Reglas de negocio iniciales

- Una rutina publicada es una versión inmutable; editarla genera borrador o nueva versión.
- Una sesión pertenece a un único usuario y opcionalmente a una asignación de rutina.
- Un intento fallido aporta información de entrenamiento, pero no puede crear una marca personal.
- Una marca derivada automáticamente queda como candidata hasta ser confirmada.
- Los porcentajes se calculan contra una marca de referencia explícita y fechada.
- La carga nunca puede ser negativa; los incrementos deben respetar una granularidad configurable, inicialmente 0,5 kg.
- Un borrador inválido no puede activarse ni publicarse.

## 6. Matriz de trazabilidad mínima

La matriz se completará durante el desarrollo.

| Requisito | Caso de uso | Prueba prevista | Evidencia |
| --- | --- | --- | --- |
| RF-031 | Registrar serie | E2E sesión móvil | Pendiente |
| RF-042–044 | Copiar rutina | Integración de versionado | Pendiente |
| RNF-005 | Aislamiento de datos | Pruebas RLS allow/deny | Pendiente |
| RNF-004 | Rendimiento móvil | Lighthouse + Web Vitals | Pendiente |
