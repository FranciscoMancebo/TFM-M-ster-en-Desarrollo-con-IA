# ADR-0002: PostgreSQL, Supabase Auth y Row Level Security

- Estado: Propuesto
- Fecha: 2026-09-09

## Contexto

Los datos de sesiones y marcas son privados; las rutinas pueden cambiar de privadas a públicas y conservar versiones/copias. Se necesita autenticación segura y autorización por propietario.

## Opciones consideradas

1. Supabase: PostgreSQL, Auth, Storage y RLS.
2. PostgreSQL administrado más Auth.js y almacenamiento separado.
3. Firebase Authentication y Firestore.

## Decisión

Usar Supabase para base de datos e identidad. Mantener esquema, grants, políticas y pruebas como migraciones versionadas. Emplear RLS como control de defensa en profundidad, sin sustituir la autorización en los casos de uso.

## Consecuencias positivas

- SQL relacional, integridad y transacciones.
- Identidad integrada en políticas por fila.
- Capacidades de búsqueda textual y ampliación futura sin cambiar el motor de datos.
- Menos infraestructura que operar.

## Consecuencias negativas

- Dependencia del servicio y de sus convenciones de autenticación.
- Las políticas RLS requieren diseño y pruebas cuidadosas.
- La clave privilegiada tiene un impacto alto si se filtra.

## Criterio de revisión

Revisar si los requisitos de residencia, coste, disponibilidad o portabilidad dejan de cumplirse. Mantener SQL y exportación documentados reduce el coste de salida.
