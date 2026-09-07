# Documentos de candidato — DTO mínimo (FE-SEC-020)

Referencia para alinear el backend ATS con el Backend-for-Frontend de Next.js
(`app/api/candidate/[id]/documents/*`) y la UI del portal candidato.

**Base URL del API:** la configurada en `NEXT_PUBLIC_API_URL` (sin `/` final).

**Estado:** implementado en backend (`feature/fe-sec-020-candidate-document-public-dto`)
y en frontend (puente + UI).

---

## Resumen

El navegador no recibe rutas internas de almacenamiento (`storagePath`) ni
hashes de contenido (`contentSha256`). El listado y el alta devuelven un
**DTO público mínimo**. La descarga se autoriza por **id opaco** (o por el CV
del perfil propio); el path se resuelve solo en el servidor. La deduplicación
por hash sigue siendo interna al backend.

---

## 1) `GET /api/candidate/{id}/documents`

**Respuesta 200** — arreglo de objetos públicos:

```json
[
  {
    "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "fileName": "cv.pdf",
    "createdAt": "2026-01-15T12:00:00Z"
  }
]
```

| Campo | Tipo | Notas |
|-------|------|--------|
| `id` | GUID | Id opaco del documento |
| `fileName` | string \| null | Nombre de subida original (p. ej. `cv.pdf`), no `cvs/{guid}_cv.pdf` |
| `createdAt` | string (ISO-8601) \| null | Orden sugerido: más reciente primero |

**No incluir:** `storagePath`, `contentSha256`, ni URLs firmadas de GCS/S3
pensadas para el browser.

**Autorización:** Admin/Recruiter cualquier candidato; Candidate solo su perfil.

El puente Next también strippea esos campos por defensa en profundidad.

---

## 2) `POST /api/candidate/{id}/documents`

Misma forma de respuesta que el ítem del listado (`id`, `fileName`, `createdAt`).
El SHA-256 puede seguir usándose **dentro** del servicio para deduplicar; no va
en el JSON al cliente.

---

## 3) Descarga por id

| Método | Ruta | Rol |
|--------|------|-----|
| `GET` | `/api/candidate/{id}/documents/{documentId}` | Mismo ownership que el listado |

**200** — bytes del archivo (`Content-Type`, `Content-Disposition` con el
`fileName` público).

**404** — documento inexistente o sin blob (mensaje genérico; sin paths).

El portal descarga vía BFF same-origin hacia esa ruta (sin
`GET /api/Storage/files/{path}`).

**Se mantiene:** `GET /api/candidate/profile/cv` — CV propio del token.

---

## 4) `GET /api/candidate/profile` y `GET /api/candidate/me`

| Campo retirado | Sustituto |
|----------------|-----------|
| `storagePath` | `hasCvFile: true` |
| `cvDownloadUrl` | Usar `GET .../profile/cv` |
| `latestResume.storagePath` | `latestResume: { documentId, hasFile }` |
| `contentSha256` | Solo uso interno |

---

## 5) Criterios de aceptación

1. DevTools / respuesta de listado y alta: sin `storagePath` ni `contentSha256`.
2. Descarga de un documento de la lista funciona sin conocer la ruta de storage.
3. Descarga del CV del perfil propio vía `GET /api/candidate/profile/cv`.
4. Deduplicación por hash (si existe) sigue funcionando en servidor.
5. Tests de integración: payload público mínimo; 403/404 de ownership sin filtrar
   rutas internas en el mensaje.

---

## Notas

- Fuera de este contrato: `POST /api/candidate/profile/upload-enrich` e Ingest
  pueden seguir devolviendo `storagePath`; el portal de documentos no los usa
  para listar/descargar.
- `GET /api/Storage/files/{path}` puede existir; el portal candidato no debe
  usarlo para esta lista.
- El reclutador descarga por `GET /api/recruiter/candidates/{id}/cv` (mismo
  patrón: path solo en servidor).
