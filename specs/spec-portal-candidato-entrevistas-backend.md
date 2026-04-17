# Especificación backend: `GET /api/candidate/interviews` (portal candidato)

Este documento define lo que debe implementar el **API .NET (u otro backend)** para alimentar la vista **`/portal-candidato/entrevistas`** del frontend. El cliente ya llama a esta ruta vía `getCandidateSelfInterviews()` en `lib/api/interviews.ts`.

Documento relacionado (producto / UX): [`spec-portal-candidato-entrevistas.md`](./spec-portal-candidato-entrevistas.md).

---

## 1. Resumen

| Aspecto | Valor |
|--------|--------|
| Método y ruta | **`GET /api/candidate/interviews`** |
| Autenticación | Igual que **`GET /api/candidate/dashboard`**: usuario con rol **candidato**, token JWT (Bearer) o el esquema de cookies que ya use el ATS. |
| Autorización | Solo entrevistas cuyo **perfil de candidato** corresponda al usuario autenticado. No aceptar `candidateProfileId` en query para “ver otro perfil”. |
| Mutaciones | **Ninguna** en este endpoint (solo lectura). |

---

## 2. Query string (opcional, fase 2)

El frontend **hoy** no envía parámetros, pero `buildQueryString` en `lib/api/interviews.ts` ya soporta:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Uno de: `Scheduled`, `Completed`, `Cancelled`, `NoShow`. |
| `fromUtc` | string (ISO 8601) | Filtrar `scheduledAtUtc >= fromUtc` si producto lo requiere. |
| `toUtc` | string (ISO 8601) | Filtrar `scheduledAtUtc <= toUtc` si producto lo requiere. |

**MVP:** puede ignorarse el query y devolver **todas** las entrevistas del candidato; el frontend parte en **próximas** vs **historial** en cliente.

**Riesgo de volumen:** si un candidato puede tener cientos de registros, conviene paginación en una iteración posterior (el normalizador actual espera un array o un envoltorio con array, no cursor).

---

## 3. Formas de respuesta aceptadas por el frontend

El parser `normalizeInterviewList` acepta **cualquiera** de estas formas:

1. **Array JSON** de objetos entrevista.
2. Objeto con **`items`**, **`interviews`** o **`data`** siendo un array del mismo tipo de objeto.

Ejemplos válidos:

```json
[]
```

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "vacancyId": "660e8400-e29b-41d4-a716-446655440001",
    "jobTitle": "Desarrollador .NET Senior",
    "candidateProfileId": "770e8400-e29b-41d4-a716-446655440002",
    "scheduledAtUtc": "2026-04-20T15:00:00.000Z",
    "durationMinutes": 45,
    "interviewerName": "María González",
    "interviewTypeLabel": "Entrevista técnica",
    "notes": "Enlace de Meet te enviaremos por correo.",
    "status": "Scheduled"
  }
]
```

```json
{
  "items": [ /* mismos objetos */ ]
}
```

**Serialización .NET:** usar **camelCase** en JSON (`System.Text.Json` con `PropertyNamingPolicy = JsonNamingPolicy.CamelCase`) para coincidir con las claves que el frontend prioriza.

---

## 4. DTO por ítem (contrato con el normalizador)

La función `normalizeInterview` lee claves en **camelCase** y algunos **snake_case** como respaldo. Lo siguiente es lo que conviene emitir en **camelCase** (recomendado).

### 4.1 Identidad y vínculos

| Propiedad JSON | Requerido MVP | Notas |
|----------------|---------------|--------|
| `id` | Sí | UUID/string estable. También se aceptan `uuid`, `interviewId`, `interview_id`. |
| `vacancyId` | Sí | UUID de la vacante. También `vacancy_id`, `VacancyId`. |
| `candidateProfileId` | Recomendado | El frontend lo muestra en modelo; puede ser string vacío si no lo tenés, pero es mejor enviarlo. Claves alternativas: `candidate_profile_id`, `CandidateProfileId`. |

### 4.2 Título de la vacante (muy recomendado para UX)

| Propiedad JSON | Requerido | Notas |
|----------------|-----------|--------|
| `jobTitle` | No (pero deseable) | El normalizador también busca: `job_title`, `JobTitle`, `vacancyTitle`, `vacancy_title`, `VacancyTitle`, `vacancyName`, `vacancy_name`, `positionTitle`, `position_title`. |

Sin esto, el portal muestra un fallback poco amigable basado en `vacancyId`.

### 4.3 Fecha, duración y tipo

| Propiedad JSON | Requerido MVP | Notas |
|----------------|---------------|--------|
| `scheduledAtUtc` | Sí | Instantánea en **UTC**, ISO 8601 (ej. terminación `Z`). Alternativas: `scheduled_at_utc`, `ScheduledAtUtc`, `scheduledAt`. |
| `durationMinutes` | No | Entero. Alternativa: `duration_minutes`. |
| Tipo de entrevista | No | Puede ser string en `interviewType` / `interview_type`, u objeto anidado con `displayName` / `name` / `label` / `code` / `id` (ver lógica en `pickInterviewTypeMeta` en `lib/api/interviews.ts`). |
| `interviewTypeId` | No | Alternativa: `interview_type_id`. |

### 4.4 Persona y notas visibles al candidato

| Propiedad JSON | Requerido | Notas |
|----------------|-----------|--------|
| `interviewerName` | No | Alternativas: `interviewer_name`, `interviewer`. Texto libre para “contacto el día de la cita”. |
| `notes` | No | Solo texto pensado para el **candidato** (indicaciones, link, lugar). Alternativa: `Notes`. **No** mezclar comentarios internos de reclutador. |

### 4.5 Estado

El frontend normaliza a uno de: **`Scheduled`**, **`Completed`**, **`Cancelled`**, **`NoShow`**.

**Recomendación backend (.NET):** serializar el estado como **string** con [`JsonStringEnumConverter`](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties#enums-as-strings) en la propiedad `status`, o enviar un objeto **`interviewStatus`** (o `InterviewStatus`) con `code` + `displayName` en **camelCase** o **PascalCase**. Así se evita ambigüedad con enteros.

Formas que el cliente interpreta (ver `normalizeInterview` / `normalizeInterviewStatusMeta` en `lib/api/interviews.ts`):

- Objeto **`interviewStatus`** / `InterviewStatus` / `interview_status` (prioridad sobre `status` vacío o sin identidad), con `code`/`Code`, `key`/`Key`, `value`/`Value`, más `displayName`/`DisplayName`, `name`/`Name`, etc.
- String o número en **`status`** / `Status` / `state` / `State` (objetos vacíos en `status` se ignoran y se sigue buscando en otros campos).
- Etiquetas planas: `statusDisplayName`, `statusName`, `statusLabel` (y variantes con guión bajo / PascalCase).
- Texto en **español** en raíz (p. ej. `"Completada"`, `"Cancelada"`) o códigos compuestos (p. ej. `"INTERVIEW_STATUS_COMPLETED"`).
- **Entero 0–3** solo como compatibilidad con enum **sin** conversor a string, asumiendo orden declarativo típico `Scheduled=0`, `Completed=1`, `Cancelled=2`, `NoShow=3`. Si vuestro enum usa otro orden, **no** dependáis del número: enviad string u objeto con `code`.

Si nada coincide, el cliente hace fallback a **`Scheduled`**; lo ideal es un **`code`** estable alineado a los cuatro valores anteriores.

### 4.6 Campos opcionales adicionales

| Propiedad | Uso |
|-----------|-----|
| `outcome` / `Outcome` | El modelo del front lo admite; **no** es necesario mostrarlo al candidato en la vista actual. Evaluar si debe omitirse por privacidad. |
| `interviewStatusId` / `interview_status_id` | Metadatos; opcional. |
| `createdAtUtc`, `updatedAtUtc` | Opcional; no usados en la tarjeta actual del portal. |

---

## 5. Reglas de negocio y seguridad

1. **Resolución del candidato:** a partir del usuario autenticado (claims / `AspNetUserId` / tabla de vínculo), obtener el **CandidateProfileId** (o equivalente) y listar solo entrevistas asociadas a ese perfil **y** a postulaciones/vacantes donde el candidato siga siendo parte del proceso (definir si incluís entrevistas de postulaciones archivadas — recomendación: **sí incluir historial** con el mismo criterio que usa recruiter para “por candidato”, pero sin datos sensibles).

2. **Prohibido:** devolver entrevistas de otros candidatos aunque el caller esté autenticado.

3. **Alineación con recruiter:** idealmente reutilizar la misma proyección de dominio que `GET /api/recruiter/candidates/{id}/interviews`, filtrando por el `id` inferido del token, y **recortando** campos que no deban ver los candidatos.

4. **CORS / host:** mismo origen que el resto de `/api/candidate/*` que ya consume el front.

---

## 6. Códigos HTTP

| Código | Cuándo |
|--------|--------|
| **200** | Lista obtenida (puede ser array vacío). |
| **401** | Sin token o token inválido/expirado. |
| **403** | Usuario autenticado pero sin perfil candidato o sin permiso para este recurso. |
| **404** | Opcional: “perfil candidato no encontrado”; el front muestra mensaje genérico de recurso. |
| **500** | Error no controlado; cuerpo con mensaje si es posible (`title`/`detail` según convención del API). |

---

## 7. Criterios de aceptación (backend)

- [ ] `GET /api/candidate/interviews` con token de **candidato** devuelve **200** y solo entrevistas de ese candidato.
- [ ] Respuesta es **array** o objeto con **`items` | `interviews` | `data`** array.
- [ ] Cada ítem incluye al menos **`id`**, **`vacancyId`**, **`scheduledAtUtc`**, **`status`** coherente con el enum de entrevistas.
- [ ] Se envía **`jobTitle`** (o alias aceptado) cuando exista título de vacante en BD.
- [ ] **`notes`** e **`interviewerName`** solo contienen información apta para el candidato.
- [ ] `scheduledAtUtc` es UTC explícito (recomendado con `Z`).
- [ ] Mismo esquema de autenticación que `GET /api/candidate/dashboard` (prueba de integración con el front en `/portal-candidato/entrevistas`).

---

## 8. Ejemplo mínimo de implementación conceptual (.NET)

No es código obligatorio del repo; sirve como guía:

- Controlador bajo prefijo `api/candidate`, atributo `[Authorize(Roles = "Candidate")]` (o la política que ya use el proyecto).
- Inyectar servicio que:
  - resuelve `CandidateProfileId` del usuario actual;
  - consulta entrevistas por ese id (misma query base que recruiter “by candidate”);
  - mapea a un DTO de solo lectura con las propiedades de la sección 4.

Si ya existe un handler para `GET /api/recruiter/candidates/{candidateProfileId}/interviews`, la implementación más rápida es **extraer el caso de uso** y reutilizarlo con `candidateProfileId` desde el token en lugar de desde la ruta.

---

## 9. Referencias en el frontend (para contrastar en PR)

| Archivo | Contenido relevante |
|---------|---------------------|
| `lib/api/interviews.ts` | `getCandidateSelfInterviews`, `normalizeInterview`, `normalizeInterviewList`, `buildQueryString` |
| `hooks/useCandidateSelfInterviews.ts` | Consumo del endpoint |
| `components/candidato/CandidateInterviewsContent.tsx` | Partición próximas / historial en cliente |

---

## 10. Changelog sugerido (commit backend)

Ejemplo de mensaje para el equipo:

> feat(api): add GET /api/candidate/interviews for candidate portal  
> Returns interviews for the authenticated candidate profile; camelCase JSON; aligns with recruiter interview DTO minus internal fields.
