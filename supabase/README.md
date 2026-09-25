# Supabase

Supabase Cloud proporciona identidad, PostgreSQL, funciones RPC, triggers y autorización RLS para Haltero. Es la única base de datos de ejecución del flujo actual.

## Aplicar el esquema remoto

Desde la raíz del repositorio:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref TU_PROJECT_REF
npx.cmd supabase db push
```

El `project-ref` aparece en la URL `https://TU_PROJECT_REF.supabase.co` y en Settings → General.

## Fuente de verdad

`supabase/migrations` contiene el esquema acumulativo. Las migraciones aplicadas no se reescriben; los cambios se incorporan en un archivo nuevo.

Las áreas cubiertas son:

- perfiles, configuración, idioma y privacidad;
- catálogo y enciclopedia;
- marcas;
- rutinas versionadas y días;
- asignaciones, sesiones y series;
- comunidad, likes, preguntas y respuestas;
- importación, activación y procedencia;
- perfiles públicos;
- notificaciones, XP, niveles de cuenta y logros;
- usuarios y rutinas ficticios para demostración.

## Seguridad

- `auth.uid()` es la identidad efectiva.
- RLS está activa en todas las tablas con datos de usuario.
- `profiles` permite lectura directa solo al propietario.
- El perfil público se obtiene mediante una proyección RPC.
- Las RPC sensibles requieren rol `authenticated`.
- Las funciones con privilegios fijan el `search_path`.
- Las claves únicas hacen idempotentes likes, notificaciones y XP.

La clave `service_role` no se utiliza en el navegador.

## Validación

```powershell
npx.cmd supabase db lint --linked
```

`supabase/tests/0001_rls_vertical_slice.test.sql` contiene la base de pruebas allow/deny. Debe ampliarse con casos sociales, privacidad granular y gamificación antes de la entrega final.

## Datos ficticios

La migración `202609240012` crea identidades no interactivas, rutinas públicas, likes y preguntas. Sirven para la demostración y no representan usuarios reales.

La guía completa está en [docs/08-guia-tecnica-y-operacion.md](../docs/08-guia-tecnica-y-operacion.md).
