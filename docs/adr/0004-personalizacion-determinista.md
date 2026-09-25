# ADR-0004: Personalización determinista y explicable

- Estado: Aceptado
- Fecha: 2026-09-09

## Contexto

El producto debe adaptar nivel, ejercicios y cargas, pero una recomendación opaca o basada en una marca inexistente supone un riesgo deportivo y de confianza. El MVP debe funcionar sin coste de inferencia.

## Opciones consideradas

1. Valores fijos iguales para todas las personas.
2. Modelo generativo externo.
3. Reglas deterministas basadas en experiencia, peso, objetivo y marcas.

## Decisión

Usar funciones puras y reglas versionadas. La experiencia técnica limita el nivel deportivo. Cada porcentaje usa una marca compatible y fechada. Si falta, la carga es 0 kg y la interfaz recomienda barra vacía o carga técnica cómoda. Toda propuesta se edita antes de guardar.

El entrenador conversacional del MVP utiliza intenciones cerradas sobre el contexto cargado. Un modelo externo queda como integración opcional futura.

## Consecuencias positivas

- Resultados reproducibles y testeables.
- Sin coste de modelo.
- Explicación visible de cada carga.
- Comportamiento seguro ante datos incompletos.

## Consecuencias negativas

- Menos flexibilidad ante preguntas abiertas.
- Las reglas requieren revisión experta.
- No existe adaptación automática durante el ciclo.

## Criterio de revisión

Revisar tras pruebas con atletas y entrenador. Cualquier modelo futuro deberá conservar referencias, límites, coste y posibilidad de edición.
