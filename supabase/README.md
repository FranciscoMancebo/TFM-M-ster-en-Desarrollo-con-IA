# Supabase

La migración inicial materializa el primer recorrido vertical: identidad, catálogo, rutina versionada, asignación, sesión y series realizadas.

## Base de datos remota

El proyecto utiliza Supabase Cloud como única base de datos de ejecución. Para enlazar un entorno nuevo y aplicar los cambios:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Las políticas RLS consideran `auth.uid()` como única fuente de identidad. La aplicación cliente nunca debe enviar ni decidir el propietario efectivo de una fila.

Las migraciones de `supabase/migrations` son la fuente de verdad del esquema remoto. No se utiliza la pila local de Supabase en el flujo actual.
