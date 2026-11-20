# 08. Guía técnica y operativa

## 1. Entornos

| Entorno | Aplicación | Datos |
| --- | --- | --- |
| Desarrollo | Vinext/Vite en el equipo local | Supabase Cloud |
| Validación | Build local de producción | Supabase Cloud con datos de prueba |
| Despliegue | GPT Sites | El mismo proyecto remoto configurado |

La base local de Supabase no forma parte del flujo operativo actual.

## 2. Requisitos

- Windows con PowerShell.
- Node.js 22.13 o superior, que incluye `npm.cmd` y `npx.cmd`.
- Acceso al proyecto remoto de Supabase.
- Variables públicas del proyecto.

Comprobar:

```powershell
node --version
npm.cmd --version
```

## 3. Instalación

Desde la raíz:

```powershell
cd .\web
npm.cmd install
Copy-Item .env.example .env.local
```

Editar `web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

No utilizar `service_role` ni guardar secretos en el repositorio.

## 4. Desarrollo

```powershell
cd .\web
npm.cmd run dev
```

Alternativa: ejecutar `iniciar-web.cmd` desde el explorador de Windows.

## 5. Base de datos

### Enlace

El `project-ref` es el subdominio del proyecto y también aparece en Settings → General de Supabase.

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref TU_PROJECT_REF
```

### Aplicar migraciones

```powershell
npx.cmd supabase db push
```

Las migraciones se ejecutan en orden por nombre. No se modifica una migración ya aplicada; cualquier cambio se añade con un nuevo número.

### Inventario

| Migración | Capacidad |
| --- | --- |
| `202609230001` | Perfil, catálogo, rutinas, asignaciones, sesiones, series y RLS |
| `202609230002` | Aprovisionamiento y carga sugerida |
| `202609240001` | Configuración inicial, medidas, avatar y objetivos |
| `202609240002` | Marcas fechadas |
| `202609240003` | Experiencia y nivel deportivo |
| `202609240004` | Nivel `starter` en versiones |
| `202609240005` | Enciclopedia de ejercicios |
| `202609240006` | Idioma preferido |
| `202609240007` | Likes, preguntas y comunidad |
| `202609240008` | Endurecimiento de operaciones sociales |
| `202609240009` | Normalización del enfoque |
| `202609240010` | Variantes adicionales y pausas |
| `202609240011` | Rutinas de varios días |
| `202609240012` | Activación, importación y datos ficticios |
| `202609240013` | Perfiles públicos y privacidad granular |
| `202609240014` | Lectura directa de perfiles solo para propietario |
| `202609240015` | Notificaciones, XP, niveles y logros |
| `202609250001` | Hitos de volumen y ampliación de la comunidad ficticia |
| `202609280001` | Detección y confirmación de marcas desde entrenamientos |
| `202609280002` | Calendario, planificación, adherencia y rachas |
| `202609280003` | Récords por repeticiones, RPE, sensaciones y recuperación |
| `202609280004` | Desambiguación de funciones de detección de marcas |
| `202609290001` | Bloques, fases y progresión de entrenamiento |
| `202609290002` | Exportación, borrado, privacidad y paginación |
| `202609290003` | Endurecimiento de la exportación de cuenta |
| `202609290004` | Recompensas de nivel y espacios del perfil |
| `202609290005` | Cosméticos y recompensas por categorías |
| `202609290006` | Perfil y baremos de elegibilidad competitiva |
| `202611200001` | Preferencias persistentes del temporizador de descanso |

## 6. Datos ficticios

La migración 012 crea la comunidad ficticia inicial. La migración `202609250001` la amplía hasta diez identidades sin acceso interactivo y veinte rutinas públicas, añade progresiones fechadas para los cuatro levantamientos y distribuye likes y preguntas entre distintos niveles y enfoques. Las migraciones de gamificación calculan XP y logros sobre esos datos igual que sobre los de un usuario real.

Estos registros permiten demostrar comunidad y perfiles sin utilizar datos reales. No deben confundirse con participantes de evaluación.

## 7. Validación

Desde `web/`:

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run check
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

`check` ejecuta tipos, lint, pruebas unitarias y build. El lint también puede ejecutarse de forma independiente con `npm.cmd run lint`.

Los tres casos de acceso anónimo no necesitan servicios externos. Para los recorridos autenticados, copiar `.env.e2e.example` como `.env.e2e` y configurar un proyecto Supabase exclusivo para pruebas. Playwright carga el archivo al arrancar y crea y elimina sus propios usuarios. No utilizar el proyecto de producción: la clave `E2E_SUPABASE_SERVICE_ROLE_KEY` tiene privilegios administrativos y nunca debe llamarse `VITE_*`.

Para base de datos:

```powershell
npx.cmd supabase db lint --linked
npm.cmd run test:db
```

La suite RLS se encuentra en `supabase/tests`, se ejecuta dentro de transacciones con `ROLLBACK` y requiere Docker Desktop para la imagen `pg_prove`. Debe utilizarse contra un entorno de prueba controlado antes de la entrega.

GitHub Actions ejecuta tipos, unitarias, build y pruebas de navegador mediante `.github/workflows/quality.yml`. Los secretos de repositorio `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY` y `E2E_SUPABASE_SERVICE_ROLE_KEY` habilitan los recorridos autenticados; sin ellos se omiten de forma explícita. La suite remota de base de datos permanece separada porque requiere credenciales y un entorno Supabase controlado.

## 8. Despliegue

El manifiesto `web/.openai/hosting.json` identifica el proyecto de GPT Sites. El proceso de hosting valida, empaqueta y publica una revisión Git exacta.

Reglas operativas:

- no publicar cambios sin build correcto;
- no incluir `.env.local`;
- no cambiar el `project_id` al trasladar solo código;
- confirmar la política de acceso antes de desplegar;
- la persona responsable crea los commits;
- documentar fecha, revisión y URL desplegada.

La aplicación puede desplegarse en otra plataforma si admite el frontend generado y variables de entorno. Supabase permanece accesible por HTTPS.

## 9. Recuperación de incidencias

### La web no encuentra Supabase

- verificar nombres exactos de variables;
- reiniciar el servidor tras cambiar `.env.local`;
- comprobar que la URL pertenece al proyecto enlazado.

### Error de relación ambigua

Usar la relación o función RPC explícita definida por el repositorio. No resolverlo eliminando claves foráneas.

### Error de constraint de nivel

Aplicar la migración 004 o superior. Los valores permitidos incluyen `starter`.

### Carga propuesta sin marca

El comportamiento correcto es 0 kg con una nota técnica. Si aparece otra cifra, validar que se está ejecutando la versión actual de `routine-generator.ts`.

### Dos repositorios en VS Code

Debe existir un único `.git` en la raíz. `web/` es una carpeta normal del mismo repositorio.

## 10. Copia y portabilidad

La recuperación depende de:

- repositorio con migraciones y código;
- copia/exportación del proyecto Supabase;
- variables de entorno conservadas fuera de Git;
- acceso al proyecto de hosting.

El código no contiene datos de producción ni claves privadas.
