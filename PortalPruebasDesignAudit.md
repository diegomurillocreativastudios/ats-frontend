# Auditoría de diseño — Portal Pruebas

**Fecha:** 13 de octubre de 2026  
**Archivo revisado:** `design/portal-pruebas.pen` (solo lectura)  
**Referencias:** `PortalPruebasTodo.md` y `docs/portal-pruebas/fase-0.md` del backend; tokens de `app/globals.css` y criterio visual de ApplicanTree.  
**Alcance:** auditoría. No se modificó el diseño ni el código de producto.

## En una frase

El lienzo cubre el recorrido feliz de crear, vincular, asignar y resolver una prueba, con la paleta verde de ApplicanTree, pero el editor no permite configurar una prueba real, el listado mezcla estados de cosas distintas y solo el camino del candidato (bienvenida, resolver y cierre) tiene las tres medidas pedidas.

## Lo que ya está diseñado

- Shell de personal de Recursos Humanos: marca ApplicanTree, menú Dashboard · Evaluaciones · Seguimiento · Resultados, usuario «Ana Ruiz / Reclutadora» y cambio de idioma.
- Flujo feliz documentado en el mapa: Dashboard → Listado → Crear → Vincular vacante → Asignar elegibles → Bienvenida → Resolver → Finalización → Seguimiento → Resultados.
- Copy explícito de la regla central: vincular no entrega la prueba a todo el mundo; solo quien ya postuló a esa vacante puede recibirla. En asignar, «Luis Ortega» aparece como no elegible y el botón dice «Asignar (3)».
- Estados del candidato cuando no puede entrar: vencida, cancelada, enlace inválido y postulación que no cumple condiciones.
- Dashboard con filtros, acciones rápidas, indicadores, «Necesitan atención», gráfica y tabla reciente; más variantes de carga, vacío y error en escritorio.
- Listado de evaluaciones con vacío y error en escritorio. Banco de preguntas, baterías y reportes existen como pantallas de escritorio.
- Experiencia del candidato en tarjeta centrada, con temporizador, «Guardado automáticamente» y opción seleccionada, en 1440×900, 768×1024 y 390×844.

## Matriz de cobertura

Medida exigida: escritorio **1440×900**, tableta **768×1024**, móvil **390×844**.

| Vista | Escritorio | Tableta | Móvil | ¿Las tres medidas exactas? |
|---|---|---|---|---|
| Dashboard con datos | 1440×2000 | 768×2200 | 390×2800 | No. El contenido está, la altura no es la del viewport |
| Dashboard en carga | 1440×1400 | — | — | No |
| Dashboard vacío | 1440×1200 | — | — | No |
| Dashboard con error | 1440×900 | — | — | No |
| Filtros del dashboard | — | — | 390×640 (hoja) | No |
| Listado de evaluaciones | 1440×900 | 768×1200 | 390×1400 | No |
| Filtros del listado | — | — | 390×640 | No |
| Listado vacío | 1440×900 | — | — | No |
| Listado con error | 1440×900 | — | — | No |
| Crear — tipo | 1440×900 | — | — | No |
| Crear — preguntas | 1440×900 | 768×1200 | 390×1300 | No |
| Crear — publicar | 1440×900 | — | — | No |
| Vincular a vacante | 1440×900 | — | 390×900 | No |
| Asignar evaluación | 1440×900 | 768×1000 | 390×1100 | No |
| Seguimiento | 1440×900 | 768×900 | 390×1000 | No |
| Resultados técnicos | 1440×900 | 768×1200 | 390×1400 | No |
| Resultados psicométricos | 1440×900 | 768×1100 | 390×1200 | No |
| Banco de preguntas | 1440×900 | — | — | No |
| Baterías | 1440×900 | — | — | No |
| Reportes | 1440×900 | — | — | No |
| Candidato — bienvenida | 1440×900 | 768×1024 | 390×844 | Sí |
| Candidato — resolver | 1440×900 | 768×1024 | 390×844 | Sí |
| Candidato — finalización | 1440×900 | 768×1024 | 390×844 | Sí |
| Candidato — vencida | 1440×900 | — | — | No |
| Candidato — cancelada | 1440×900 | — | — | No |
| Candidato — enlace inválido | 1440×900 | — | — | No |
| Candidato — no cumple condiciones | 1440×900 | — | — | No |

**Únicas vistas con las tres medidas exactas:** bienvenida, resolver y finalización del candidato.

El mapa de flujo (1440×720) es documentación del lienzo, no una pantalla de producto.

### Pantallas que el plan pide y el lienzo no tiene

| Necesidad del plan | Situación en el diseño |
|---|---|
| Guardar borrador y editar solo el borrador | No hay acción «Guardar borrador» ni estado de edición |
| Duración, intentos, instrucciones y caducidad (14 días si no se indica otra) | La duración «45 minutos» aparece en el resumen de publicar, sin campo para definirla. No hay intentos ni fecha de vencimiento |
| Tipos de pregunta: opción única, múltiple, verdadero/falso, Likert y texto abierto | Solo títulos de opción múltiple. No hay opciones, respuesta correcta, puntos ni dimensiones |
| Publicar una versión inmutable | El paso se llama «Publicar». No hay número de versión ni aviso de que editar después crea otra versión |
| Lista de vínculos activos e inactivos, y desactivar sin borrar historial | Un solo desplegable y un botón «Vincular vacante» |
| Asignación solo con postulaciones elegibles, en lote todo-o-nada | La lista incluye a quien no postuló. No hay mensaje de lote, éxito, duplicado ni rechazo |
| Cancelar, vencer y autorizar reintento desde personal | El candidato ve vencida y cancelada. El personal no tiene esas acciones |
| Revisión manual de respuestas abiertas | El dashboard dice «Pendientes de revisión manual» y «Revisar». No hay pantalla de revisión |
| Enviar la prueba (última pregunta y confirmación) | Resolver solo tiene «Anterior» y «Siguiente». No existe «Enviar» |
| Tiempo agotado o postulación cerrada durante el intento | No están. Sí está el bloqueo antes de empezar |
| Resultados dentro de la ficha de la postulación en el portal de Recursos Humanos | Resultados viven solo en Portal Pruebas |
| Aviso de que el resultado no altera la puntuación de idoneidad | No aparece |
| Notificación, enlace y fallo de envío | No están |
| Menú móvil abierto | Hay icono de menú en tableta y móvil. No hay estado abierto |
| Entrada desde selección de portal o desde la vacante | No está |

Baterías están dibujadas, pero el plan las deja fuera del producto mínimo y las define como grupos de pruebas publicadas. Aquí son grupos de preguntas.

## Flujo principal

Recorrido exigido: crear prueba → elegir tipo → vincularla a una vacante → asignarla solo a quienes ya participan en esa vacante.

| Paso | Qué se ve | Hueco |
|---|---|---|
| 1. Crear | Paso 1 de 3: tarjetas Técnica y Psicométrica, nombre «Razonamiento lógico» | Falta descripción, duración, intentos, instrucciones y empresa dueña |
| 2. Tipo | Técnica queda marcada en verde. Psicométrica se describe como dimensiones, sin nota numérica única | El paso 2 sigue siendo «opción múltiple» aunque el tipo psicométrico exista. No hay constructor distinto |
| 3. Preguntas | Tres enunciados. Acciones: Anterior y Siguiente | No se añade, ordena, puntúa ni marca la correcta. El resumen posterior dice 12 preguntas |
| 4. Publicar | Resumen (nombre, tipo, 12 preguntas, 45 minutos, estado Publicada) y el aviso de que después se vincula y se asigna a elegibles | No se puede revisar preguntas. No hay versión |
| 5. Vincular | Evaluación fija, vacante «Analista de datos», texto «Solo quienes ya postularon podrán recibirla» | No lista vínculos, no impide vacante cerrada y no dice que vincular no crea postulaciones ni asignaciones |
| 6. Asignar | María, Carlos y Sofía activos y marcados. Luis Ortega: «Aún no tiene postulación activa» / «No elegible». Botón «Asignar (3)» | El título dice «candidatos elegibles» y aun así muestra a quien no postuló. Faltan plazo, aviso por correo, duplicado y confirmación |

La regla de exclusividad está escrita y el botón no cuenta a Luis. La lista, en cambio, no es exclusiva: enseña un perfil sin postulación. El plan pide que esa consulta devuelva solo postulaciones elegibles de esa vacante.

## Problemas

### Crítica

1. **El editor no alcanza para crear la prueba.** En «Preguntas» solo hay enunciados. Faltan tipo de ítem, opciones, respuesta correcta o rúbrica, puntaje, dimensión e ítem invertido. Sin eso no se puede publicar una versión congelada ni distinguir técnica de psicométrica.
2. **El listado mezcla dos estados.** La columna Estado muestra Publicada (definición de la prueba), En curso, Completada y Vencida (asignaciones). «Inventario de almacén» no tiene vacante, está archivada y el botón está deshabilitado. Quien implemente esta tabla no sabrá si el estado es de la prueba o de las personas.
3. **El candidato no tiene cómo enviar.** Resolver muestra la pregunta 3 de 12 con Anterior y Siguiente. No hay última pregunta, confirmación de envío ni qué pasa si se cierra la pestaña. La pantalla «Enviaste tu evaluación» no está conectada a un control.

### Alta

4. **Casi ninguna vista cumple 1440×900, 768×1024 y 390×844.** Solo bienvenida, resolver y finalización. El resto o cambia la altura («altura expandida para contenido completo») o no existe en tableta o móvil. Crear tipo, publicar, banco, baterías, reportes, vacíos, errores y los cuatro bloqueos del candidato quedan en una sola medida.
5. **Vincular es un formulario de un campo.** No muestra vínculos ya hechos, no permite desactivar sin perder historial y no tiene tableta. En móvil el marco mide 390×900, no 390×844.
6. **Asignar no cierra el contrato de elegibilidad.** Incluye a una persona sin postulación. No muestra etapa final, vacante cerrada, plazo de 14 días, intentos ni el resultado del lote (todo o nada). No hay pantalla de éxito ni de error al asignar.
7. **Los números no coinciden entre pantallas.** El editor lista 3 preguntas y publicar dice 12. En resultados psicométricos, Análisis es 81 en escritorio y 88 % en tableta y móvil. El resto de dimensiones también cambia de número a porcentaje.
8. **Seguimiento no opera.** En escritorio hay Completada, En curso y No iniciada. En tableta y móvil la tarjeta de Sofía usa la pastilla «Asignada». No hay cancelar, recordar, autorizar reintento ni abrir el resultado. La columna «Enviado» trae la misma fecha incluso para quien lleva 0 de 12.
9. **Falta la revisión manual.** El dashboard promete «Revisar» 3 evaluaciones. No existe la cola ni el detalle de una respuesta abierta.
10. **Resultados psicométricos se leen como ranking.** Barras con 72, 81, 65 y 70, y el texto «mayor fortaleza en Análisis». El aviso de que no es un diagnóstico clínico está. Falta el aviso del plan: no decidir contratación ni ordenar personas por personalidad, y no mezclar esto con la puntuación de idoneidad.
11. **Reportes y banco no se navegan con claridad.** El mapa dice que el menú Resultados abre Reportes, pero también existen Resultados técnicos y psicométricos, que no están en el menú. Banco, baterías y reportes mantienen la miga «Listado de evaluaciones».
12. **Tableta y móvil no abren el menú.** La barra compacta tiene icono de menú. No hay diseño del panel con Dashboard, Evaluaciones, Seguimiento y Resultados. Filtros sí tienen hoja en móvil.

### Media

13. **Carga, vacío y error no cubren el flujo.** Esas tres variantes existen en el dashboard (y vacío/error en el listado), solo en escritorio y con alturas distintas. Crear, vincular, asignar, seguimiento, resultados, banco y reportes no las tienen. El candidato no tiene carga ni error al guardar.
14. **Las baterías contradicen el plan.** El producto mínimo las aplaza y, cuando existan, agrupan pruebas publicadas y crean asignaciones individuales. El diseño las trata como paquetes de preguntas reutilizables, dentro de Evaluaciones, sin responsive.
15. **La pastilla Archivada y Borrador casi no se usan.** Están en la hoja de componentes. Archivada aparece en la fila de inventario. Borrador aparece en el banco y en la dona del dashboard (5 %), no como fila clara del listado. No hay pastilla para vínculo inactivo, cancelada, pendiente de calificar ni calificación fallida.
16. **Identidad visual, a medias.** Los verdes de marca coinciden: `#6EB940`, `#549E3C`, `#438C39`, `#337C37`, `#256D35`, fondo `#F4F7F2`, texto `#57585B`, borde `#E8F5E0`, activo `#D4EDCC`. La barra lateral usa blanco al 72 % y la línea `rgba(87, 88, 91, 0.10)`, igual que el cristal del producto. Las tarjetas son blanco sólido, sin desenfoque. Toda la tipografía es Inter; el wordmark de ApplicanTree en producto usa Manrope. Aparecen grises que no son del sistema: `#9CA39C`, `#6B7280`, `#9CA3AF`, `#F3F4F6`.
17. **Contraste.** Blanco sobre `#6EB940` queda en 2.42:1 (los botones primarios). `#75767A` sobre `#F4F7F2` queda en 4.20:1. `#9CA39C` sobre blanco queda en 2.58:1. El verde de marca ya es el del producto; el gris `#9CA39C` no debería usarse para texto.
18. **Toques pequeños en móvil.** Pestañas del listado miden unos 31 px de alto. Filtros, unos 36–37 px. Crear evaluación y la barra de Anterior/Siguiente, unos 41 px. El mínimo del producto es 44 px.
19. **«Volver al inicio» y «Salir» no tienen destino.** El candidato está fuera del portal de candidato (solo logo y Salir). Si entra por enlace, no hay un inicio al que volver. El texto del enlace inválido dice «ya fue usado», y el plan necesita reanudar un intento guardado.
20. **El selector de idioma no tiene otras lenguas.** El producto traduce a español, inglés, alemán, francés e italiano. El lienzo solo muestra español, con el control «Español» visible.

### Baja

21. **Mucho aire bajo tablas cortas** en marcos de 900 px (vincular, seguimiento, banco, baterías, reportes). No rompe el uso; en móvil el botón de asignar queda lejos del borde inferior del marco porque el marco es más alto que el contenido.
22. **Diez recortes parciales** en el lienzo: un segmento de barra, el texto «auto» de una tarjeta, el idioma de la barra superior en varias pantallas y el paso 3 del stepper. Conviene revisar que «Publicar» no quede cortado en el paso 1.
23. **No hay paginación, orden ni detalle al pulsar una fila.** Las tablas muestran cuatro o cinco ejemplos.
24. **No hay confirmación** de publicar, vincular, asignar ni exportar. Publicar y asignar son acciones con efecto; un deshacer o un diálogo corto reduciría errores.
25. **El gráfico del dashboard** («Cierra en 18 completadas el día 14») no se entiende sin leyenda. La dona sí etiqueta los porcentajes.

## Recomendaciones

1. Redibujar **Crear → Preguntas** como editor de verdad: añadir pregunta, elegir tipo, opciones, correcta o dimensión, puntos y orden. Una variante técnica y otra psicométrica. Mostrar el mismo conteo que en Publicar.
2. En **Publicar**, añadir duración, intentos (por defecto 1), instrucciones y el número de versión. Dejar claro que publicar congela las preguntas.
3. Separar el **estado de la prueba** (Borrador, Publicada, Archivada) del **estado de la asignación** (Pendiente, En curso, Completada, Vencida, Cancelada). El listado de pruebas no debe usar En curso ni Vencida.
4. Rehacer **Asignar** para que la lista sea solo postulaciones activas de esa vacante. Los casos rechazados (sin postulación, otra vacante, contratado, rechazado, retirado, vacante cerrada) van en un estado vacío o en un mensaje de error, no como filas mezcladas. Añadir vencimiento, resumen del correo y resultado del lote.
5. Completar **Vincular** con la lista de vacantes ya vinculadas, estado activo/inactivo y desactivar. Repetir que vincular no asigna y no crea postulaciones.
6. Añadir **Enviar** en la última pregunta, confirmación, y las pantallas de tiempo agotado y de postulación cerrada a mitad del intento. Definir a dónde van Salir y Volver al inicio cuando la entrada es un enlace.
7. Diseñar la **revisión manual** que el dashboard ya anuncia, y en resultados psicométricos quitar la lectura de ranking: mantener el aviso clínico y añadir que no decide la contratación ni cambia la puntuación de idoneidad.
8. Unificar la navegación: Resultados del menú abre un destino solo (reportes o detalle, no ambos sin decirlo). Corregir la miga de banco, baterías y reportes. Dibujar el menú abierto en tableta y móvil.
9. Para cada pantalla de personal del flujo principal, producir tres marcos en las medidas exactas. Si el contenido no cabe, el marco sigue siendo 1440×900, 768×1024 o 390×844 y el scroll se muestra dentro. Repetir vacío, carga y error al menos en listado, asignar y la toma del candidato.
10. Alinear pastillas y cifras entre medidas (Análisis 81 en todos lados; Sofía «No iniciada» o «Asignada», una sola etiqueta). Reservar baterías para cuando el flujo individual esté cerrado, o redibujarlas como grupo de pruebas publicadas.
11. Sustituir `#9CA39C` y los grises Tailwind por `#75767A` / `#57585B`. Wordmark en Manrope. Tarjetas con el blanco translúcido del cristal (`rgba(255, 255, 255, 0.72)`), no blanco plano. Subir controles móviles a 44 px.

## Fuera de esta auditoría

No se implementó Portal Pruebas, no se editó `portal-pruebas.pen` y no se contrastó el lienzo contra una sesión autenticada del producto en el navegador. La comparación visual usa los tokens y el shell ya documentados en el frontend.
