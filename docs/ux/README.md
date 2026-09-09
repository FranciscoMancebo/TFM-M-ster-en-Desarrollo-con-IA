# Diseño de experiencia

Los documentos de esta carpeta describen la interacción antes de implementar componentes visuales. Los wireflows son hipótesis de diseño y deben probarse con usuarios.

| Documento | Propósito |
| --- | --- |
| [Recorrido principal móvil](01-wireflow-recorrido-principal.md) | Crear una rutina, activarla, ejecutar una sesión y consultar el resumen. |

## Principios

- La sesión activa domina la interfaz mientras se entrena.
- Los datos que no cambian se reutilizan; no se vuelven a pedir en cada serie.
- Planificación y ejecución son objetos distintos: editar una sesión no altera la plantilla.
- Las acciones destructivas o irreversibles requieren intención explícita.
- Los estados vacío, error, guardado y sin conexión forman parte del flujo, no son añadidos finales.

