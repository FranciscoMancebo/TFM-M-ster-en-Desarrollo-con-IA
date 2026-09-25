# ADR-0003: Versiones publicadas inmutables y copias con procedencia

- Estado: Aceptado
- Fecha: 2026-09-09

## Contexto

Las rutinas se pueden publicar, copiar y adaptar. Si una publicación se modifica en el lugar, las personas que la consultaron o copiaron pierden la referencia exacta y pueden recibir cambios no esperados.

## Opciones consideradas

1. Editar siempre la misma rutina y conservar solo el estado actual.
2. Guardar un historial parcial de cambios.
3. Separar la identidad de rutina de versiones inmutables y enlazar cada copia con su versión de origen.

## Decisión

Una rutina tiene identidad estable y una o más versiones. Una versión publicada no se modifica: cualquier cambio publicable crea otra. Copiar crea una rutina privada independiente y conserva la versión exacta de procedencia.

## Consecuencias positivas

- Autoría y procedencia verificables.
- Las copias nunca cambian silenciosamente.
- Se puede reproducir qué planificación se siguió.
- Facilita auditoría, comparación y posible reversión.

## Consecuencias negativas

- Más entidades y consultas que un documento mutable.
- Hay que diseñar estados de borrador, publicación y retirada.
- El almacenamiento crece con cada versión, aunque el impacto del MVP es pequeño.

## Criterio de revisión

Revisar si las pruebas de usuario muestran que el versionado es demasiado complejo en la interfaz. La complejidad visual puede reducirse sin eliminar la trazabilidad del modelo.

