# 01. Análisis de referentes

- Fecha de consulta: 2026-09-09
- Alcance: documentación pública de producto; no sustituye una prueba práctica de cada aplicación.
- Objetivo: extraer patrones útiles y delimitar la propuesta de Haltero.

## 1. Método

Se eligieron seis productos que representan posiciones distintas:

- **Hevy:** registro generalista con capa social.
- **Strong:** diario de entrenamiento centrado en la ejecución.
- **StrengthLog:** registro, programas y analítica de fuerza.
- **TrainHeroic:** programación y marketplace orientados a atletas y entrenadores.
- **Weightlifting.ai:** especialización en halterofilia y programación adaptativa.
- **MyStrengthBook:** programación avanzada y relación entrenador-atleta.

Los criterios derivan del flujo de Haltero: preparar una rutina, ejecutar una sesión, consultar progreso y reutilizar contenido. Una celda “no identificado” significa únicamente que la capacidad no se encontró en las fuentes revisadas; no demuestra que el producto carezca de ella.

## 2. Matriz comparativa

| Criterio | Hevy | Strong | StrengthLog | TrainHeroic | Weightlifting.ai | MyStrengthBook |
| --- | --- | --- | --- | --- | --- | --- |
| Registro de series durante la sesión | Explícito | Explícito | Explícito | Explícito | Explícito | Explícito |
| Plantillas, rutinas o programas | Explícito | Plantillas | Explícito | Explícito | Programa propio | Explícito |
| Historial, marcas o gráficos | Explícito | Historial | Explícito | Explícito | Seguimiento | Explícito |
| RPE/RIR o sensación de esfuerzo | RPE | No identificado | RPE/RIR | Readiness | Dificultad/sensación | RPE/RIR |
| Capa social o comunidad | Feed, perfiles y comparación | No identificada | No identificada | Equipos/marketplace | Comunidad de rendimiento | Chat/comunidad para clientes |
| Compartir o adquirir programas | Comparte rutinas/carpetas | Guarda plantillas | Biblioteca propia | Marketplace | Suscripción a programa | Programas de coach |
| Especialización explícita en halterofilia | No identificada | No identificada | Calculadora Sinclair y programas diversos | Fuerza y acondicionamiento general | Sí | Fuerza y powerlifting; bloques configurables |
| Ciclos y preparación de competición | No identificado | No identificado | Programas | Calendario/programas | Ciclos y puesta a punto | Bloques/programas |
| Intento válido/fallido de halterofilia | No identificado | No identificado | No identificado | No identificado | No identificado en fuente pública | No identificado |
| Copia pública con versión y procedencia | No identificada | No identificada | No identificada | No identificada | No identificada | No identificada |
| Orientación dominante | Usuario y comunidad | Usuario individual | Usuario individual | Entrenador/atleta | Programa especializado | Entrenador/cliente |

## 3. Lectura por producto

### Hevy

Su documentación estructura el producto en tres pilares: registro, progreso y social. Expone temporizador, valores previos, RPE, notificación de marcas, feed, perfiles y compartición de rutinas. Es el referente principal para simplicidad y comunidad, pero su catálogo público presenta el entrenamiento de fuerza de forma general.

**Aprendizaje para Haltero:** el registro debe ser el primer plano de la experiencia; compartir solo aporta valor si el contenido se puede reutilizar fácilmente.

### Strong

Permite iniciar una sesión vacía o desde plantilla, reordenar ejercicios, añadir y eliminar series, registrar peso/repeticiones, usar temporizador y consultar historial. Su flujo documentado es lineal y flexible durante la ejecución.

**Aprendizaje para Haltero:** una planificación no debe encerrar al usuario; durante la sesión tiene que poder añadir, omitir o reordenar sin destruir la plantilla.

### StrengthLog

Combina diario, programas, estadísticas, objetivos y marcas por rango de repeticiones. También ofrece RPE/RIR, estimación de 1RM y calculadora de coeficiente Sinclair, un detalle cercano al dominio de halterofilia.

**Aprendizaje para Haltero:** los datos avanzados deben permanecer “debajo” de una interfaz sencilla. Las marcas reales y los cálculos estimados deben distinguirse visualmente.

### TrainHeroic

Está orientado a planes estructurados, calendario, vídeos, herramientas de entrenamiento, progreso y marketplace. Su propuesta une contenido profesional y seguimiento del atleta.

**Aprendizaje para Haltero:** calendario y reutilización son valiosos, pero marketplace, pagos y gestión profesional ampliarían demasiado el MVP.

### Weightlifting.ai

Se presenta específicamente para halterofilia: ciclos de varias semanas, selección de días, seguimiento de dificultad, ajuste de programa y preparación de competición. Su valor principal es recibir programación adaptada, no publicar y versionar rutinas comunitarias.

**Aprendizaje para Haltero:** demuestra que la especialización del dominio es comprensible para el mercado. Haltero no competirá inicialmente en generación o adaptación automática.

### MyStrengthBook

Ofrece programación por porcentajes y RPE/RIR, bloques, notas y cues por ejercicio, marcas, consulta de última/mejor sesión y herramientas para entrenadores. Es una referencia para modelar prescripciones complejas.

**Aprendizaje para Haltero:** mostrar “último” y “mejor” junto al registro puede reducir memoria y navegación. La gestión de clientes queda fuera del MVP.

## 4. Patrones que conviene adoptar

1. Iniciar desde rutina o sesión vacía.
2. Mostrar valores de la última sesión durante el registro.
3. Confirmar una serie con una acción clara y lanzar el descanso opcionalmente.
4. Permitir modificar la sesión activa sin alterar la plantilla.
5. Detectar marcas y separarlas de estimaciones.
6. Organizar programación por semanas, días y bloques ordenados.
7. Mantener el progreso accesible, pero no sobrecargar la pantalla de entrenamiento.

## 5. Oportunidad propuesta

La oportunidad no es construir “Hevy con otro catálogo”. La hipótesis de producto es:

> Una experiencia móvil de registro diseñada para halterofilia, unida a un portal donde las rutinas públicas se puedan filtrar, copiar y adaptar conservando autoría y versión de origen.

Elementos específicos a validar:

- complejos como `arrancada + overhead squat` o `cargada + sentadilla frontal + jerk`;
- intentos válidos, fallidos y omitidos;
- porcentajes ligados a una marca de referencia fechada;
- volumen por familia de movimiento, no solo por grupo muscular;
- total olímpico y relación entre movimientos;
- ciclos, semana de descarga y preparación de toma de marcas;
- granularidad de discos y redondeo de carga;
- rutinas públicas filtrables por nivel, objetivo, días, duración y material.

## 6. Límites estratégicos del MVP

No se copiarán características solo porque existan en otros productos. Quedan fuera:

- feed social, seguidores, comentarios y subida de vídeo;
- marketplace, pagos y administración de clientes;
- programación automática o adaptativa;
- wearables y métricas de salud;
- recomendaciones de recuperación o tratamiento.

La comunidad del MVP gira alrededor del **contenido reutilizable**, no de maximizar interacción social.

## 7. Hipótesis derivadas

| ID | Hipótesis | Evidencia necesaria | Consecuencia si se refuta |
| --- | --- | --- | --- |
| HC-01 | Los complejos necesitan representación propia | ≥ 3 usuarios muestran cómo los anotan | Modelarlos como notas de una prescripción simple |
| HC-02 | Válido/fallido es esencial por intento | Uso frecuente en entrevistas y prueba | Posponerlo o limitarlo a movimientos olímpicos |
| HC-03 | Se buscan rutinas creadas por otras personas | Casos reales de intercambio/reutilización | Reducir portal a biblioteca curada |
| HC-04 | La procedencia influye en la confianza | Usuarios consultan autor/versión antes de copiar | Mantener trazabilidad técnica y simplificar UI |
| HC-05 | “Último” y “mejor” aceleran el registro | Menor tiempo o preferencia en prototipo | Mostrar solo última carga |

## 8. Fuentes

- [Hevy — listado oficial de funciones](https://www.hevyapp.com/features/).
- [Hevy — guía social y de compartición](https://help.hevyapp.com/hc/en-us/articles/35688036014231-Hevy-App-Social-Guide-Connect-Follow-and-Share-Your-Workouts).
- [Strong — ejecución de un entrenamiento](https://help.strongapp.io/article/229-my-first-workout).
- [StrengthLog — producto, programas y estadísticas](https://www.strengthlog.com/).
- [TrainHeroic — aplicación para atletas](https://www.trainheroic.com/athlete/).
- [Weightlifting.ai — funciones para halterofilia](https://www.weightlifting.ai/).
- [MyStrengthBook — actualización de producto Q2 2026](https://mystrengthbook.com/post/q2-2026-product-update).

## 9. Siguiente paso de investigación

Realizar una prueba práctica de Hevy y, al menos, una herramienta especializada usando el mismo guion: crear rutina, registrar una sesión con fallo, consultar marca y localizar contenido reutilizable. Documentar número de acciones, bloqueos y capturas permitidas. Esta fase requiere cuentas de prueba y queda separada del análisis público actual.

