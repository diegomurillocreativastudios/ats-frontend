# Especificación (frontend): Módulo de entrevistas — Next.js 16, React 19, Tailwind CSS v4

## Contexto

Complementa [`spec-interviews-module.md`](./spec-interviews-module.md) (backend). El frontend de reclutamiento debe permitir **agendar, listar, reprogramar y cerrar** entrevistas vinculadas a una **vacante** y un **candidato**, consumiendo los endpoints recruiter definidos allí.

La etapa de pipeline `ApplicationStage` llamada “Interview” es **independiente** del módulo de entrevistas: el UI puede mostrar entrevistas en el contexto de vacante/candidato sin forzar sincronización con el kanban (ver discusión de dominio en el backend).

## Stack y versiones objetivo

| Tecnología | Versión |
|------------|---------|
| Next.js | 16 |
| React | 19 |
| Tailwind CSS | 4 |

Los detalles de instalación y breaking changes deben contrastarse con la documentación oficial al iniciar la implementación; esta spec fija **decisiones de arquitectura UI**, no sustituye los release notes del framework.

## Navegación (Portal RRHH)

- El acceso principal a la **vista de entrevistas** es desde el **sidebar** del portal reclutador, como ítem de menú **inmediatamente debajo de «Vacantes»** (orden: Candidatos → Vacantes → **Entrevistas** → Etapas → Plantillas).
- La ruta índice del módulo es **`/portal-rrhh/entrevistas`** (hub): lista las vacantes; al pulsar **«Ver entrevistas»** en una vacante, la navegación debe ir a **`/portal-rrhh/entrevistas/<vacanteId>`** (listado y gestión de entrevistas de esa vacante).
- Alta de entrevista: **`/portal-rrhh/entrevistas/<vacanteId>/new`**.
- Detalle/edición de una entrevista concreta: **`/portal-rrhh/interviews/<interviewId>`** (p. ej. con `?vacancyId=` para breadcrumbs y resolución si el GET por id no está disponible).
- Las rutas antiguas bajo `.../vacantes/<id>/interviews` pueden redirigir a las canónicas anteriores por compatibilidad.
- Se mantienen enlaces contextuales adicionales (p. ej. desde el detalle de una vacante o del perfil de candidato) como atajos; el criterio de aceptación del MVP es que **siempre exista entrada por sidebar**.

## Objetivos (MVP UI)

- Pantallas o secciones para **listar entrevistas** filtradas por vacante y accesibles desde el detalle de candidato cuando aplique.
- **Crear entrevista** con formulario validado (candidato elegible solo si está vinculado a la vacante — el backend es la fuente de verdad; el UI debe reflejar errores claros).
- **Editar / reprogramar** entrevistas en estado no terminal (`Scheduled`).
- **Cambiar estado** (incl. cancelación vía `PATCH` con `Cancelled` según backend).
- Manejo consistente de **fechas UTC** del API y **visualización en zona horaria del usuario**.

## No objetivos (fase inicial)

- Calendario externo (Google/Outlook) y OAuth.
- Sala de videollamada embebida.
- Drag-and-drop de entrevistas en calendario mensual complejo (solo si producto lo pide después).

## Contrato con el backend (referencia)

Alinear tipos TypeScript y rutas de fetch con el backend cuando existan en Swagger/OpenAPI:

| Operación | Método y ruta (propuesta backend) |
|-----------|-------------------------------------|
| Crear | `POST /api/recruiter/vacancies/{vacancyId}/interviews` |
| Listar por vacante | `GET /api/recruiter/vacancies/{vacancyId}/interviews` |
| Listar por candidato | `GET /api/recruiter/candidates/{candidateProfileId}/interviews` |
| Actualizar | `PATCH /api/recruiter/interviews/{id}` |

Estados UI alineados al enum del backend: `Scheduled`, `Completed`, `Cancelled`, `NoShow`.

## Arquitectura Next.js 16 (App Router)

### Rutas sugeridas (frontend)

Definir bajo el segmento de app del reclutador (`/portal-rrhh/...`):

- `/portal-rrhh/entrevistas` — **hub** desde el sidebar: elección de vacante.
- `/portal-rrhh/entrevistas/[vacancyId]` — listado por vacante + acción «Nueva entrevista» (al pulsar **Ver entrevistas** en el hub, la URL debe ser exactamente **`/portal-rrhh/entrevistas/<vacanteId>`**).
- `/portal-rrhh/entrevistas/[vacancyId]/new` — formulario de alta.
- `/portal-rrhh/interviews/[interviewId]` — detalle y edición (alternativa: drawer/sheet desde el listado).

Si el producto prioriza el contexto **candidato**:

- `.../candidates/[candidateProfileId]/interviews` — timeline de entrevistas del candidato (consumiendo GET por candidato).

**Recomendación:** el **punto de entrada principal** es el ítem **Entrevistas** en el sidebar (debajo de Vacantes) → hub (`/portal-rrhh/entrevistas`) → **`/portal-rrhh/entrevistas/<vacanteId>`**. Complementar con enlaces desde el perfil de candidato cuando aplique.

### Server vs Client Components

- **Server Components** por defecto para layouts y páginas que solo listan datos con credenciales en servidor (cookies/headers), cuando el patrón del proyecto ya use data fetching en servidor.
- **Client Components** donde haya formularios interactivos, selectores de fecha/hora, filtros (`status`, `fromUtc`, `toUtc`) y toasts.

Evitar mezclar en un solo archivo lógica de servidor y widgets interactivos sin límites claros; extraer formularios a `*.tsx` con `"use client"`.

### Data fetching y errores

- Centralizar llamadas al API en un módulo `lib/api/interviews.ts` (o convención existente) con funciones tipadas `getInterviewsByVacancy`, `createInterview`, `patchInterview`, etc.
- Mapear códigos HTTP a mensajes UX: `400` validación, `403` sin permiso, `404` recurso, `409` conflicto de negocio si el backend lo usa.
- **Loading:** `loading.tsx` por ruta o skeletons con Tailwind en listados.
- **Errores:** `error.tsx` en el segmento o boundary local; no tragar errores de red.

### Autenticación

Reutilizar el mecanismo actual del frontend (session, Bearer, etc.). No duplicar lógica de login; las rutas recruiter asumen usuario autenticado con rol adecuado.

## React 19 (patrones UI)

- Formularios: preferir **Server Actions** si el proyecto ya las usa para mutaciones; si no, **fetch desde Client Component** con estado local y deshabilitar el submit durante `pending`.
- Estados derivados del formulario (p. ej. “solo editable si `status === 'Scheduled'`) con lógica clara y tests de comportamiento.
- Evitar prop drilling profundo: contexto ligero o composición de componentes por pantalla.

## Fechas, UTC y UX

- El API expone `scheduledAtUtc` (ISO 8601). En UI:
  - mostrar en **zona local del navegador** con librería ya adoptada en el proyecto (`Intl`, `date-fns-tz`, `dayjs`, etc.) — **no** inventar otra convención;
  - en formularios de edición, convertir de vuelta a UTC al enviar `PATCH`/`POST`.
- Etiquetar explícitamente si se muestra hora local vs UTC en tooltips si hay ambigüedad (equipos remotos).

## Tailwind CSS v4

- Usar el enfoque **CSS-first** del proyecto (p. ej. `@import "tailwindcss"`, `@theme` para tokens) según la guía interna; no duplicar tokens si ya existen variables de marca.
- Componentes: reutilizar capa de UI existente (shadcn, headless, etc.) si está en el repo; si no, componentes mínimos con clases utilitarias y focus visible para accesibilidad.
- Listados: tabla responsive o cards; **badges** de estado con colores semánticos consistentes (programada / completada / cancelada / no-show).

## Componentes y piezas sugeridas

| Pieza | Responsabilidad |
|-------|-----------------|
| `InterviewStatusBadge` | Muestra y aplica estilo por `status`. |
| `InterviewList` | Tabla/lista con filtros opcionales. |
| `InterviewForm` | Alta/edición: candidato, fecha/hora, duración, tipo, entrevistador, notas. |
| `InterviewDetailPanel` | Lectura + acciones (reprogramar, completar, cancelar). |

Validación cliente (Zod u otra lib ya usada): campos requeridos alineados al backend; mensajes en español si el producto es ES.

## Accesibilidad y i18n

- Inputs con `label` asociado, estados de error anunciados, contraste suficiente en badges.
- Si la app es multi-idioma, externalizar strings; si no, copy en español consistente.

## Pruebas (frontend)

- **Unit / component:** render de badges, deshabilitado de campos en estados terminales.
- **E2E opcional (Playwright):** flujo crear → listar → patch cancelación (con API mock o entorno de prueba).

## Orden de implementación sugerido

1. Tipos TS + cliente API + capa de error.
2. Lista por `vacancyId` con filtros básicos.
3. Formulario crear (selector de candidato acotado a la vacante según endpoint existente de candidatos de esa vacante).
4. Detalle + `PATCH` (reprogramar y estados).
5. Vista por candidato (opcional MVP+).
6. Pulido UX (loading, vacíos, accesibilidad).

## Relación con la etapa de pipeline “Interview”

- No bloquear la UI si el candidato está en otra etapa; el backend decide elegibilidad.
- Opcional (fase 2): banner informativo “Candidato aún no en etapa Entrevista” sin impedir agendar si negocio lo permite.

## Criterios de aceptación (MVP UI)

- [ ] El reclutador accede al módulo desde el **sidebar** (Entrevistas debajo de Vacantes); el hub es **`/portal-rrhh/entrevistas`** y al elegir vacante la ruta del listado es **`/portal-rrhh/entrevistas/<vacanteId>`** (p. ej. botón «Ver entrevistas»).
- [ ] El reclutador puede ver un listado de entrevistas para una vacante con estados claramente diferenciados.
- [ ] Se puede crear una entrevista desde el contexto de vacante con feedback de éxito/error (incl. error de candidato no vinculado).
- [ ] Se puede reprogramar y actualizar estado según reglas del backend (estados terminales con UI acorde).
- [ ] Las fechas se muestran de forma comprensible para el usuario respetando UTC en el contrato API.
- [ ] Loading y errores de red no dejan la pantalla en estado ambiguo.
- [ ] La implementación usa Next.js 16 (App Router), React 19 y Tailwind CSS v4 según las convenciones del repositorio frontend.

---

*Documento de planificación para el repo frontend; rutas exactas y nombres de módulos deben alinearse con la estructura real del proyecto y con OpenAPI del backend.*
