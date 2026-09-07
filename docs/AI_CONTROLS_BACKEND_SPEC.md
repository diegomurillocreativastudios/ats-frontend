# Controles de IA (FE-SEC-019)

Referencia cruzada entre **ats-frontend** y **ats-backend** para cerrar el hallazgo de auditoría FE-SEC-019 (esquema, inyección de prompts, humano en el loop).

**Base URL del API:** la configurada en `NEXT_PUBLIC_API_URL` / `API_URL` (sin `/` final).

---

## Resumen

La salida del modelo **nunca** dispara mutaciones por sí sola. El backend valida esquema y separa instrucciones de documentos (BE-SEC-017/018/019). El frontend solo renderiza texto y exige un clic humano antes de incluir al proceso o aplicar un perfil adaptado. Las decisiones sensibles quedan en `security_events`.

| Capa | Responsabilidad |
|------|-----------------|
| Backend | Sobre system vs documento, validadores, cuotas, rechazo 422, auditoría |
| Frontend | Texto React (sin HTML del modelo), confirmación humana, pines de regresión |

---

## Inventario de endpoints de IA (consumidos por el front)

| Método | Ruta | Quién | Qué hace | Salida hacia UI |
|--------|------|-------|----------|-----------------|
| `POST` | `/Ingest/upload` | Recruiter / candidato | Extrae perfil desde CV (+ ID) | Perfil estructurado; copy pide revisión |
| `POST` | `/api/candidate/profile/tailor-to-vacancy` | Candidato | Adapta perfil a vacante (archivo / texto / plataforma) | Versión + resumen + checklist; **422** si JSON inválido |
| `GET` | `/api/candidate/profile/versions` | Candidato | Lista versiones | Metadatos (sin HTML) |
| `GET` | `/api/candidate/profile/versions/{id}` | Candidato | Detalle de versión | Snapshot + highlights |
| `PATCH` | `/api/candidate/profile/versions/{id}` | Candidato | Edita etiqueta / snapshot | — |
| `POST` | `/api/candidate/profile/versions/{id}/promote` | Candidato | Promueve snapshot a ficha principal | Perfil; auditoría `ai_adapted_profile_applied` |
| `PUT` | `/api/candidate/profile` | Candidato | Guarda ficha (también desde “aplicar adaptado”) | Si body trae `appliedFromVersionId` → misma auditoría |
| `GET` | `/api/recruiter/vacancies/{id}/search-candidates` | Recruiter | Búsqueda preliminar | Scores / sugerencias (texto) |
| `POST` | `/api/recruiter/vacancies/{id}/match` | Recruiter | Análisis preliminar | Razonamiento cualitativo (texto) |
| `POST` | `/api/recruiter/applications/start` | Recruiter | **Incluir al proceso** (clic humano) | Crea applications; auditoría `ai_candidates_included_in_process` |

Campos de solo lectura en reportes / ficha (texto escapado o interpolado como string): `aiRecommendation`, `qualitativeReasoning*`, `adaptationSummary`, `changeHighlights`, `atsComplianceChecklist`.

---

## Mapeo FE-SEC-019 → tickets backend

| Criterio de aceptación FE-SEC-019 | Evidencia backend | Estado |
|-----------------------------------|-------------------|--------|
| Instrucciones separadas de CV / vacante | BE-SEC-017 — `LlmPromptEnvelope`, `PromptDocumentEnvelope`, adapters con `systemInstruction` | Cerrado |
| Output fuera de esquema rechazado | BE-SEC-017 — validators + SEC-AI-001/002; tailoring exige `adaptedProfile` | Cerrado |
| Minimizar identificadores hacia el modelo | BE-SEC-018 — `ContactPiiRedactor`, local-first PDF, allowlist | Cerrado |
| Cuotas / timeouts | BE-SEC-019 — rate limit HTTP + cuotas diarias de IA | Cerrado |
| Sin herramientas / mutaciones solo por texto del modelo | Producto: match/search no crean applications; UI exige “Incluir al proceso” | Cerrado + pin FE |
| Revisión humana real + auditoría | `security_events` en include-to-process y apply-adapted-profile | Este ticket |
| Frontend sin sink HTML del modelo | FE-SEC-002 cerrado; pines FE-SEC-019 | Este ticket |

Runbooks:

- `ats-backend/engine/docs/security/be-sec-017-llm-guardrails.md`
- `ats-backend/engine/docs/security/be-sec-018-llm-governance.md`

---

## Eventos de auditoría (humano en el loop)

Append-only en `security_events`. **Prohibido** en metadata: texto de CV, salida cruda del modelo, tokens, emails en claro.

| `eventType` | Cuándo | `resourceType` / `resourceId` | Metadata tipica |
|-------------|--------|-------------------------------|-----------------|
| `ai_candidates_included_in_process` | Recruiter confirma “Incluir al proceso” | `vacancy` / `{vacancyId}` | `candidateCount`, `applicationCount` (sin IDs de perfil en masa si no hace falta; opcional lista corta de application ids) |
| `ai_adapted_profile_applied` | Candidato confirma aplicar perfil adaptado (PUT con `appliedFromVersionId` o `POST .../promote`) | `candidate_profile_version` / `{versionId}` | `profileId` (guid) |

Outcome: `success`. Fallos de persistencia del audit son fail-open (no rompen el flujo).

---

## Contrato frontend → backend (aplicar adaptado)

Al confirmar “Aplicar a mi perfil” desde adecuación IA, el PUT debe incluir:

```json
{
  "headline": "...",
  "summary": "...",
  "resumeMarkdown": "...",
  "nationalId": "...",
  "appliedFromVersionId": "<uuid de la versión de adecuación>"
}
```

`appliedFromVersionId` es **opcional** en guardados normales de “Mi perfil”. Solo cuando viene de la UI de adecuación (tras confirmación modal) se envía y el backend registra el evento.

---

## Comportamiento del front (pines)

| Caso | Comportamiento |
|------|----------------|
| `adaptationSummary` / `qualitativeReasoning*` / `aiRecommendation` | Solo texto React; sin `dangerouslySetInnerHTML` |
| Búsqueda / match preliminares | No llaman `applications/start` |
| Incluir al proceso | Solo tras clic en `handleStartProcess` |
| Aplicar perfil adaptado | Modal de confirmación; PUT con `appliedFromVersionId` |
| Tailoring **422** | Mensaje al usuario; no se “repara” el JSON en el cliente |

---

## Checklist de cierre FE-SEC-019

- [x] Spec + inventario (este documento)
- [x] Backend: eventos `ai_candidates_included_in_process` y `ai_adapted_profile_applied`
- [x] Frontend: `appliedFromVersionId` en apply desde tailoring
- [x] Tests pin: no-HTML, no auto-include, 422 sin coerce
- [x] ToDo frontend marcado Done con evidencia

---

## Fuera de alcance

- Rehacer envelope / clamp / redacción / cuotas (BE-SEC-017/018/019).
- Flujo “aprobar ingest antes de persistir”.
- `responseSchema` de Vertex, techo USD de instancia, clasificador heurístico de inyección.
- Borrado duro de blobs (BE-SEC-030).
