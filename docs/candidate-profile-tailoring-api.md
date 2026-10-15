# API: Adecuación de perfil del candidato a una vacante

Contrato consumido por `ats-frontend`. Implementación en `ats-backend` (pendiente).

## Rutas por fuente

Dos endpoints según el origen de la vacante. El frontend elige la ruta y el `Content-Type` en `tailorProfileToVacancy` (`lib/api/candidate-profile-tailor.ts`).

| Pestaña UI | Método y ruta | `Content-Type` | Cuerpo |
|---|---|---|---|
| Vacante del sistema | `POST /api/candidate/profile/tailor-to-vacancy` | `application/json` | `{ "vacancyId": "...", "label"?: "..." }` |
| Texto | `POST /api/candidate/profile/tailor-to-vacancy` | `application/json` | `{ "vacancyText": "...", "label"?: "..." }` |
| Archivo | `POST /api/candidate/profile/tailor-to-vacancy/multipart` | `multipart/form-data` | `vacancyFile` (`.pdf`, `.docx`, `.md`, máx. 10 MB) + `label?` |

**Auth:** Bearer JWT (candidato) en ambas rutas. El Backend for Frontend (`app/api/bff/[...path]/route.ts`) reenvía cuerpo y `Content-Type` sin transformarlos.

### Validaciones

- Exactamente **una** fuente por request. La UI ya la garantiza con `resolveExclusiveVacancySource`.
- `vacancyText`: máx. 50 000 caracteres.
- `vacancyId`: UUID de vacante publicada. El backend resuelve `vacancyTitle` server-side; el frontend no lo envía.
- `label`: opcional en ambas rutas.

**Response 200:**

```json
{
  "versionId": "uuid",
  "versionNumber": 1,
  "promptVersion": "v1",
  "vacancySource": "platform|text|file",
  "vacancyTitle": "string|null",
  "estimatedMatchScore": 0.87,
  "currentProfile": {},
  "adaptedProfile": {},
  "adaptationSummary": "string",
  "changeHighlights": [{ "field": "headline", "before": "...", "after": "...", "reason": "..." }]
}
```

## Versiones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/candidate/profile/versions` | Lista (`id`, `label`, `vacancyTitle`, `versionNumber`, `createdAt`, `estimatedMatchScore`) |
| GET | `/api/candidate/profile/versions/{id}` | Detalle + `profileSnapshot` + highlights |
| PATCH | `/api/candidate/profile/versions/{id}` | `{ label?, profileSnapshot? }` |
| DELETE | `/api/candidate/profile/versions/{id}` | Elimina versión |

## Perfil principal (existente)

| Método | Ruta | Uso en UI |
|--------|------|-----------|
| GET/PUT | `/api/candidate/profile` | Perfil actual + «Aplicar a mi perfil» |

## Vacantes (existente)

`GET /api/vacantes` — buscador en tab «Vacante del sistema».

## Notas frontend

- Sin endpoint `promote`: la UI usa **PATCH versión** y **PUT perfil principal** con confirmación.
- Salida IA (`adaptationSummary`, `changeHighlights`, contenido adaptado) **no se traduce** (`docs/frontend-i18n-scope.md`).
