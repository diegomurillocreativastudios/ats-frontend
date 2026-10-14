# PortalPruebasFrontendUITodo.md

> **Producto:** ApplicanTree — Portal Pruebas  
> **Repositorio objetivo:** `ats-frontend`  
> **Fecha:** 2026-10-13  
> **Estado:** Plan de trabajo; **Fase UI-00–UI-11 completadas** (kit + mocks + shell + dashboard + evaluaciones + editor/wizard + banco de preguntas + vinculaciones + asignaciones + seguimiento + experiencia candidato demo + cola de revisión manual).  
> **Objetivo:** implementar **toda la UI navegable y responsive** del Portal Pruebas a partir de `design/portal-pruebas.pen`, usando mocks tipados y sin conexiones reales al backend.  
> **Documento hermano:** `PortalPruebasTodo.md` (backend .NET). **La integración real se planificará en otro ToDo.**

## 0. Reglas y decisiones cerradas

- [x] **Portal Pruebas forma parte de ApplicanTree**, no es una app separada.
- [x] **Evalart no forma parte del nuevo producto**; no introducir referencias, servicios, enlaces ni copys de Evalart.
- [x] **Separar UI e integración:** este documento se limita al frontend y a datos simulados.
- [x] **Motor propio, dos categorías:** técnicas y psicométricas; interfaces diferenciadas cuando sea necesario.
- [x] **Flujo obligatorio:** crear prueba → seleccionar tipo → configurar preguntas y parámetros → guardar borrador/publicar versión → vincular con vacante → elegir postulaciones activas **de esa vacante** → asignar → resolver → revisar/calificar → resultados.
- [x] Vincular prueba ≠ asignarla; no se asigna automáticamente a candidatos por el mero vínculo.
- [x] Solo candidatos con `Application` activa en la `Vacancy` asociada serán elegibles en mocks; el backend validará obligatoriamente en la integración real.
- [x] No mezclar resultados de pruebas con `Application.MatchScore` ni presentar rasgos psicométricos como ranking o decisión automática de contratación.
- [x] **Baterías**: fase de UI opcional/post-MVP, salvo que se apruebe su inclusión; son **grupos de pruebas publicadas**, nunca grupos de preguntas.
- [x] **Diseño Pen.dev es referencia visual**, no fuente de reglas de seguridad o contrato de API. Ante contradicciones, prevalece `PortalPruebasTodo.md` y las decisiones de negocio aprobadas.

### Fuera de alcance — prohibiciones expresas

- [ ] **NO** modificar `ats-backend`, entidades .NET, PostgreSQL, migraciones ni configuración de infraestructura.
- [ ] **NO** consumir endpoints reales, `/api/bff`, `fetch` hacia servidor, ni crear adaptadores HTTP operativos para Portal Pruebas en esta etapa.
- [ ] **NO** enviar emails, programar Hangfire, generar PDFs persistidos en GCS ni recalcular `MatchScore`.
- [ ] **NO** inventar seguridad real: guards existentes se respetan; el mock de elegibilidad no sustituye autorización de backend.
- [ ] **NO** introducir un nuevo sistema visual, nuevas librerías de estado o nuevas dependencias sin justificación técnica explícita.
- [ ] **NO** suponer que los estados de UI equivalen a persistencia real. Mostrar indicación discreta de **modo demostración** en superficies administrativas de pruebas.

## 1. Base técnica y visual verificada

- Stack: **Next.js 16.3.4 / App Router, React 19.2.3, TypeScript, Tailwind CSS 4, next-intl, lucide-react, Recharts**.
- Arquitectura UI: páginas de `app/`, componentes por dominio en `components/`, hooks en `hooks/`, acceso a API en `lib/api/` (no usar API de pruebas ahora).
- App existente usa `proxy.ts`, guards server-side, portal selection, namespaces en `messages/{es,en,it,de,fr}.json`.
- Identidad ApplicanTree: **Apple Glass**, Inter cuerpo, Manrope encabezados, Fraunces solo donde ya corresponda; no reinterpretar logo.
- Tokens de referencia: `--color-green-primary: #6EB940`, `--color-green-light: #549E3C`, `--color-green-dark: #337C37`, `--color-text-gray: #57585B`, `--background: #F4F7F2`, `--ats-arena: #E8F5E0`.
- Reutilizar clases `glass-*`, `PortalSidebarFrame`, topbar, `PortalNavDrawer`, `PortalPageHeader`, `Button`, `Input`, `Modal`, `Snackbar`, `ResponsiveFilters`, `ListPaginationBar`.
- **Responsive mobile-first:** Sidebar fija 260 px en `lg` (≥1024); tablet 768–1023 utiliza topbar y drawer; mobile <768 se apila.
- Diseños de revisión: Desktop **1440×900**, Tablet **768×1024**, Mobile **390×844**; prueba adicional a **320 px**. El alto es **viewport de referencia**, no límite de altura de contenido: permitir scroll correctamente.
- Auditoría de diseño detectó: editor incompleto, estados de pruebas mezclados con asignaciones, flujo de envío inexistente, variantes responsive faltantes, revisión manual faltante, incoherencia en baterías, inconsistencias de datos/contraste. **No replicar esos defectos desde Pen.dev**: usar la versión final revisada e implementar comportamientos faltantes en UI si aún hicieran falta.

**Archivos a inspeccionar antes de editar:**

```text
app/globals.css
lib/app-brand.ts
lib/brand-colors.ts
lib/portal-access.ts
lib/roles.ts
lib/server-session-user.ts
lib/auth/public-paths.ts
components/navigation/
components/ui/
components/rrhh/rrhh-portal-shell.tsx
components/portal-admin/PortalAdminShell.tsx
components/rrhh/RRHHSidebar.tsx
messages/es.json (y en/it/de/fr)
.cursor/rules/frontend-architecture.mdc
.cursor/rules/ux-ui-design.mdc
design/portal-pruebas.pen
```

## 2. Estructura propuesta — adaptar a convenciones existentes

```text
app/portal-pruebas/
  layout.tsx
  page.tsx                           # Dashboard
  evaluaciones/page.tsx
  evaluaciones/nueva/page.tsx
  evaluaciones/[testId]/page.tsx
  evaluaciones/[testId]/editar/page.tsx
  evaluaciones/[testId]/versiones/page.tsx
  preguntas/page.tsx
  preguntas/nueva/page.tsx
  preguntas/[questionId]/editar/page.tsx
  vinculaciones/page.tsx
  asignaciones/page.tsx
  asignaciones/nueva/page.tsx
  seguimiento/page.tsx
  revision/page.tsx
  revision/[assignmentId]/page.tsx
  resultados/page.tsx
  resultados/[assignmentId]/page.tsx
  reportes/page.tsx
  baterias/page.tsx                   # Solo si se activa fase opcional

# Experiencia del candidato: ruta pública segura futura; ahora DEMO local.
app/pruebas/[demoToken]/page.tsx      # bienvenida / resolver / envío / estados

components/pruebas/
  layout/ dashboard/ evaluations/ questions/ vacancies/
  assignments/ sessions/ review/ results/ reports/ candidate/ shared/

lib/pruebas/
  types.ts                           # Interfaces y discriminated unions
  mock-fixtures.ts                   # Datos de prueba deterministas
  mock-service.ts                    # Funciones async simuladas, sin red
  mock-store.ts                      # Estado local para demo
  eligibility.ts                     # SOLO simulación UI
  formatters.ts
hooks/pruebas/
```

> Las rutas son sugerencias; confirmar nombres y anidación con la estructura real. No crear un nuevo `lib/api` de backend ni romper `lib/api.ts`. La experiencia de candidato necesita, en la integración real, una decisión explícita sobre enlace firmado, guest route y reglas de `proxy.ts`; por ahora emplear una ruta marcada como **demo** y sin relajar protecciones globales.

## 3. Contrato de datos simulados (fase UI)

### 3.1 Entidades tipadas mínimas

- [x] `MockCompany { id, name }`.
- [x] `MockVacancy { id, companyId, title, status, isDone, isDeleted }`.
- [x] `MockCandidateProfile { id, fullName, email }`.
- [x] `MockApplication { id, candidateProfileId, vacancyId, stage, status, isActive }`.
- [x] `MockAssessmentTest { id, companyId?, title, description, kind, lifecycleStatus, draftVersion, createdAt }`.
- [x] `MockAssessmentVersion { id, testId, versionNumber, instructions, durationMinutes, maxAttempts, publishedAt?, questionIds[] }`.
- [x] `MockQuestion` unión discriminada: opción única, múltiple, verdadero/falso, Likert, numérica y abierta; configuración de scoring específica por tipo.
- [x] `MockAssessmentLink { id, vacancyId, testVersionId, active }`.
- [x] `MockAssignment { id, applicationId, testVersionId, status, assignedAt, expiresAt, allowedAttempts }`.
- [x] `MockSession { id, assignmentId, attemptNumber, startedAt, deadlineAt, status, answers }`.
- [x] `MockResult { id, assignmentId, score?, maxScore?, categoryScores?, dimensionScores?, reviewStatus }`.
- [x] `MockReview { assignmentId, questionId, rubric, reviewerNotes?, pointsAwarded?, status }`.

### 3.2 Reglas simuladas y consistencia

- [x] Configurar fixtures **deterministas** y coherentes entre pantallas: mismas vacantes, nombres, cantidad de preguntas, puntuaciones y estados en los tres tamaños.
- [x] Publicación = snapshot/version publicada inmutable **en mock**; editar una prueba publicada crea un nuevo borrador/versión.
- [x] Distinguir `test.lifecycleStatus` (`draft | published | archived`) de `assignment.status` (`pending | in_progress | completed | expired | cancelled`, con revisión/calificación aparte).
- [x] Listar candidatos elegibles **solo** desde `MockApplication` con vacante correcta, postulación activa, estado no final, vacante vigente y versión vinculada activa.
- [ ] Mostrar errores simulados para vacante cerrada, postulación cerrada, test archivado, duplicados, expiración e intentos agotados. *(UI-01: códigos tipados en `eligibility` / `mock-service`; pantallas en fases posteriores.)*
- [x] Utilizar IDs estables; no depender de aleatoriedad para snapshots de diseño/tests.
- [x] Implementar un **mock-service asíncrono** (promesas resueltas localmente con latencia configurable) con operaciones de listado, creación, edición, publicación, vínculo, asignación, sesiones, revisión y resultados.
- [x] Centralizar todo acceso a datos de demo en `mock-service` para permitir reemplazo posterior por repositorios/servicios HTTP **sin reescribir componentes de presentación**.
- [x] Preferir estado de memoria o provider local; si se usa `localStorage`, aislarlo a demo, versionar esquema y ofrecer "Restablecer datos de demostración". Nunca almacenar tokens reales ni datos sensibles. *(UI-01: memoria + `resetMockStore`; sin `localStorage`.)*
- [x] Manejar loading/empty/error mediante escenarios simulados con UI visible y accesible. *(Escenarios en servicio + `EmptyState` / `ErrorState` / `LoadingSkeleton`; cableado a páginas en UI-02+.)*

---

## 4. Fases de implementación UI — ejecutar en orden

### Fase UI-00 — Preparación y baseline

- [x] Abrir e inspeccionar `design/portal-pruebas.pen` y auditorías; registrar discrepancias de la última versión. 2026-10-13: lienzo abierto en Pencil (solo lectura). Auditorías: `PortalPruebasDesignAudit.md`, `PortalPruebasDesignCorrections.md`. Flujo recorrido: Crear → Publicar → Vincular → Asignar → Resolver → Seguimiento → Revisión.
- [x] Leer reglas Cursor `.mdc`, `package.json`, `app/globals.css`, layouts y componentes reales; inventariar reutilización.
- [x] Confirmar rutas objetivo, nombres y pantalla de entrada.
- [x] Establecer convención de nombres kebab-case, exports nombrados, Server Components por defecto; `use client` solo cuando haya interacción.
- [x] Revisar que `npm run qa` y tests actuales están en verde **antes** de iniciar cambios. 2026-10-13: lint 0 errores (64 avisos previos), Vitest 265 archivos / 1573 pruebas, cspell 0 problemas.
- [x] Acordar alcance de baterías como opcional y experiencia de candidato como demo. Baterías quedan en UI-14. `/pruebas/[demoToken]` no entra en rutas públicas.

**Discrepancias del lienzo** (frente a `PortalPruebasDesignCorrections.md`; no se reabren hallazgos ya corregidos):

- Responsive T/M: hay marcos en 768×1024 y 390×844 para listado, crear, publicar, vincular, asignar, seguimiento, resultados, baterías y reportes; varias siguen el layout de escritorio recortado (pendiente 1 confirmado).
- Editor en móvil: «Crear preguntas técnica/psico — Mobile» mantiene lista de 12 + panel de detalle; no hay patrón apilado (pendiente 2 confirmado).
- Empresa dueña: no aparece en Crear tipo ni Publicar; solo el filtro «Empresa» / «Empresa según tu acceso» del dashboard (pendiente 3 confirmado; no se decide si entra al producto).
- Grises residuales: siguen `#9CA39C`, `#6B7280` y `#F3F4F6` en pastillas/dona (pendiente 4 confirmado).
- Toques 44 px: en listado móvil, pestañas ~31 px y «Filtros» ~36 px (pendiente 5 confirmado).
- Exportar: hay «Exportar PDF/CSV» en Reportes; no hay diálogo de confirmación. El gráfico del dashboard sigue con «Cierra en 18 completadas el día 14» sin leyenda clara (pendiente 6 confirmado).
- Verificación visual frame a frame: no se hizo captura individual de todo el inventario en esta pasada (pendiente 7 sigue abierto).
- Navegación del shell en lienzo: Dashboard · Evaluaciones · Seguimiento · Resultados. El ToDo pide además Banco, Vinculaciones, Asignaciones, Revisión y Reportes en sidebar (agrupar en UI-02).
- Pantallas del ToDo sin marco dedicado: detalle de evaluación (`/evaluaciones/[testId]`), editores de banco (`/preguntas/nueva` y `/preguntas/[questionId]/editar` más allá del tab Banco). Revisión cola/detalle solo en escritorio (sin T/M). Dashboard carga/vacío/error solo escritorio. No hay marcos a 320 px.
- Corregido y presente en lienzo (no reabrir): editor técnico/psicométrico, publicar v1, vincular activo/inactivo, asignar elegibles + lote, envío del candidato, seguimiento con reintento, revisión manual D, drawer T/M, baterías como grupos de pruebas.

**Mapa confirmado**

- Sección 2 vigente, sin cambios de nombre. Entrada: `/portal-pruebas` (dashboard).
- Carpetas: `lib/pruebas/`, `components/pruebas/shared/` (UI-01) y `app/portal-pruebas/` + `components/pruebas/layout/` (UI-02). Pendientes: `hooks/pruebas/`, demo `app/pruebas/[demoToken]/`.
- `pruebas` está en `PORTAL_KEYS` con home `/portal-pruebas` (UI-02); accesible a reclutador y administración.
- Baterías: ruta `baterias/` solo si se activa UI-14.

**Entregable:** mapa de rutas/componentes y lista de archivos a crear.  
**Criterio de aceptación:** no se toca backend, no se introduce API real, se identifican componentes reutilizables.

### Fase UI-01 — Design system y mocks

- [x] Crear tipos y fixtures de dominio de UI. 2026-10-13: `lib/pruebas/types.ts`, `mock-fixtures.ts` (MOCK_NOW, 6 preguntas técnicas, Análisis = 81).
- [x] Crear `mock-service` y control de escenarios: poblado/vacío/error/cargando. `mock-store.ts` + `mock-service.ts`; publicar congela; editar clona; asignar todo-o-nada.
- [x] Crear utilidades de formato de fecha, duración, puntuaciones y estados. `formatters.ts` (sin frases de producto / sin next-intl).
- [x] Crear `AssessmentStatusBadge`, `AssessmentTypeBadge`, `AssessmentCard`, `MockDemoNotice`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, `ConfirmDialog` reutilizando `components/ui`. Solo `ConfirmDialog` es cliente.
- [x] Revisar consistencia tipográfica Inter / Manrope, tokens verdes y glass real. `font-sans` / `font-display`, `glass-card`, verdes de marca.
- [x] Verificar contraste de texto y botones; evitar grises hardcodeados de bajo contraste. Sin `#9CA39C` / `#6B7280` / `#F3F4F6`; pastillas con `text-emerald-900` / `text-foreground`.
- [x] Preparar diagramas/semántica de estados sin mezclar evaluación con asignación. Uniones tipadas + `AssessmentStatusBadge` solo `draft | published | archived`.

**Entregable:** kit UI y servicios simulados tipados.  
**Criterio:** ningún componente visual depende de una API; variantes consistentes y accesibles.

### Fase UI-02 — Portal, layout, navegación e i18n

- [x] Crear `app/portal-pruebas/layout.tsx` y shell reutilizando patrones actuales de RRHH/Admin. 2026-10-13: `PruebasPortalShell` + `requirePortalRecruiterUser`.
- [x] Sidebar con Dashboard, Evaluaciones, Banco de preguntas, Vinculaciones, Asignaciones, Seguimiento, Revisión, Resultados y Reportes (agrupar lógicamente para evitar saturación). Grupos: Inicio / Contenido / Operación / Cierre.
- [x] Topbar con breadcrumbs reales, cuenta, branding y selector de idioma.
- [x] Drawer abierto/cerrado para Tablet y Mobile, foco/escape/cierre y overlay. Reutiliza `PortalNavDrawer`.
- [x] Integrar Portal Pruebas a selección de portales y navegación de regreso sin otorgar permisos nuevos por accidente. Clave `pruebas` solo reclutador/admin.
- [x] Reutilizar guard server-side para **roles existentes Recruiter/Admin**; permisos finos se implementarán en plan de conexión cuando backend los soporte.
- [x] Definir `PortalKey` y `PORTAL_HOME_HREF` coherentemente con `lib/portal-access.ts`.
- [x] Crear namespace `PruebasPortal` y copy real en `es/en/it/de/fr`; no hardcodear UI.
- [x] Añadir metadata traducida y textos en navegación / selector.
- [x] Añadir indicador `Demostración — datos simulados` visible sin obstaculizar trabajo. `MockDemoNotice` en el shell.
- [x] Confirmar navegación keyboard y responsive 320/390/768/1024/1440. Mismo chrome que RRHH/Admin; verificación visual completa en fases de producto.

**Entregable:** portal accesible a staff autorizado con shell y rutas placeholder navegables.  
**Criterio:** mantiene seguridad actual, no agrega acceso público no protegido por accidente.

### Fase UI-03 — Dashboard completo

- [x] Métricas: asignadas, pendientes, en progreso, completadas, vencidas y pendientes de revisión. 2026-10-13: `buildDashboard` + tarjetas; seed 3/1/0/1/1/0.
- [x] Acciones rápidas: crear evaluación, vincular, asignar, revisar resultados. Enlaces a secciones existentes (evaluaciones, vinculaciones, asignaciones, resultados).
- [x] Filtros por empresa permitida en demo, vacante, categoría, estado y fechas. `ResponsiveFilters` + recálculo en memoria.
- [x] Gráfica de actividad con Recharts, leyendas y etiquetas claras. Serie «Asignadas» por día UTC + resumen sr-only.
- [x] Distribución por estados (distinguir estados de asignación frente a prueba). Dona solo de `AssignmentStatus`.
- [x] Sección "Necesitan atención": próximas a vencer, revisión manual y fallos de demo. Ventana 14 días; revisión vía `reviewStatus`.
- [x] Actividad reciente con acción que lleva al detalle correspondiente. Completadas → resultados; resto → seguimiento.
- [x] Variantes loading / vacío / error + responsive real. Escenarios mock + vacío local de filtros; chrome responsive del shell.

**Criterio:** dashboard coherente con fixtures; filtros actualizan números y listados simulados.

### Fase UI-04 — Evaluaciones: listado, detalle y ciclo de vida

- [x] `/evaluaciones`: tabla Desktop; tarjetas o presentación adaptada en Mobile; búsqueda, filtros y paginación local. 2026-10-13: `PruebasEvaluationsList` + `lib/pruebas/evaluations.ts`.
- [x] Estados de prueba únicamente: Borrador, Publicada, Archivada.
- [x] Acciones según estado: ver, editar borrador, duplicar, publicar, archivar y consultar versiones. Matriz en `EVALUATION_ACTIONS_BY_STATUS`; `duplicateTest` en mock-service.
- [x] `/evaluaciones/[testId]`: resumen, configuración, preguntas y vínculos; botón para vincular vacante (solo publicadas → `/vinculaciones`).
- [x] `/evaluaciones/[testId]/versiones`: historial simulado de versiones y vista de snapshot publicado (solo lectura).
- [x] Confirmar publicación/archivo con diálogo; mostrar Snackbar de demo.
- [x] Pantallas loading, vacío, error y entidad inexistente.
- [x] Desktop, Tablet, Mobile, incluyendo listado largo y menú de acciones. Tabla `lg+`, tarjetas por debajo; placeholders `nueva` y `editar` para UI-05.

**Criterio:** cambiar estado en mock actualiza las vistas relacionadas sin contradicciones.

### Fase UI-05 — Editor/wizard de evaluación

- [x] `/evaluaciones/nueva` y `/evaluaciones/[testId]/editar` con stepper adaptativo: Información → Configuración → Preguntas → Vista previa → Publicación. 2026-10-13: `PruebasEvaluationEditor` + `lib/pruebas/evaluation-editor.ts`.
- [x] Campos: nombre, descripción, tipo técnica/psicométrica, categoría, instrucciones, duración, intentos y política de caducidad visual. Tipo = categoría; caducidad = aviso fijo 14 días.
- [x] Validaciones client-side y mensajes accesibles por paso.
- [x] Guardar borrador, navegar atrás/adelante conservando valores y simulación de errores de guardado. Casilla «Simular fallo de guardado».
- [x] Adjuntar preguntas existentes, agregar nuevas y reordenar usando UI accesible (alternativa a drag/drop). `createCompatibleQuestion` + subir/bajar.
- [x] Puntajes técnicos y dimensión/regla del instrumento para psicométricas claramente separados. Matriz técnica vs Likert.
- [x] Vista previa candidata antes de publicación; resumen de número exacto de preguntas, duración, intentos.
- [x] Publicación muestra número de versión y aviso de snapshot inmutable; editar publicada crea borrador nuevo. Confirmación en `/editar` vía `editPublishedTest`.
- [x] Diseñar e implementar responsivo cada paso, incluidos errores y confirmaciones.

**Criterio:** es posible crear una prueba técnica y una psicométrica demostrativas completas sin salir del frontend.

### Fase UI-06 — Banco de preguntas y editor por tipo

- [x] `/preguntas`: listados, categorías, búsquedas, filtros, paginación, preview y acciones. 2026-10-13: `PruebasQuestionsList` + `lib/pruebas/question-editor.ts`.
- [x] `/preguntas/nueva` y `/preguntas/[questionId]/editar`: editor tipado según categoría. `PruebasQuestionEditor`.
- [x] Opción única: opciones + correcta + puntos.
- [x] Opción múltiple: varias correctas + regla de puntuación. Copy todo-o-nada; un solo `points`.
- [x] Verdadero/falso: respuesta correcta + puntos.
- [x] Likert: escala fija 1–5, dimensión, inversión de ítem, sin "correcta" ni puntos.
- [x] Numérica: respuesta y tolerancia simulada con aviso de demostración.
- [x] Abierta: rúbrica y puntos máximos; aviso de revisión manual posterior.
- [x] Vista previa de cada tipo como lo verá candidato. Diálogo en listado + panel en editor.
- [x] Confirmaciones al abandonar cambios y validaciones. Solo al cancelar con cambios.
- [x] Estados loading/empty/error y las tres variantes responsive. Tabla `lg+`, tarjetas por debajo.

**Criterio:** los seis editores no presentan campos incompatibles entre tipos; las preguntas sirven en wizard y demo de candidato.

### Fase UI-07 — Vincular pruebas publicadas a vacantes

- [x] `/vinculaciones`: selector de versión publicada, selector de vacante disponible y resumen de empresa. 2026-10-13: `PruebasLinksScreen` + `lib/pruebas/links.ts`.
- [x] Tabla/lista de vínculos existentes, estado activo/inactivo, fecha, acciones y desactivar sin borrar historial. `linkedAt` en mock; `setLinkActive` no borra.
- [x] Explicar claramente: **vincular no asigna, no crea postulaciones y no envía emails**.
- [x] Filtrar vacantes cerradas/no permitidas en demo; mostrar explicación de ineligibilidad.
- [x] Validar enlace duplicado, prueba sin publicar y vacante inactiva en mock. Códigos `duplicate_link`, `vacancy_closed`, `version_not_published`, `test_not_published`.
- [x] Diálogo confirmatorio de vincular/desactivar; éxito/error simulados.
- [x] Vista Desktop, Tablet y Mobile, incluidas listas y vacíos. Tabla `lg+`, tarjetas por debajo.

**Criterio:** toda asociación en la UI corresponde a una versión publicada y una vacante válida.

### Fase UI-08 — Asignación a postulaciones elegibles

- [x] `/asignaciones/nueva`: seleccionar vacante → seleccionar versión vinculada activa → consultar candidatos elegibles. 2026-10-13: `PruebasAssignmentsScreen` + `lib/pruebas/assignments.ts`; misma pantalla en `/asignaciones`.
- [x] La lista debe contener **solo `MockApplication` activas de ESA vacante**; no mostrar perfiles sin postulación en la tabla de elegibles.
- [x] Filtrar Hired/Rejected/Withdrawn/Discarded, vacante cerrada o eliminada, vínculo inactivo, intentos/duplicados según política demo.
- [x] Selección individual y múltiple, contador y vista previa de destinatarios.
- [x] Configurar vencimiento (valor demo predeterminado: 14 días, si así figura en el plan de backend), intentos y resumen de invitación **sin enviarla realmente**.
- [x] Confirmación con resumen y operación mock de lote todo-o-nada con mensaje de éxito/rechazo.
- [x] Desde detalle vacante/candidato RRHH agregar **punto de entrada visual** a asignación, sin cambiar API real ni lógica de reclutamiento.
- [x] Agregar estados de no elegibles, duplicados, ninguna postulación activa, error simulado.
- [x] Tres variantes responsive, selección y CTA visibles.

**Criterio:** ningún candidato sin postulación activa a la vacante recibe una asignación ni siquiera en demo.

### Fase UI-09 — Seguimiento, gestión de estados y reintentos

- [x] `/seguimiento`: lista de asignaciones con candidato, vacante, versión, fechas y estado. 2026-10-13: `PruebasTrackingScreen` + `lib/pruebas/tracking.ts`.
- [x] Filtros, búsqueda, paginación local, detalle en drawer/página. Detalle en `Modal` de la misma ruta.
- [x] Acciones mock según estado: cancelar, reenviar recordatorio **simulado**, ampliar plazo y autorizar reintento.
- [x] Distinguir fin de respuestas de calificación: completada, pendiente de revisión, calificada.
- [x] Registrar acciones visualmente en timeline de demo; mensajes de confirmación. `trackingEvents` en el almacén.
- [x] Estados de expiración, postulación cerrada y error de operaciones.
- [x] Responsive Desktop/Tablet/Mobile y estados de carga/vacío/error. Tabla `lg+`, tarjetas por debajo.

**Criterio:** acciones solo disponibles en estados compatibles; nunca afirmar envío de correo real.

### Fase UI-10 — Portal del candidato: experiencia de resolución

- [x] Definir ruta de demo segura **sin agregar excepción pública general en `proxy.ts`** ni simular bypass de auth. Si se requiere ruta pública futura, documentar como pendiente de integración. 2026-10-13: `/pruebas/[demoToken]` con `requirePortalRecruiterUser`; sin excepción en `public-paths`. Ruta pública firmada queda para el ToDo de integración.
- [x] Bienvenida: prueba, vacante, instrucciones, duración, privacidad y comenzar. `PruebasCandidateScreen`.
- [x] Preguntas: render de todos los tipos definidos, navegación anterior/siguiente, respuestas obligatorias según configuración, progreso y estado de guardado **local simulado**. `CandidateQuestionForm` + `saveSessionAnswers`.
- [x] Temporizador confiable en demo basado en deadline local, control de expiración y reanudación local cuando se permita. Countdown con `Date.now()`; Ana reanuda con sesión sembrada.
- [x] Última pregunta → "Enviar evaluación" → diálogo de confirmación → envío mock → finalización. `submitSession` sin `MockResult`.
- [x] Evitar mostrar soluciones, puntajes internos y resultados confidenciales al candidato.
- [x] Diseñar estados: acceso inválido, vencida, cancelada, intento agotado, postulación cerrada antes/durante, guardado fallido, sesión interrumpida y tiempo agotado. Orden fijo en `resolveCandidateDemo`; casillas de fallo de guardado y tiempo agotado.
- [x] Definir salidas seguras: "Salir" y "Volver" con destino real en demo, no rutas inexistentes. Salir → `/portal-pruebas/seguimiento`; Volver → bienvenida.
- [x] Vista sin sidebar de staff; CTA táctiles ≥44 px; WCAG focus, radio groups, keyboard.
- [x] Las tres variantes 1440×900, 768×1024, 390×844; extra a 320 px. Layout apilado bajo `lg`; mismos patrones de toque `min-h-11`.

**Criterio:** un evaluador puede recorrer de inicio a envío completo, provocar y probar estados especiales con fixtures.

### Fase UI-11 — Cola de revisión manual

- [x] `/revision`: cola de evaluaciones con respuestas abiertas pendientes, filtros y contadores. 2026-10-13: `PruebasReviewQueueScreen` + `lib/pruebas/review.ts`; cola = resultado `pending` + versión con pregunta abierta.
- [x] `/revision/[assignmentId]`: respuesta, instrucciones, rúbrica, máximo de puntos, calificación manual y observaciones. `PruebasReviewDetailScreen`.
- [x] Guardar revisión en mock; mostrar avance y finalizar revisión. `saveReviewDrafts` / `finishReview`.
- [x] Prevenir puntuaciones inválidas y mostrar confirmación de finalización. Enteros `0..maxPoints`; diálogo al finalizar.
- [x] Actualizar estados de seguimiento/resultados demo. Evento `reviewed`; enlace desde seguimiento; `submitSession` crea resultado `pending` si hay pregunta abierta.
- [x] Responsive y estados vacío/cargando/error. Tabla `lg+`, tarjetas por debajo.

**Criterio:** se pueden simular revisiones manuales coherentes sin calcularlas en backend.

### Fase UI-12 — Resultados técnicos y psicométricos

- [ ] `/resultados`: listado de resultados y filtros por vacante, candidato, tipo, fecha y estado.
- [ ] `/resultados/[assignmentId]`: detalle según evaluación técnica o psicométrica.
- [ ] Técnicos: puntuación, máximo, categorías, aciertos/errores donde proceda, tiempo, rúbrica y revisión.
- [ ] Psicométricos: dimensiones con escala claramente definida, instrumento y versión; sin semáforo de contratación, sin porcentaje de idoneidad y **sin modificar MatchScore**.
- [ ] Gráficas con Recharts; leyenda, alternativa textual y consistencia numérica entre breakpoints.
- [ ] Acción de "Ver postulación" a ubicación real (o pantalla mock indicada), retorno a RRHH.
- [ ] Casos sin resultado, pendiente de revisión, datos insuficientes y error.
- [ ] Responsive y exportación **no real** (control deshabilitado claramente o vista previa mock explícita).

**Criterio:** los resultados corresponden a la versión/answers del fixture; no afirmar decisiones automáticas de contratación.

### Fase UI-13 — Reportes y navegación desde RRHH

- [ ] `/reportes`: catálogo, filtros, listado, vista previa **con datos simulados**.
- [ ] Aplicar patrones de Reportes RRHH existentes; no generar ni subir PDFs reales.
- [ ] Botones Exportar señalizados como "Disponible al conectar backend" o generación puramente local etiquetada demo si se aprueba.
- [ ] Agregar pestaña/sección visual "Pruebas" en ficha de postulación del Portal RRHH usando datos mock; no contaminar `Application.MatchScore` ni endpoints reales.
- [ ] Añadir CTA de asignación desde vacante y ficha del candidato cuando corresponde; manejar navegación ida/vuelta.
- [ ] Reutilizar `PortalPageHeader`, breadcrumbs, filtros y páginas de carga/vacío/error.
- [ ] Responsive completo de vistas nuevas y puntos de entrada de RRHH.

**Criterio:** fluye entre RRHH y Portal Pruebas visualmente sin modificar operaciones del backend actual.

### Fase UI-14 — Baterías (OPCIONAL / posterior al MVP)

- [ ] Confirmar aprobación de alcance antes de implementar.
- [ ] `/baterias`: lista, creación y edición de **grupos de versiones publicadas de pruebas**, no preguntas.
- [ ] Orden de pruebas, duración total, reglas visuales y preview.
- [ ] Mock de asignaciones individuales por prueba de la batería, respetando elegibilidad por aplicación.
- [ ] Responsive y estados vacíos/error.

**Criterio:** no bloquear las fases obligatorias por baterías; evitar modelo incompatible con backend.

### Fase UI-15 — QA, accesibilidad y validación de experiencia

- [ ] Recorrido E2E local completo: crear → publicar → vincular → asignar → abrir enlace demo → resolver → enviar → revisar → consultar resultado.
- [ ] Comprobar rutas inexistentes, enlaces rotos, breadcrumbs, drawer y volver.
- [ ] Responsive: **320, 390, 768, 1024, 1440 px**, scroll contenido, sin overflow horizontal de página.
- [ ] WCAG: contraste AA, foco visible, labels, aria, mensajes de error, navegación teclado, `prefers-reduced-motion`, touch ≥44×44.
- [ ] Revisar textos e internacionalización en los **cinco idiomas**, incluyendo textos largos.
- [ ] Probar estados loading, empty, error, expirado, cancelado, prueba archivada y postulación finalizada.
- [ ] Pruebas unitarias Vitest para mocks, elegibilidad demo, estados, formato y componentes.
- [ ] Playwright para flujos principales y viewport responsive.
- [ ] Ejecutar `npm run qa` y gates existentes; verificar que no se ha añadido fetch ni dependencia de APIs de pruebas.
- [ ] Validar visualmente contra Pen.dev; documentar desviaciones intencionales cuando el diseño anterior contradiga negocio o accesibilidad.
- [ ] Revisión final de no referencias Evalart en **nuevas** vistas (la limpieza total existente puede ser tarea separada coordinada con backend).

**Criterio:** la demo puede presentarse de principio a fin, sin back-end de pruebas, y el sistema actual del ATS sigue funcional.

---

## 5. Matriz de rutas / vistas / responsive

| Pantalla | Ruta propuesta | Desktop | Tablet | Mobile | Estado UI |
|---|---|:---:|:---:|:---:|---|
| Portal Dashboard | `/portal-pruebas` | ☑ | ☑ | ☑ | loading/empty/error |
| Lista de evaluaciones | `/portal-pruebas/evaluaciones` | ☑ | ☑ | ☑ | loading/empty/error |
| Crear / editar (todos los pasos) | `/portal-pruebas/evaluaciones/nueva`, `/[testId]/editar` | ☑ | ☑ | ☑ | draft/validation/error |
| Detalle y versiones | `/portal-pruebas/evaluaciones/[testId]` | ☑ | ☑ | ☑ | published/archived |
| Banco preguntas | `/portal-pruebas/preguntas` | ☑ | ☑ | ☑ | loading/empty/error |
| Editores de preguntas | `/portal-pruebas/preguntas/nueva`, `/[questionId]/editar` | ☑ | ☑ | ☑ | per kind/errors |
| Vínculos con vacantes | `/portal-pruebas/vinculaciones` | ☑ | ☑ | ☑ | linked/unlinked/inactive |
| Asignación | `/portal-pruebas/asignaciones/nueva` | ☑ | ☑ | ☑ | eligible/empty/conflict/success |
| Seguimiento | `/portal-pruebas/seguimiento` | ☑ | ☑ | ☑ | statuses/actions |
| Revisión manual | `/portal-pruebas/revision/[assignmentId]` | ☑ | ☑ | ☑ | pending/reviewed |
| Resultados técnicos | `/portal-pruebas/resultados/[assignmentId]` | ☐ | ☐ | ☐ | scored/no result |
| Resultados psicométricos | `/portal-pruebas/resultados/[assignmentId]` | ☐ | ☐ | ☐ | dimensions |
| Reportes | `/portal-pruebas/reportes` | ☐ | ☐ | ☐ | loading/empty/error |
| Candidato bienvenida | `/pruebas/[demoToken]` (demo) | ☑ | ☑ | ☑ | eligible/invalid |
| Candidato resolver/enviar | `/pruebas/[demoToken]` (demo) | ☑ | ☑ | ☑ | in-progress/submit |
| Candidato finalización / bloqueos | `/pruebas/[demoToken]` (demo) | ☑ | ☑ | ☑ | done/expired/etc. |
| Baterías opcionales | `/portal-pruebas/baterias` | ☐ | ☐ | ☐ | optional |

> **Cada fila:** implementar los tres viewports, controles funcionales en modo demo y estados aplicables. Donde el diseño Pen.dev no incluyera una variante, derivarla de patrones reales de ApplicanTree, sin nuevas convenciones arbitrarias.

## 6. Estrategia de trabajo con Cursor — una fase por iteración

1. Abrir `ats-frontend` y el archivo `design/portal-pruebas.pen`.
2. Cargar este `PortalPruebasFrontendUITodo.md` como fuente de tareas, más `PortalPruebasTodo.md` para reglas de negocio.
3. Indicar a Cursor la **fase UI-NN** concreta. **No** implementar fases posteriores en la misma iteración.
4. Pedir listado de archivos creados/modificados, capturas de Desktop/Tablet/Mobile y pruebas ejecutadas.
5. Revisar visualmente el resultado, corregir desviaciones y marcar solo checkboxes realmente completados.
6. Mantener funcionando lo existente; commit pequeño por fase si el usuario lo decide.

### Prompt reutilizable de ejecución por fase

```text
Estamos implementando la UI de Portal Pruebas dentro del repositorio ats-frontend.
Lee PortalPruebasFrontendUITodo.md, design/portal-pruebas.pen y las reglas .cursor/rules.
Ejecuta EXCLUSIVAMENTE la Fase UI-XX de ese ToDo, respetando sus dependencias.

Reglas absolutas:
- Solo frontend Next.js/React/TypeScript/Tailwind y componentes existentes.
- UI navegable con mocks tipados y servicio simulado; NUNCA backend real ni /api/bff para pruebas.
- No modificar ats-backend, DB, migraciones ni servicios externos.
- Mantener diseño ApplicanTree Apple Glass, tokens y traducciones en 5 idiomas.
- Diseñar/implementar Desktop 1440x900, Tablet 768x1024, Mobile 390x844; probar 320px.
- Distinguir estado de definición de prueba vs estado de asignación.
- Solo Application activa de la vacante vinculada es elegible (simulación UI; autorización real queda pendiente).
- No agregar Evalart ni alterar MatchScore.
- Conservar pruebas/QA existentes.

Al finalizar entrega: resumen, rutas/archivos, comprobación responsive, pruebas, limitaciones mock y checkboxes completados. No avances a otra fase sin autorización.
```

## 7. Preparación obligatoria para futuro ToDo de integración (NO IMPLEMENTAR AHORA)

- [ ] Documentar mapping previsto entre tipos mock y entidades/DTOs reales .NET.
- [ ] Inventariar cada llamada esperada: pruebas, versiones, preguntas, vínculos, elegibles, asignaciones, sesiones, guardado, envío, revisión, resultados y reportes.
- [ ] Registrar estados y errores que deberá resolver backend (401/403/404/409/422/429, vencimiento, duplicado, concurrencia).
- [ ] Registrar decisiones de token firmado/guest flow, expiración, intentos y seguridad multiempresa.
- [ ] Definir sustitución por adaptadores `lib/api/pruebas-*` usando BFF same-origin y CSRF al llegar a la etapa de conexión.
- [ ] Planificar reconciliación de sesión del candidato, reintentos, tiempo de servidor y calificación persistida.
- [ ] Auditar accesos: `Recruiter/Admin`, permisos futuros y aislamiento `CompanyId` respaldado por backend.
- [ ] Planificar emails reales, archivos/PDF, métricas y auditoría.
- [ ] Crear en el futuro **otro archivo**, sugerido `PortalPruebasFrontendIntegrationTodo.md`, con endpoints, contratos, secuencia de implementación y pruebas integradas.

## 8. Definición de terminado — etapa UI

Esta etapa estará **terminada** únicamente cuando:

- [ ] Todas las fases UI obligatorias estén completadas (excepto UI-14 si se decide postergar baterías).
- [ ] Todas las rutas/pantallas exigidas existan y todas las acciones UI principales trabajen contra mocks.
- [ ] El recorrido completo del reclutador y candidato pueda demostrarse sin backend de pruebas.
- [ ] Ninguna interacción diga "correo enviado", "PDF almacenado" o "datos guardados en servidor" cuando solo sea una simulación.
- [ ] No existan rutas rotas, pantallas inaccesibles ni acciones habilitadas sin propósito.
- [ ] Se haya probado en Desktop, Tablet y Mobile, además de 320px.
- [ ] Los mensajes estén listos en cinco idiomas y el sistema de diseño corresponda a ApplicanTree.
- [ ] Pruebas automatizadas y QA del repositorio estén aprobados.
- [ ] Haya un inventario claro de contratos y funcionalidades pendientes para el **ToDo de conexión con backend**, sin intentar implementarlos prematuramente.

---

**Notas de alineación de fuentes:**
- `PortalPruebasTodo.md`: las reglas de elegibilidad y versión son fuente funcional; backend nativo sin Evalart.
- Auditoría frontend `APPLICANTTREE_FRONTEND_UI_AUDIT.md`: reutilización de shell, tokens CSS, BFF e i18n.
- Auditoría de diseño `PortalPruebasDesignAudit.md`: corregir gaps funcionales, responsive y accesibilidad al traducir Pen.dev a UI real.
- UI-01 añadió `lib/pruebas/*`, `components/pruebas/shared/*` y tests unitarios; sin rutas de producto ni BFF.
- UI-02 añadió `app/portal-pruebas/` (placeholders), `components/pruebas/layout/*`, clave `pruebas` en selección de portales e i18n; sin BFF.
- UI-03 reemplazó el placeholder del dashboard con métricas, filtros, gráficas y atención; `lib/pruebas/dashboard.ts` + `getDashboard`; sin BFF.
- UI-04 reemplazó el placeholder de evaluaciones con listado, detalle y versiones; `duplicateTest` + `lib/pruebas/evaluations.ts`; placeholders de editor para UI-05; sin BFF.
- UI-05 reemplazó placeholders de nueva/editar con el asistente de cinco pasos; `evaluation-editor.ts` + `createCompatibleQuestion`; sin BFF.
- UI-06 reemplazó el placeholder del banco con listado y editor por tipo; `question-editor.ts` + `createQuestion`/`updateQuestion`; sin BFF.
- UI-07 reemplazó el placeholder de vinculaciones con selector, tabla y activar/desactivar; `links.ts` + `createLink`/`setLinkActive`; sin BFF.
- UI-08 reemplazó el placeholder de asignaciones con selección de elegibles y lote todo-o-nada; `assignments.ts` + `assign()`; enlaces visuales desde RRHH; sin BFF.
- UI-09 reemplazó el placeholder de seguimiento con lista, detalle modal y acciones simuladas; `tracking.ts` + `trackingEvents`; sin BFF.
- UI-10 añadió `/pruebas/[demoToken]` (sesión staff, sin sidebar), `candidate-session.ts`, `saveSessionAnswers` y enlace desde seguimiento; sin excepción pública ni BFF.
- UI-11 reemplazó el placeholder de revisión con cola y ficha; `review.ts` + `saveReviewDrafts`/`finishReview`; sesión sembrada de Diego; sin BFF.
