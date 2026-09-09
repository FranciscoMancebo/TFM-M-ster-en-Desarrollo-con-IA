# ADR-0001: Monolito modular full-stack con Next.js

- Estado: Propuesto
- Fecha: 2026-09-09

## Contexto

El proyecto lo desarrollará una persona, necesita interfaz web responsive, operaciones autenticadas, páginas públicas y una capa servidor para reglas y acceso a datos. Separar desde el inicio SPA y API aumentaría configuración, despliegue y contratos.

## Opciones consideradas

1. Next.js full-stack como monolito modular.
2. React SPA y API Node independiente.
3. Aplicación móvil nativa y API independiente.

## Decisión

Usar Next.js con App Router y TypeScript. Organizar por capacidades y mantener dominio/casos de uso independientes del framework cuando contengan reglas relevantes.

## Consecuencias positivas

- Un solo lenguaje y despliegue web.
- Renderizado servidor para contenido público y datos iniciales.
- Secretos y acceso privilegiado permanecen en servidor.
- Menor carga operativa para el TFM.

## Consecuencias negativas

- Acoplamiento operativo al ecosistema React/Next.js.
- Hay que vigilar límites entre Server y Client Components.
- Un despliegue único no escala componentes por separado.

## Criterio de revisión

Revisar si aparece un cliente nativo, integraciones que exijan una API pública estable o necesidades de escalado medidas e independientes.
