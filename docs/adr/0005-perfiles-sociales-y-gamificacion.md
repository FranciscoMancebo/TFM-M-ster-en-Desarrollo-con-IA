# ADR-0005: Perfiles sociales con privacidad granular y gamificación separada

- Estado: Aceptado
- Fecha: 2026-09-09

## Contexto

Las rutinas públicas necesitan autor y contexto, pero altura, peso, experiencia y progresión son datos sensibles para muchas personas. Likes, preguntas y logros aportan continuidad, aunque pueden confundirse con mérito deportivo.

## Opciones consideradas

1. Perfil completamente público o privado.
2. Perfil público con todas las métricas.
3. Perfil globalmente privado/público y permisos independientes por sección.

## Decisión

La tabla de perfiles es de lectura directa exclusiva del propietario. Una RPC proyecta el perfil público y aplica permisos separados para datos de entrenamiento, progresión y rutinas. Likes y preguntas generan notificaciones persistentes.

La actividad concede XP mediante eventos idempotentes y desbloquea logros. El nivel de cuenta se presenta separado del nivel deportivo y no influye en cargas ni recomendaciones.

## Consecuencias positivas

- Control explícito del usuario.
- Menor riesgo de exposición accidental.
- Actividad social relevante sin feed general.
- Recompensas auditables y sin duplicados.

## Consecuencias negativas

- Más tablas, RPC y estados de interfaz.
- Mayor carga de pruebas de permisos.
- Necesidad de explicar dos conceptos de nivel.

## Criterio de revisión

Revisar si los usuarios no entienden la privacidad granular o confunden XP con capacidad deportiva. En ese caso, simplificar la presentación sin relajar RLS.
