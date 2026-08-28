# Backend Agent Prompt — Candidate Auth & Consent Verification

Copy everything below the line into the backend agent.

---

## Goal

Implement **candidate authorization & consent verification** for the ATS backend so the candidate portal can:

1. Know whether a candidate has already submitted a valid consent.
2. Persist a **legal evidence record** of what they accepted (not only a boolean).
3. Expose APIs the frontend can call from `/portal-candidato/mi-perfil`.

The frontend modal already exists and collects section checkboxes + signature form fields. Backend must become the source of truth (replace `localStorage` gating).

---

## Product context

Visible Outsource candidates must accept a multi-section authorization document before using profile features. The UI is an accordion with **7 required section checkboxes** plus a signature form. Submit is allowed only when all sections are checked and all required form fields are filled.

This is a **legal consent / authorization** flow. A boolean alone is not enough. We need:

- A **profile flag** for fast gating (`authAndConsentVerification`).
- An **immutable (or append-only) evidence record** with document version, accepted sections, signature data, timestamp, IP, user-agent.

---

## Existing frontend contracts (align with these)

Candidate profile today:

- `GET /api/candidate/profile`
- `PUT /api/candidate/profile`

Profile already has (among others): `id`, `firstName`, `lastName`, `nationalId`, `email`, `phoneNumber`.

Do **not** overload `PUT /api/candidate/profile` for consent submission. Use a dedicated consent endpoint. Still **expose the boolean on profile GET** so the portal can decide whether to show the modal.

Auth: candidate JWT (same as current candidate profile endpoints).

---

## Requirements

### A) Profile flag (gating)

On the candidate profile model / DTO returned by `GET /api/candidate/profile` (and any equivalent “me/profile” payload), add:

```ts
authAndConsentVerification: boolean // default false for existing candidates
authAndConsentVerifiedAt: string | null // ISO-8601 UTC when first/last successful consent was recorded
```

Rules:

- Default `false` / `null` for existing rows (migration required).
- Set to `true` + timestamp only after a successful consent submit.
- Do **not** allow clients to set this flag via normal profile PUT (ignore or reject if sent). Flag is server-owned.
- Optional later: if legal document version increases, reset flag to `false` so candidates must re-accept. Design for this even if v1 always uses one version.

### B) Evidence store (append-only recommended)

Create a persistence model, e.g. `CandidateAuthConsent` / `candidate_auth_consents`:

| Field | Type | Notes |
|--------|------|--------|
| `id` | UUID/string | PK |
| `candidateId` | FK | Required |
| `acceptedAt` | datetime UTC | **Server time** (do not trust client date alone) |
| `documentVersion` | string | e.g. `"v1"` — identifies legal text version shown |
| `documentLocale` | string | e.g. `"es"`, `"en"` |
| `sectionsAccepted` | string[] or JSON | Must include all required section keys (see below) |
| `firstNames` | string | From form |
| `lastNames` | string | From form |
| `signature` | string | Typed signature (name as signature) |
| `identityDocument` | string | “Documento de Identidad” |
| `email` | string | Prefer server session email; may echo client |
| `phoneCountryIso2` | string | ISO 3166-1 alpha-2, e.g. `"SV"` |
| `phoneNationalNumber` | string | National number as entered |
| `phoneE164` | string \| null | Normalized if you can build it (`+503…`) |
| `clientDeclaredDate` | date \| null | Date shown/disabled in UI (local calendar day from client) |
| `ipAddress` | string \| null | From request |
| `userAgent` | string \| null | From request |
| `createdAt` | datetime | Audit |

Constraints / behavior:

- Prefer **append-only**: each successful submit inserts a new row (history). Profile flag reflects “has at least one valid consent for current `documentVersion`”.
- Unique optional: at most one “active” consent per `(candidateId, documentVersion)` if you want idempotency; still keep history if re-accepted after version bump.
- Never delete evidence on profile edits.
- Index by `candidateId`, `(candidateId, documentVersion)`, `acceptedAt`.

### C) Required section keys (must match frontend)

Frontend section IDs (all required = true):

1. `profileUse`
2. `personalData`
3. `confidentiality`
4. `communications`
5. `nonExclusivity`
6. `electronicSignature`
7. `acceptance`

Reject submit if any key is missing or not accepted.

### D) Document version

Introduce a server constant/config, e.g.:

```text
CURRENT_CANDIDATE_AUTH_CONSENT_VERSION = "v1"
```

- Store this on every evidence row.
- Profile is considered verified only if there is evidence for **current** version.
- When legal copy changes in product, bump version → candidates must re-consent.

### E) APIs

#### 1) Submit consent (primary write)

```http
POST /api/candidate/auth-consent
Authorization: Bearer <candidate JWT>
Content-Type: application/json
```

**Request body:**

```json
{
  "documentVersion": "v1",
  "documentLocale": "es",
  "sectionsAccepted": {
    "profileUse": true,
    "personalData": true,
    "confidentiality": true,
    "communications": true,
    "nonExclusivity": true,
    "electronicSignature": true,
    "acceptance": true
  },
  "firstNames": "María José",
  "lastNames": "García López",
  "signature": "María José García López",
  "identityDocument": "01234567-8",
  "phoneCountryIso2": "SV",
  "phoneNationalNumber": "7777-8888",
  "clientDeclaredDate": "2026-07-31"
}
```

Notes:

- `email` should come from authenticated user/candidate record; if body includes `email`, validate it matches session email or ignore body email and always persist session email.
- `documentVersion` in body must equal server `CURRENT_CANDIDATE_AUTH_CONSENT_VERSION` or return `409`/`422` with clear error (frontend must refresh copy).

**Validation (400/422):**

- All 7 section flags must be `true`.
- `firstNames`, `lastNames`, `signature`, `identityDocument`, `phoneCountryIso2`, `phoneNationalNumber` required non-empty after trim.
- `phoneCountryIso2` = 2-letter ISO.
- `phoneNationalNumber` must contain a reasonable digit count (frontend uses ≥ 6 digits).
- `clientDeclaredDate` optional but if present must be valid ISO date (`YYYY-MM-DD`).
- Candidate role only.

**Side effects (transaction):**

1. Insert evidence row (server `acceptedAt`, IP, user-agent, email from auth, version).
2. Set profile `authAndConsentVerification = true`.
3. Set profile `authAndConsentVerifiedAt = acceptedAt` (UTC).

**Response `201`:**

```json
{
  "authAndConsentVerification": true,
  "authAndConsentVerifiedAt": "2026-07-31T14:22:10.123Z",
  "documentVersion": "v1",
  "consentId": "..."
}
```

**Idempotency (recommended):**

- If candidate already verified for current version, either:
  - `200` with existing status (no duplicate row), or
  - allow a new evidence row but keep flag true.
- Prefer: if identical resubmit within short window, return `200` without duplicating; document chosen behavior.

#### 2) Read status (can be profile GET only)

Minimum: extend `GET /api/candidate/profile` with:

```json
{
  "authAndConsentVerification": false,
  "authAndConsentVerifiedAt": null
}
```

Optional dedicated endpoint:

```http
GET /api/candidate/auth-consent
```

```json
{
  "authAndConsentVerification": true,
  "authAndConsentVerifiedAt": "2026-07-31T14:22:10.123Z",
  "currentDocumentVersion": "v1",
  "acceptedDocumentVersion": "v1",
  "requiresReacceptance": false
}
```

`requiresReacceptance = true` when flag false OR accepted version ≠ current version.

#### 3) Admin / recruiter visibility (nice-to-have, not blocking)

If easy: expose verification status on recruiter candidate detail read models. Full evidence body may be restricted to admin/compliance roles.

---

## Security & compliance

- Only the authenticated candidate can submit/read their own consent status.
- Do not accept client-provided `authAndConsentVerification`.
- Capture IP + user-agent on submit.
- Prefer HTTPS-only deployment assumptions already in place.
- Log submit success/failure without leaking full PII in logs (truncate/mask phone & identity document in logs).
- Evidence is retention-sensitive; do not hard-delete via normal APIs.

---

## Migration

1. Add nullable/default columns on candidate profile:
   - `AuthAndConsentVerification` bool default `false`
   - `AuthAndConsentVerifiedAt` datetime null
2. Create `CandidateAuthConsents` table (or equivalent).
3. Backfill: all existing candidates `false` / `null` (modal will show until they submit).

---

## Error contract (align with existing API style)

Use the project’s standard error envelope. Suggested codes:

| Case | HTTP |
|------|------|
| Validation failed | 400 or 422 |
| Unauthenticated | 401 |
| Authenticated but not candidate / no profile | 403 or 404 |
| Stale `documentVersion` | 409 or 422 |
| Server error | 500 |

Include machine-readable `code` if the API already uses codes, e.g.:

- `AUTH_CONSENT_VALIDATION`
- `AUTH_CONSENT_VERSION_MISMATCH`
- `AUTH_CONSENT_PROFILE_NOT_FOUND`

---

## Acceptance criteria

- [ ] Migration applies cleanly on empty + existing DBs
- [ ] `GET /api/candidate/profile` returns `authAndConsentVerification` + `authAndConsentVerifiedAt`
- [ ] Normal `PUT /api/candidate/profile` cannot forge the flag
- [ ] `POST /api/candidate/auth-consent` validates all 7 sections + required fields
- [ ] Successful POST writes evidence + sets profile flag/timestamp in one transaction
- [ ] Server stores `acceptedAt`, IP, user-agent, session email, `documentVersion`
- [ ] Candidate without consent remains `false`
- [ ] Unit/integration tests cover happy path + missing section + missing field + unauthorized
- [ ] OpenAPI/Swagger (if used) updated for new fields/endpoint
- [ ] Brief note in PR/changelog: endpoint path, DTO, version constant name

---

## Out of scope (frontend will do after backend lands)

- Replace `localStorage` gating with profile flag from API
- Wire modal submit to `POST /api/candidate/auth-consent`
- Map API validation errors to toast/UI
- i18n already exists for modal copy

---

## Suggested constant for frontend sync

Please return in the implementation summary:

1. Final route paths
2. Exact request/response JSON examples (as implemented)
3. Profile field names (PascalCase/camelCase as serialized to JSON)
4. Value of `CURRENT_CANDIDATE_AUTH_CONSENT_VERSION`
5. Any deviation from this prompt

Frontend will then implement against that summary.

---

## Implementation priority

1. Migration + model  
2. Profile GET fields  
3. `POST /api/candidate/auth-consent`  
4. Tests  
5. Optional `GET /api/candidate/auth-consent`  

Ship (1)–(4) as the minimum for frontend integration.
