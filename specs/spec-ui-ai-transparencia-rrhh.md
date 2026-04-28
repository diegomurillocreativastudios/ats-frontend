# Especificacion: transparencia de uso de IA en flujos rrhh

## Objetivo

Hacer explicito en la UI cuando una accion usa IA, que resultado genera y en que estado esta el procesamiento, en tres flujos clave del portal RRHH:

1. Añadir candidatos (procesamiento de CVs desde modal de añadir candidato)
2. Busqueda preliminar de candidatos en vacante
3. Analisis preliminar de candidatos en vacante

La meta es mejorar transparencia, confianza y comprension operativa sin cambiar la logica de negocio existente.

## Contexto

Actualmente el sistema ejecuta capacidades asistidas por IA en distintas partes del flujo de reclutamiento, pero la señal en interfaz puede percibirse como implicita o insuficiente.

Este spec define lineamientos de producto y UX para:

- visibilizar de forma consistente el uso de IA
- comunicar estado de ejecucion
- aclarar si un resultado es sugerencia automatizada o dato final
- mantener trazabilidad de acciones para el reclutador

## Alcance

### En alcance

- Copys, etiquetas y componentes visuales para indicar uso de IA
- Estados de UI para ejecucion IA: pendiente, en proceso, completado, error
- Mensajes orientados a expectativa real de tiempos y calidad
- Integracion visual en los 3 flujos especificados
- Criterios de aceptacion funcionales y de UX

### Fuera de alcance

- Rediseño total de los modulos de vacantes o candidatos
- Cambios de contratos backend no necesarios para UI
- Nuevos modelos de IA o cambio de proveedor
- Alteraciones de scoring o matching fuera de etiquetado/transparencia

## Principios UX de transparencia IA

1. Claridad: decir explicitamente "IA" en zonas donde participa
2. Contexto: explicar en una frase que hace la IA en ese paso
3. Estado visible: reflejar progreso y resultado sin ambiguedad
4. Control humano: indicar que RRHH revisa/valida decision final
5. Consistencia: mismo patron visual y tono en los tres flujos

## Propuesta UI transversal

### Elementos comunes

- Badge estandar: `Asistido por IA`
- Tooltip o texto de apoyo corto: `Este resultado se genero con IA y requiere validacion humana`
- Icono contextual de IA (mismo icono y color en todo el portal)
- Estado de proceso:
  - `Procesando con IA...`
  - `IA completada`
  - `No se pudo completar el proceso con IA`

### Componente recomendado

Crear/reutilizar un componente comun (nombre orientativo):

- `AiDisclosureBadge`
- `AiProcessingStatus`
- `AiResultNotice`

Esto reduce duplicacion y garantiza consistencia entre modales, tabla/listado y paneles de analisis.

## Flujo 1: Añadir candidatos (modal añadir candidato)

## Objetivo del flujo

Dejar explicito que al subir CVs, el sistema usa IA para extraer, normalizar o preclasificar informacion del candidato.

## Requerimientos UI

1. En el modal de añadir candidato, mostrar de forma visible antes de confirmar:
  - Badge `Asistido por IA`
  - Mensaje: `Los CVs se procesaran con IA para extraer informacion preliminar del perfil`
2. Al iniciar carga/procesamiento:
  - Estado: `Procesando CVs con IA...`
  - Indicador de progreso visual (spinner o barra)
3. Al finalizar:
  - Exito: `Procesamiento con IA completado. Revisa y valida la informacion antes de continuar`
  - Error parcial o total: `No se pudo completar el procesamiento con IA para uno o mas CVs`
4. Debe existir una accion clara posterior al resultado:
  - revisar candidatos cargados
  - reintentar procesamiento si aplica

## Criterios de aceptacion flujo 1

- El modal muestra de forma explicita que usa IA antes de enviar CVs
- Durante el procesamiento existe feedback visible de estado
- El resultado final distingue exito vs error
- La UI comunica validacion humana posterior

## Flujo 2: Busqueda preliminar de candidatos en vacante

## Objetivo del flujo

Hacer transparente que los resultados preliminares pueden estar priorizados o enriquecidos por IA para acelerar la exploracion inicial.

## Requerimientos UI

1. En la cabecera de resultados preliminares:
  - Badge `Busqueda asistida por IA`
  - Texto corto: `La IA prioriza coincidencias iniciales segun la vacante`
2. En cada candidato (lista/tabla/card), incluir una marca contextual cuando aplique:
  - `Coincidencia preliminar IA`
3. Mostrar estado cuando se recalculan resultados:
  - `Actualizando busqueda con IA...`
4. Si no hay resultados suficientes o falla IA:
  - Mensaje claro sin bloquear el flujo manual:
  - `No se pudo completar la priorizacion por IA. Puedes continuar con filtros manuales`

## Criterios de aceptacion flujo 2

- La vista de busqueda preliminar identifica explicitamente uso de IA
- Los candidatos priorizados por IA quedan identificados en UI
- Existe estado visual de recarga/reproceso IA cuando aplique
- Ante error IA, el reclutador puede continuar flujo manual

## Flujo 3: Analisis preliminar de candidatos en vacante

## Objetivo del flujo

Mostrar claramente que el analisis mostrado es una evaluacion preliminar generada por IA y no una decision final automatica.

## Requerimientos UI

1. Encabezado del bloque de analisis:
  - Badge `Analisis preliminar IA`
  - Texto: `Este analisis es una sugerencia automatizada y debe ser validada por RRHH`
2. Si hay score, resumen o fortalezas/debilidades:
  - Etiquetar cada bloque con contexto IA (por ejemplo: `Resumen IA`, `Score IA preliminar`)
3. Mostrar fecha/hora de generacion del analisis IA cuando exista ese dato
4. Accion de control humano visible:
  - `Validar analisis`
  - `Descartar sugerencia IA`
5. Estado de reproceso:
  - `Reanalizando con IA...`

## Criterios de aceptacion flujo 3

- El bloque de analisis indica explicitamente su origen en IA
- El usuario diferencia analisis preliminar vs decision humana
- Los subcomponentes de analisis mantienen etiquetado consistente
- Hay accion explicita para validar o descartar sugerencia IA

## Copy sugerido (base)

Mensajes recomendados para mantener consistencia:

- `Asistido por IA`
- `Busqueda asistida por IA`
- `Analisis preliminar IA`
- `Procesando con IA...`
- `Resultado generado por IA. Requiere validacion de RRHH`
- `No se pudo completar el proceso con IA. Puedes continuar manualmente`

Nota: ajustar tono final segun guia editorial de producto.

## Accesibilidad

- Los badges y estados IA no deben depender solo de color
- Incluir texto legible para lectores de pantalla en iconos de IA
- Mensajes de estado deben anunciarse con regiones `aria-live` cuando cambian
- Mantener contraste y jerarquia visual en estados de exito/error/proceso

## Analitica recomendada

Eventos sugeridos para medir adopcion y claridad:

- `ai_disclosure_viewed` (por flujo)
- `ai_processing_started`
- `ai_processing_completed`
- `ai_processing_failed`
- `ai_result_validated_by_user`
- `ai_result_dismissed_by_user`

Esto permite correlacionar transparencia con conversion y confianza operativa.

## Riesgos y mitigaciones

- Riesgo: sobrecarga visual por exceso de etiquetas IA
  - Mitigacion: usar jerarquia clara y un patron compacto
- Riesgo: interpretacion de IA como decision final automatica
  - Mitigacion: copy explicito de validacion humana obligatoria
- Riesgo: percepcion de lentitud en procesamiento
  - Mitigacion: estados de progreso y mensajes de expectativa realista

## QA no regresion

### Caso 1 - CVs en modal

1. Abrir modal añadir candidato
2. Verificar presencia de disclaimer IA antes de enviar
3. Subir CV(s) y confirmar
4. Validar estado de proceso y resultado final

Resultado esperado: transparencia IA visible en todo el flujo

### Caso 2 - Busqueda preliminar en vacante

1. Ingresar a vacante con candidatos
2. Ejecutar o refrescar busqueda preliminar
3. Verificar badge IA en cabecera y marcadores por candidato

Resultado esperado: origen IA visible y fallback manual en error

### Caso 3 - Analisis preliminar en vacante

1. Abrir bloque de analisis preliminar
2. Verificar etiqueta de origen IA en encabezado y subbloques
3. Validar acciones de control humano (validar/descartar)

Resultado esperado: analisis IA entendido como sugerencia, no dictamen final

## Entregables de implementacion

- Spec aprobado por producto/diseno/engineering
- Ajuste de componentes UI de disclosure IA en los 3 flujos
- Cobertura E2E minima de presencia de labels y estados principales
- Validacion de copy final con equipo de producto

## KPIs de eficiencia para RRHH

Esta seccion define como mostrar impacto real del ATS en UI y en presentaciones comerciales, usando metricas claras, auditables y comparables.

### KPI 1 - Tiempo de desglose de CV

- Definicion: tiempo para convertir un CV en datos estructurados listos para uso en el ATS
- Baseline manual actual: `15 minutos por CV`
- Con ATS (IA): `30 segundos a 1 minuto por CV`
- Mejora esperada: `~15x a 30x mas rapido`
- Formula:
  - `Mejora x = tiempo_manual_segundos / tiempo_ats_segundos`
  - `Ahorro % = (1 - tiempo_ats_segundos / tiempo_manual_segundos) * 100`

Copy recomendado en UI:

- `Procesamiento de CV: de 15 min a 30s-1min por candidato`
- `Ahorro estimado: 93.3% - 96.7% del tiempo operativo en esta tarea`

### KPI 2 - Precision de matching preliminar

- Definicion: porcentaje de coincidencias preliminares que RRHH considera correctas o utiles
- Estado reportado actual: `75% - 80%` (fase de entrenamiento)
- Objetivo de presentacion sugerido: `90%` (solo como meta, no como valor historico validado)

Regla de comunicacion:

- Si no hay validacion estadistica cerrada, mostrar:
  - `Precision actual observada: 75% - 80%`
  - `Meta de entrenamiento: 90%`
- Evitar afirmar `90% actual` hasta tener evidencia consistente por periodo definido

Copy recomendado en UI:

- `Matching IA en mejora continua`
- `Precision observada: 75% - 80% | Objetivo: 90%`

### KPI 3 - Tiempo de preseleccion inicial

- Definicion: tiempo para obtener shortlist preliminar de candidatos por vacante
- Proceso manual estimado: `2 horas a 1 dia` segun complejidad
- Con ATS (etapa preliminar): `5 segundos`
- Mensaje de impacto: aceleracion drastica de la primera criba

Copy recomendado en UI:

- `Preseleccion inicial: de horas a segundos`
- `Shortlist preliminar en ~5 segundos`

### KPI 4 - Velocidad de desarrollo del producto

- Definicion: factor de aceleracion del ciclo de desarrollo del proyecto
- Dato preliminar: `3x mas rapido con enfoque de desarrollo asistido`
- Estado: pendiente de validacion final con stakeholder tecnico

Regla de comunicacion:

- Mostrar como dato preliminar hasta cerrar validacion:
  - `Aceleracion del desarrollo (preliminar): 3x`

## Donde mostrar estos KPIs en producto

### 1) Header del dashboard RRHH

Tarjetas compactas de impacto:

- `Tiempo de desglose CV`
- `Tiempo de preseleccion`
- `Precision de matching`
- `Candidatos procesados con IA`

### 2) Dentro de cada flujo IA

- Modal añadir candidato: KPI puntual de procesamiento CV
- Busqueda preliminar: KPI puntual de matching
- Analisis preliminar: KPI puntual de tiempo de shortlist y tasa de validacion humana

### 3) Panel "Impacto IA" para demo ejecutiva

Vista consolidada (mensual/semanal) con:

- comparativo antes vs ATS
- tendencia de precision
- volumen procesado
- tiempo total ahorrado por equipo RRHH

## Definiciones operativas para que los KPIs sean confiables

- Definir periodo de medicion fijo (por ejemplo, ultimos 30 dias)
- Definir muestra minima (cantidad minima de CVs y vacantes)
- Registrar fuente de dato por KPI (telemetria ATS + validacion RRHH)
- Separar valores `observados` vs `objetivo`
- Mostrar fecha de ultima actualizacion del KPI en la UI

## Nuevos eventos de analitica sugeridos

- `kpi_cv_parse_duration_recorded`
- `kpi_matching_precision_recorded`
- `kpi_shortlist_time_recorded`
- `kpi_dashboard_viewed`

## Criterios de aceptacion de KPIs en UI

- Existe bloque visual de KPIs en al menos una vista de RRHH
- Cada KPI tiene definicion y unidad clara (segundos, porcentaje, factor x)
- Se distingue `valor actual` de `meta`
- Se muestra fecha de actualizacion del dato
- Los copys no sobreprometen valores no validados

## Nota final

Este spec busca hacer visible, comprensible y confiable la participacion de IA dentro del flujo RRHH, manteniendo al reclutador como decisor final y mejorando la trazabilidad de la experiencia.