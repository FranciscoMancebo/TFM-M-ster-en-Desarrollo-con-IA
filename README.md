# Haltero — TFM de Desarrollo con IA

Haltero es el nombre provisional de una aplicación web móvil-first para registrar entrenamientos de halterofilia, seguir marcas personales, diseñar ciclos y descubrir rutinas compartidas por la comunidad.

Este repositorio comienza por la documentación. El desarrollo no debe iniciarse hasta validar el alcance del MVP y cerrar las decisiones abiertas de la fase 0.

## Estado

**Fase actual:** ideación y definición del producto.

## Mapa de documentación

| Documento | Pregunta que responde |
| --- | --- |
| [Visión y alcance](docs/00-vision-y-alcance.md) | ¿Qué problema resuelve, para quién y qué entra en el MVP? |
| [Requisitos](docs/01-requisitos.md) | ¿Qué debe hacer el sistema y cómo se acepta? |
| [Arquitectura y tecnologías](docs/02-arquitectura-y-tecnologias.md) | ¿Con qué se construye y por qué? |
| [Modelo de dominio y datos](docs/03-modelo-de-dominio.md) | ¿Qué entidades existen y cómo se relacionan? |
| [Plan de evaluación](docs/04-plan-de-evaluacion.md) | ¿Cómo se demuestra que el producto funciona y resulta usable? |
| [Plan de desarrollo](docs/05-plan-de-desarrollo.md) | ¿En qué orden se construye y qué entrega cada fase? |
| [Guion de la memoria](docs/06-guion-de-la-memoria.md) | ¿Cómo se transforma el trabajo en el documento académico? |
| [Registro de riesgos](docs/07-riesgos.md) | ¿Qué puede fallar y cómo se mitiga? |
| [Investigación inicial](docs/research/README.md) | ¿Qué referentes se han revisado y cómo se validarán las hipótesis? |
| [Diseño de experiencia](docs/ux/README.md) | ¿Cómo se recorre el producto y qué debe mostrar cada pantalla? |
| [Decisiones de arquitectura](docs/adr/README.md) | ¿Qué decisiones importantes se han tomado y con qué alternativas? |

## Propuesta resumida

- **Usuario principal:** deportista aficionado o intermedio que entrena halterofilia sin una herramienta específica.
- **Flujo principal:** elegir o crear rutina → ejecutar sesión → registrar intentos → consultar progreso → adaptar el siguiente bloque.
- **Diferenciación:** terminología y métricas propias de halterofilia, registro rápido durante la sesión y ciclos versionados que se pueden copiar sin perder autoría.
- **MVP:** autenticación, catálogo de ejercicios, editor de rutinas, registro de sesiones, marcas, progreso, portal público y clonación de rutinas.
- **Fuera del MVP:** análisis técnico de vídeo, mensajería, pagos, wearables y funciones clínicas.

## Convenciones iniciales

- Idioma de producto inicial: español.
- Unidades internas: kilogramos; conversión de presentación pospuesta.
- Moneda, pagos y marketplace: fuera de alcance.
- La aplicación registra y organiza entrenamiento; no ofrece diagnóstico ni sustituye la valoración de un entrenador o profesional sanitario.
- Cada decisión relevante se registra como ADR antes o junto a su implementación.

## Próximo hito

Validar la fase 0 con entre 3 y 5 usuarios potenciales y, si es posible, un entrenador. Después se puede iniciar el esqueleto técnico y construir el primer recorrido vertical: iniciar sesión, crear una rutina mínima, registrar una sesión y visualizarla en el historial.
