# Haltero — plataforma web de entrenamiento de halterofilia

Haltero es una aplicación web móvil-first para planificar y ejecutar entrenamientos de halterofilia, registrar marcas, visualizar el progreso y compartir rutinas con una comunidad. El producto adapta la experiencia inicial, el nivel deportivo, los ejercicios y las cargas orientativas a los datos del atleta, sin sustituir el criterio de un entrenador.

Este repositorio contiene la aplicación, las migraciones de Supabase y la documentación del TFM.

## Estado del proyecto

**Fase actual:** MVP funcional desplegado y en consolidación técnica/documental.

Capacidades disponibles:

- registro, inicio y cierre de sesión con Supabase Auth;
- recuperación segura de contraseña mediante enlace de Supabase;
- configuración inicial guiada de disponibilidad, medidas, experiencia, objetivos, avatar y marcas;
- detección de 1RM, 2RM, 3RM y 5RM por ejercicio, confirmación opcional y estimación diferenciada de 1RM;
- cálculo de cuatro niveles deportivos: iniciación, principiante, intermedio y avanzado;
- rutinas privadas o públicas, editables, eliminables y organizadas en días independientes;
- creación manual o asistida mediante reglas por nivel, objetivo y marcas disponibles;
- bloques de acumulación, intensificación y descarga, con semanas editables y progresión automática de porcentajes;
- activación de rutinas propias e importación/activación de rutinas públicas con procedencia;
- registro de sesiones, RPE por serie, carga planificada frente a realizada y cierre con dolor, fatiga y sensación general;
- avisos cuando el rendimiento relativo desciende durante tres sesiones consecutivas;
- estadísticas de volumen semanal por ejercicio, intensidad relativa, distribución del trabajo, total olímpico y fuerza respecto al peso corporal;
- comparación orientativa del total olímpico con las mínimas RFEH 2026 por edad, categoría de competición y peso, con desglose normativo;
- calendario semanal y mensual para planificar, reprogramar y clasificar entrenamientos, descansos, competiciones y sesiones libres;
- ejecución de sesiones libres configurables desde el calendario, con ejercicios del catálogo, series, repeticiones, cargas, RPE, detección de marcas y conversión opcional en rutina privada;
- temporizador de descanso automático por serie, con pausa, reinicio, ampliación, persistencia y avisos configurables;
- adherencia semanal y mensual, racha de entrenamientos, días completados y semanas perfectas;
- historial y gráficos fechados para sentadilla, arrancada, sentadilla frontal y dos tiempos;
- enciclopedia de fuerza, movilidad, arrancada y dos tiempos con variantes y hueco para vídeo;
- comunidad con filtros, likes, preguntas al autor y perfiles públicos configurables;
- notificaciones por likes y preguntas;
- experiencia, niveles de cuenta, logros desbloqueables y celebraciones animadas;
- recompensas de perfil por nivel: tres espacios multimedia y cuatro enlaces sociales con desbloqueo progresivo;
- cosméticos equipables en cada nivel, recompensas mayores cada cinco niveles, prestigio cada diez y colecciones por constancia, volumen, técnica, competición, comunidad y progreso;
- entrenador conversacional gratuito basado en reglas y en el contexto almacenado;
- interfaz bilingüe en español e inglés;
- exportación JSON y eliminación definitiva de la cuenta por el propio usuario;
- paginación remota de comunidad y notificaciones;
- navegación por teclado, foco visible, contraste AA comprobado y respeto a movimiento reducido;
- carga diferida de secciones y presupuesto automático del bundle de producción.

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

En Supabase Auth → URL Configuration, la URL pública de GPT Sites debe figurar como `Site URL` o en `Redirect URLs` para que los enlaces de recuperación regresen a la aplicación. Añade también la URL local únicamente para probar la recuperación durante el desarrollo.

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

`test` ejecuta las pruebas unitarias de dominio; `test:e2e` abre Chromium mediante Playwright; y `check` agrupa tipos, lint, unitarias, build de producción y presupuesto por chunk. La primera ejecución E2E necesita instalar el navegador con `npx.cmd playwright install chromium`. `npm.cmd run bundle:check` muestra peso bruto y gzip de los chunks mayores y falla por encima de 500 kB brutos o 180 kB gzip.

El E2E autenticado crea un atleta efímero, completa una sesión, confirma la nueva marca y elimina la cuenta al terminar. Para habilitarlo, copia `web/.env.e2e.example` como `web/.env.e2e`, rellénalo con un proyecto Supabase aislado y ejecuta de nuevo `npm.cmd run test:e2e`. Playwright carga ese archivo automáticamente. La clave `service_role` solo se consume desde el proceso Node de Playwright y nunca se expone como variable `VITE_*`.

Las pruebas transaccionales de seguridad y comportamiento de Supabase están en `supabase/tests/`. Con Docker Desktop activo y el proyecto enlazado se ejecutan desde `web/` con:

```powershell
npm.cmd run test:db
```

El workflow `.github/workflows/quality.yml` reproduce automáticamente tipos, unitarias, build y E2E en cada cambio de `main` y en cada pull request. Para ejecutar también los recorridos autenticados deben existir en GitHub Actions los secretos `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` y `E2E_SUPABASE_SERVICE_ROLE_KEY`; si faltan, esos casos se muestran como omitidos y las pruebas públicas continúan.

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
