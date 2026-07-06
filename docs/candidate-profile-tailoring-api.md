# API: Adecuación de perfil del candidato a una vacante

Contrato consumido por `ats-frontend`. Implementación en `ats-backend` (pendiente).

## POST `/api/candidate/profile/tailor-to-vacancy`

**Content-Type:** `multipart/form-data`  
**Auth:** Bearer JWT (candidato)

Exactamente **una** fuente:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `vacancyFile` | File | `.pdf`, `.docx`, `.md` (máx. 10 MB) |
| `vacancyText` | string | Texto pegado (máx. 50 000 caracteres) |
| `vacancyId` | string (UUID) | Vacante publicada |
| `label` | string? | Etiqueta opcional de la versión |

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
