# Correcciones de diseño — Portal Pruebas

**Fecha:** 13 de octubre de 2026  
**Archivo:** `design/portal-pruebas.pen`  
**Referencia:** `PortalPruebasDesignAudit.md` y plan de correcciones finales  
**Alcance:** solo diseño en Pen.dev. Sin cambios en Next.js ni backend.

## En una frase

Se completó el editor, se separaron estados, se cerró el envío del candidato y se ampliaron las variantes responsive; quedan pendientes adaptaciones táctiles finas y algunos marcos nuevos solo en escritorio.

## Listo cuando (criterio del plan)

| Criterio | Estado |
|---|---|
| Editor técnico con 12 preguntas, opciones, correcta y puntos | Corregido |
| Editor psicométrico con dimensión e ítem invertido | Corregido |
| Publicar con v1, 45 minutos y 1 intento | Corregido |
| Listado solo Borrador / Publicada / Archivada | Corregido |
| Seguimiento solo estados de asignación; Sofía = Pendiente; Enviado = — | Corregido |
| Última pregunta → confirmar → finalización; tiempo agotado; reanudar; postulación cerrada; error al guardar | Corregido (escritorio; variantes T/M añadidas por copia) |
| Asignar sin Luis; vínculo inactivo; éxito y error de lote | Corregido |
| Análisis = 81 en escritorio, tableta y móvil | Corregido |
| Sin cambios en `app/`, `components/` ni `lib/` | Cumple |
| Cada fila del inventario en medida exacta | Parcial (ver pendientes) |

## Observaciones de la auditoría

### Críticas

| # | Observación | Estado | Notas |
|---|---|---|---|
| 1 | Editor incompleto | Corregido | Lista de 12 + detalle (tipos, opciones, correcta, puntos). Variante psicométrica con Likert, dimensión e ítem invertido. Guardar borrador, publicar v1 y pantalla de versiones. |
| 2 | Estados mezclados | Corregido | Listado: Publicada / Borrador / Archivada. Pill «Asignada» → «Pendiente», «En curso» → «En progreso». Seguimiento alineado en D/T/M. |
| 3 | Candidato no puede enviar | Corregido | Pregunta 12, «Enviar evaluación», diálogo de confirmación, error al guardar, tarjeta de salida, reanudar, tiempo agotado y postulación cerrada. |

### Altas

| # | Observación | Estado | Notas |
|---|---|---|---|
| 4 | Responsive 1440×900 / 768×1024 / 390×844 | Parcial | Dashboard, listado, crear, asignar, seguimiento, resultados, candidato y varios estados quedan en medida exacta con `clip`. Muchas variantes T/M son copias redimensionadas, no layouts rediseñados para el viewport. |
| 5 | Vincular incompleto | Corregido | Lista Activo/Inactivo, desactivar, nota de que vincular no asigna. Tablet añadida; móvil a 390×844. |
| 6 | Asignar y elegibilidad | Corregido | Solo María, Carlos y Sofía. Resumen de lote, confirmar, éxito, error todo-o-nada y sin elegibles. |
| 7 | Números inconsistentes | Corregido | Editor y publicar en 12. Análisis = 81 sin % en T/M. |
| 8 | Seguimiento no opera | Corregido | Acciones Ver resultado / Recordar / Cancelar / Autorizar reintento + diálogo. |
| 9 | Revisión manual | Corregido | Cola y detalle con puntuación 0–2. |
| 10 | Psicométricos como ranking | Corregido | Aviso: no diagnóstico, no decide contratación, no altera idoneidad. |
| 11 | Reportes / banco / migas | Corregido | Migas propias. Baterías = grupos de pruebas publicadas. Reportes con paginación y botones de exportar. |
| 12 | Menú móvil abierto | Corregido | Drawer en dashboard tableta y móvil. |

### Medias (alcance de esta pasada)

| # | Observación | Estado | Notas |
|---|---|---|---|
| 13 | Carga/vacío/error | Parcial | Listado vacío/error en D/T/M. Error al guardar del candidato. Asignar sin elegibles. Carga del dashboard fuera de alcance. |
| 14 | Baterías | Corregido | Redibujadas como grupos de evaluaciones publicadas. |
| 15 | Pastillas Borrador/Archivada | Corregido | Uso claro en listado. |
| 16–17 | Tokens y contraste | Parcial | Botones primarios a `#337C37`. Wordmark Manrope. Menú de idioma es/en/de/fr/it en listado. No se auditó cada gris del lienzo. |
| 18 | Toques 44 px | Parcial | Controles nuevos a 44 px. Controles antiguos en móvil no se midieron uno a uno. |
| 19 | Salir / Volver al inicio | Corregido | Tarjeta «Saliste de la evaluación…». |
| 20 | Selector de idioma | Corregido | Menú con 5 idiomas (listado escritorio). |

### Bajas

Fuera de alcance salvo lo tocado al editar marcos.

## Pantallas nuevas o estados nuevos

- Crear preguntas técnica y psicométrica (detalle completo)
- Confirmar publicar, Versiones
- Vincular con vínculos activos/inactivos
- Asignar: confirmar, éxito, error de lote, sin elegibles
- Resolver: última pregunta, confirmar envío, error al guardar, salir
- Bienvenida: reanudar
- Estados: tiempo agotado, postulación cerrada (+ T/M)
- Seguimiento: autorizar reintento
- Revisión manual: cola y detalle
- Ficha RRHH con resultado de prueba
- Dashboard: drawer abierto T/M
- Baterías / Reportes / Crear tipo / Publicar / Vincular en T/M

## Pendiente

1. **Layouts responsive adaptados:** varias variantes T/M son el escritorio recortado a 768×1024 o 390×844. Conviene redibujar columnas, tablas y footers para móvil (sin sidebar de 260 px).
2. **Editor en móvil:** la lista de 12 + panel de detalle cabe mal en 390 px; hace falta un patrón apilado.
3. **Empresa dueña:** no había nombre de empresa en el lienzo; no se inventó. Sigue pendiente si el producto lo exige.
4. **Contraste y grises residuales:** barrido completo de `#9CA39C` / Tailwind en todos los marcos.
5. **Toques 44 px** en pestañas y filtros antiguos del listado móvil.
6. **Confirmación de exportar** y leyenda del gráfico del dashboard (bajas).
7. **Verificación visual** de cada marco del inventario con captura individual (se verificaron editor, vincular, asignar, seguimiento, baterías y confirmar envío).

## Cómo verificar

En Pen.dev, abrir `design/portal-pruebas.pen` y comprobar `width` × `height` de cada marco del inventario del plan. Recorrer: Crear preguntas → Publicar → Vincular → Asignar → Resolver 12 → Confirmar → Finalización → Seguimiento → Revisión manual.
