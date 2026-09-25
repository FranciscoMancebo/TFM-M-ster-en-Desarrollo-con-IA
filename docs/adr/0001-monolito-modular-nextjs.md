# ADR-0001: Monolito modular full-stack con Next.js

- Estado: Aceptado
- Fecha: 2026-09-09

## Contexto

El proyecto lo desarrollará una persona, necesita interfaz web responsive, operaciones autenticadas, páginas públicas y una capa servidor para reglas y acceso a datos. Separar desde el inicio SPA y API aumentaría configuración, despliegue y contratos.

## Opciones consideradas

1. Next.js full-stack como monolito modular.
2. React SPA y API Node independiente.
3. Aplicación móvil nativa y API independiente.

## Decisión

Usar React con un App Router compatible con Next.js y TypeScript. La implementación se compila con Vinext/Vite para GPT Sites. Organizar por capacidades y mantener reglas, tipos y acceso a datos separados de los componentes cuando aporten lógica relevante.

## Consecuencias positivas

- Un solo lenguaje y despliegue web.
- Una sola aplicación web responsive y portable.
- Build compatible con el entorno de Sites sin mantener una API propia.
- Menor carga operativa para el TFM.

## Consecuencias negativas

- Acoplamiento operativo al ecosistema React/Next.js.
- La aplicación actual concentra orquestación en una página cliente que deberá modularizarse al crecer.
- Un despliegue único no escala componentes por separado.

## Criterio de revisión

Revisar si aparece un cliente nativo, integraciones que exijan una API pública estable o necesidades de escalado medidas e independientes.
