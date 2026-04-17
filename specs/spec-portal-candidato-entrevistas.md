# Especificación: Portal candidato — `/portal-candidato/entrevistas`

## Objetivo

Definir la experiencia y el contrato de datos para que un **candidato autenticado** vea sus entrevistas (próximas e historial) en lenguaje claro, **solo lectura**, alineado al módulo de entrevistas del reclutador pero **sin** acciones de agenda, reprogramación ni cancelación desde este portal.

Complementa [`spec-interviews-module-frontend.md`](./spec-interviews-module-frontend.md) (vista reclutador). La implementación actual del listado vive en `components/candidato/CandidateInterviewsContent.tsx` y consume `getCandidateSelfInterviews()` en `lib/api/interviews.ts`.

**Implementación backend:** [`spec-portal-candidato-entrevistas-backend.md`](./spec-portal-candidato-entrevistas-backend.md) (contrato detallado, seguridad, DTO y criterios de aceptación).

## Ruta y navegación

| Ruta | Descripción |
|------|-------------|
| `/portal-candidato/entrevistas` | Pantalla principal: próximas entrevistas + historial. |
| Entrada en menú | Ítem **Entrevistas** en `components/candidato/CandidateSidebar.tsx`. |
| Atajo desde inicio | En **Próximas actividades**, enlace «Ver entrevistas» → misma ruta. |

Título de documento: vía `getPageTitle` / `CANDIDATO_PATH_LABEL.entrevistas` en `lib/pageTitles.ts`.

## Audiencia y principios UX

- **Lenguaje en segunda persona** (“tus entrevistas”, “no tenés…”) y tono informativo, no operativo.
- **Sin CRUD:** el candidato no crea ni edita entrevistas; cualquier cambio es responsabilidad de RRHH (correo, sistema externo, etc.).
- **Claridad temporal:** fechas y horas en **zona local del navegador** a partir de `scheduledAtUtc` (ISO 8601), reutilizando `formatInterviewLocalDateTime` de `lib/interview-datetime.ts`.
- **Estados visibles** con el mismo semántico que reclutador: `Scheduled`, `Completed`, `Cancelled`, `NoShow` (badges en español vía `InterviewStatusBadge`).
- **Vacante legible:** priorizar título de puesto / vacante; si el API no lo envía, mostrar un resumen no técnico del `vacancyId` (p. ej. prefijo + ellipsis) como respaldo.

## Contrato API propuesto (backend)

### `GET /api/candidate/interviews`

- **Auth:** mismo mecanismo que `GET /api/candidate/dashboard` (Bearer / cookies según el stack actual del ATS).
- **Respuesta:** misma forma normalizable que el listado recruiter (array o envoltorio con `items` / `interviews` / `data`), para reutilizar `normalizeInterviewList` en frontend.
- **Query opcional (MVP+):** mismos parámetros que recruiter si aplica: `status`, `fromUtc`, `toUtc` (ver `ListInterviewsQuery` en `lib/api/interviews.ts`).

### Campos recomendados por ítem (además del modelo Interview)

Para la tarjeta candidato, conviene que cada elemento incluya al menos:

| Campo (camelCase sugerido) | Uso en UI |
|----------------------------|-----------|
| `scheduledAtUtc` | Fecha y hora principal. |
| `status` (+ `statusDisplayName` si existe) | Badge de estado. |
| `durationMinutes` | Duración (“45 min”). |
| `interviewType` / `interviewTypeLabel` | Tipo de entrevista (técnica, cultural, etc.). |
| `interviewerName` | “Contacto” para el día de la cita. |
| `notes` | Bloque **Indicaciones** (texto compartido por RRHH; vacío si no hay). |
| `vacancyId` | Identificador técnico; respaldo si no hay título. |
| `jobTitle` o `vacancyTitle` o `vacancyName` | Título humano de la vacante (el normalizador acepta varias claves en `jobTitle`). |

**Privacidad:** no exponer en esta vista datos internos de reclutador (p. ej. comentarios de cierre, scores) que no estén pensados para el candidato.

### Errores HTTP

| Código | Comportamiento UI |
|--------|---------------------|
| `401` | Flujo global de sesión (redirección a login si aplica). |
| `403` | Mensaje de permiso denegado. |
| `404` | Tratar como “endpoint o recurso no disponible” con mensaje claro (útil mientras el backend despliega la ruta). |
| `5xx` | Mensaje genérico + reintento manual (refresco de página). |

## Comportamiento en frontend (aceptación)

1. Al cargar la página se llama a `getCandidateSelfInterviews()` una vez (hook `useCandidateSelfInterviews`).
2. **Próximas:** entrevistas con `status === Scheduled` y `scheduledAtUtc >= ahora` (orden ascendente por fecha).
3. **Historial:** el resto (orden descendente por fecha).
4. Vacío global: copy amigable explicando que RRHH aún no agendó nada.
5. Sección próximas vacía pero hay historial: mensaje breve en próximas sin ocultar historial.
6. Accesibilidad: secciones con `aria-label`, estados de carga con `aria-busy`, errores con `role="alert"`.

## No objetivos

- Integración con calendarios externos (ICS opcional: fuera de alcance inicial).
- Sala de videollamada embebida.
- Confirmación “asistiré” / RSVP desde el portal (solo si producto lo define después).

## Referencias de código

- Página: `app/portal-candidato/entrevistas/page.tsx`
- UI: `components/candidato/CandidateInterviewsContent.tsx`
- Cliente API: `getCandidateSelfInterviews` en `lib/api/interviews.ts`
- Tipos compartidos: `Interview`, `InterviewStatus`, `ListInterviewsQuery` en el mismo módulo
