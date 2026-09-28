# Haltero — plataforma web de entrenamiento de halterofilia

Haltero es una aplicación web móvil-first para planificar y ejecutar entrenamientos de halterofilia, registrar marcas, visualizar el progreso y compartir rutinas con una comunidad. El producto adapta la experiencia inicial, el nivel deportivo, los ejercicios y las cargas orientativas a los datos del atleta, sin sustituir el criterio de un entrenador.

Este repositorio contiene la aplicación, las migraciones de Supabase y la documentación del TFM.

## Estado del proyecto

**Fase actual:** MVP funcional desplegado y en consolidación técnica/documental.

Capacidades disponibles:

- registro, inicio y cierre de sesión con Supabase Auth;
- configuración inicial guiada de disponibilidad, medidas, experiencia, objetivos, avatar y marcas;
- detección automática de nuevas marcas personales desde series completadas en los movimientos de referencia;
- cálculo de cuatro niveles deportivos: iniciación, principiante, intermedio y avanzado;
- rutinas privadas o públicas, editables, eliminables y organizadas en días independientes;
- creación manual o asistida mediante reglas por nivel, objetivo y marcas disponibles;
- activación de rutinas propias e importación/activación de rutinas públicas con procedencia;
- registro de sesiones, series completadas o fallidas, pausa, reanudación y resumen;
- calendario semanal y mensual para planificar, reprogramar y clasificar entrenamientos, descansos, competiciones y sesiones libres;
- adherencia semanal y mensual, racha de entrenamientos, días completados y semanas perfectas;
- historial y gráficos fechados para sentadilla, arrancada, sentadilla frontal y dos tiempos;
- enciclopedia de fuerza, movilidad, arrancada y dos tiempos con variantes y hueco para vídeo;
- comunidad con filtros, likes, preguntas al autor y perfiles públicos configurables;
- notificaciones por likes y preguntas;
- experiencia, niveles de cuenta, logros desbloqueables y celebraciones animadas;
- entrenador conversacional gratuito basado en reglas y en el contexto almacenado;
- interfaz bilingüe en español e inglés.

## Estructura

```text
docs/                 visión, requisitos, arquitectura, UX, evaluación y ADR
supabase/migrations/  esquema remoto, funciones, políticas RLS y datos de demostración
supabase/tests/       pruebas de seguridad por fila
web/                  aplicación React/Next.js compatible con GPT Sites
visualizations/       artefactos visuales auxiliares
iniciar-web.cmd       lanzador local para Windows
```

## Puesta en marcha

### Requisitos

- Node.js 22.13 o superior.
- Un proyecto remoto de Supabase.
- URL pública y clave publicable de Supabase.

### Aplicación web

Desde PowerShell, situado en la raíz del repositorio:

```powershell
cd .\web
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Configurar en `web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

También se puede iniciar con doble clic en `iniciar-web.cmd`.

### Base de datos remota

Desde la raíz del repositorio:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref TU_PROJECT_REF
npx.cmd supabase db push
```

Las migraciones de `supabase/migrations` son la fuente de verdad. El flujo actual utiliza exclusivamente Supabase Cloud; la pila local queda como alternativa futura de desarrollo.

## Validación

Desde `web/`:

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run test:e2e
npm.cmd run check
```

`test` ejecuta las pruebas unitarias de dominio; `test:e2e` abre Chromium mediante Playwright; y `check` agrupa tipos, lint, unitarias y build de producción. La primera ejecución E2E necesita instalar el navegador con `npx.cmd playwright install chromium`.

Las pruebas transaccionales de seguridad y comportamiento de Supabase están en `supabase/tests/`. Con Docker Desktop activo y el proyecto enlazado se ejecutan desde `web/` con:

```powershell
npm.cmd run test:db
```

El workflow `.github/workflows/quality.yml` reproduce automáticamente tipos, unitarias, build y E2E en cada cambio de `main` y en cada pull request.

La seguridad de datos se apoya en Row Level Security y en funciones RPC con comprobación de `auth.uid()`. Nunca debe utilizarse una clave de servicio en el navegador.

## Documentación

| Documento | Contenido |
| --- | --- |
| [Visión y alcance](docs/00-vision-y-alcance.md) | Problema, usuarios, propuesta, alcance y principios. |
| [Requisitos](docs/01-requisitos.md) | Requisitos funcionales, no funcionales y reglas de negocio. |
| [Arquitectura](docs/02-arquitectura-y-tecnologias.md) | Componentes, stack, seguridad y despliegue. |
| [Modelo de dominio](docs/03-modelo-de-dominio.md) | Entidades, relaciones, privacidad y gamificación. |
| [Plan de evaluación](docs/04-plan-de-evaluacion.md) | Protocolo funcional, técnico y con usuarios. |
| [Plan de desarrollo](docs/05-plan-de-desarrollo.md) | Fases, entregables y estado. |
| [Guion de la memoria](docs/06-guion-de-la-memoria.md) | Estructura propuesta para el TFM. |
| [Riesgos](docs/07-riesgos.md) | Registro de riesgos y mitigaciones. |
| [Guía técnica y operativa](docs/08-guia-tecnica-y-operacion.md) | Entornos, configuración, datos y despliegue. |
| [Matriz de trazabilidad](docs/09-matriz-de-trazabilidad.md) | Relación entre requisitos, código, datos y validación. |

## Límites

Haltero no diagnostica lesiones, no prescribe tratamiento médico y no garantiza resultados deportivos. Las cargas sugeridas son orientativas, editables y solo se calculan cuando existe una marca compatible; si falta, la aplicación propone empezar con barra vacía o una carga técnica cómoda.
