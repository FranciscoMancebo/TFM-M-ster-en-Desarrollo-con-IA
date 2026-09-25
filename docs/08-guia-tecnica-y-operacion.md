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

## 6. Datos ficticios

La migración 012 crea cuatro identidades de demostración sin acceso interactivo, ocho rutinas públicas y actividad social. Las migraciones posteriores completan sus perfiles, marcas, XP y notificaciones.

Estos registros permiten demostrar comunidad y perfiles sin utilizar datos reales. No deben confundirse con participantes de evaluación.

## 7. Validación

Desde `web/`:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Para base de datos:

```powershell
npx.cmd supabase db lint --linked
```

La suite RLS se encuentra en `supabase/tests`. Debe ejecutarse contra un entorno de prueba controlado antes de la entrega.

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
