# Modalidades de entrevista — contrato API (frontend)

Autenticación: **JWT Bearer** como el resto de la API. Los JSON usan **camelCase**.

## Solo lectura (reclutador — dropdown / filtros)

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/api/recruiter/interview-modalities` | Recruiter o Admin |

**200**: array de objetos:

```json
{
  "id": "uuid",
  "displayName": "string",
  "includeGoogleMeetLink": true,
  "createdAtUtc": "2024-01-01T00:00:00Z"
}
```

Cliente TS: `listInterviewModalitiesRecruiter()` en [`lib/api/interviews.ts`](../lib/api/interviews.ts).

## CRUD administración (solo Admin)

Base: `/api/admin/interview-modalities`

| Acción | Método | Ruta | Body | Respuesta |
|--------|--------|------|------|-----------|
| Listar | GET | `/api/admin/interview-modalities` | — | 200 → mismo shape que arriba (array) |
| Detalle | GET | `/api/admin/interview-modalities/{id}` | — | 200 objeto \| 404 `{ "message": "..." }` |
| Crear | POST | `/api/admin/interview-modalities` | `{ "displayName": "...", "includeGoogleMeetLink": false }` | 200 objeto \| 400 mensaje |
| Actualizar | PUT o PATCH | `/api/admin/interview-modalities/{id}` | `{ "displayName": "...", "includeGoogleMeetLink": true }` | 200 \| 400 \| 404 |
| Borrar | DELETE | `/api/admin/interview-modalities/{id}` | — | 200 `{ "message": "Deleted." }` \| 404 \| **409** si hay entrevistas usando ese id |

- **403** si el usuario no es Admin en rutas `/api/admin/...`.
- **409** en DELETE cuando existan entrevistas con esa modalidad.

Modal CRUD en portal admin: [`InterviewModalitiesCrudModal`](../components/rrhh/interviews/interview-modalities-crud-modal.tsx) (usa PATCH en actualizar).

## Programar entrevista con modalidad

En **POST** `/api/recruiter/vacancies/{vacancyId}/interviews` y **PATCH** `/api/recruiter/interviews/{id}` (y el alias en `/api/interviews`), enviar opcional:

```json
"interviewModalityId": "uuid-de-catalogo"
```

La respuesta de la entrevista puede incluir:

```json
"interviewModality": {
  "id": "uuid",
  "displayName": "Virtual",
  "includeGoogleMeetLink": true
}
```

Así el front puede mostrar si esa modalidad lleva Meet sin volver a consultar el catálogo.

Modelo normalizado: tipo `Interview` en [`lib/api/interviews.ts`](../lib/api/interviews.ts) (`interviewModalityId`, `interviewModality`).
