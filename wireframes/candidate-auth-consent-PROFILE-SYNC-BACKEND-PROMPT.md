# Backend Agent Prompt — Sync Auth & Consent Form Fields to Candidate Profile

Copy everything below the line into the backend agent.

---

## Goal

When a candidate successfully submits `POST /api/candidate/auth-consent`, also **update the candidate profile** with the identity/contact fields from the consent form (in the same transaction as the evidence write + verification flag).

Today the endpoint:

1. Inserts an evidence row in `candidate_auth_consents` (or equivalent).
2. Sets `authAndConsentVerification = true` and `authAndConsentVerifiedAt`.

It does **not** copy form values into the editable profile fields. We need that sync.

Frontend is already sending these fields and will keep doing so. No frontend contract change required for the request body.

---

## Context (already implemented)

Branch / feature: `feature/candidate-auth-consent`

- `POST /api/candidate/auth-consent`
- `GET /api/candidate/auth-consent`
- Profile flags: `authAndConsentVerification`, `authAndConsentVerifiedAt`
- Document version config: `CandidateAuthConsent:CurrentDocumentVersion` (default `"v1"`)
- Evidence is append-only; idempotent resubmit for current version returns `200` without a new evidence row

Request body (unchanged):

```json
{
  "documentVersion": "v1",
  "documentLocale": "es",
  "sectionsAccepted": { "...": true },
  "firstNames": "María José",
  "lastNames": "García López",
  "signature": "María José García López",
  "identityDocument": "01234567-8",
  "phoneCountryIso2": "SV",
  "phoneNationalNumber": "7777-8888",
  "clientDeclaredDate": "2026-07-31"
}
```

Email in body is ignored; session email is used for evidence.

---

## Requirements

### A) Profile field mapping on successful consent submit

On **successful** `POST /api/candidate/auth-consent` (the `201` path that creates evidence + verifies), update the candidate profile in the **same DB transaction**:

| Consent request field | Candidate profile field | Notes |
|------------------------|-------------------------|--------|
| `firstNames` | `FirstName` / `firstName` | Trim; required non-empty (already validated) |
| `lastNames` | `LastName` / `lastName` | Trim; required non-empty |
| `identityDocument` | `NationalId` / `nationalId` | Trim; required non-empty. Respect existing uniqueness rules (409 if conflict with another candidate) |
| `phoneNationalNumber` + `phoneCountryIso2` | `PhoneNumber` / `phoneNumber` | Persist a clear, consistent value (see phone rules below) |
| session email (auth) | `Email` / `email` | Only if profile email is empty/null; do **not** overwrite a different existing profile email unless it already matches session |

Do **not** map:

- `signature` → profile (evidence-only)
- `clientDeclaredDate` → profile birth date or any other date field
- `sectionsAccepted` → profile
- `documentVersion` / locale → profile (except existing verification flags)

### B) Phone number rules

Prefer storing a single profile `phoneNumber` string that the rest of the ATS already understands.

Recommended (pick one and document in the PR summary):

**Option 1 (preferred):** store E.164 when available (you already build best-effort E.164 on evidence), e.g. `+50377778888`.  
**Option 2:** store `"{ISO2} {national}"` only if E.164 is null, e.g. `SV 7777-8888`.  
**Option 3:** store national number only (weaker; avoid unless profile consumers require it).

Use the same normalization you already use for evidence `phoneE164` when possible. If E.164 is null, fall back to trimmed `phoneNationalNumber`.

Also persist country on profile **only if** the profile already has a compatible country field used elsewhere (e.g. `Country` as name or ISO). If the existing profile `country` field is free-text Spanish names (not ISO2), **do not** overwrite it with `SV` unless you already have a safe mapping helper. Prefer leaving `country` untouched in v1 if unsure.

### C) Idempotent `200` path (already verified)

When the candidate is **already verified** for the current document version and the endpoint returns `200` without inserting a new evidence row:

- **Do not silently skip profile sync forever** if profile fields are empty.
- Recommended behavior:
  - If profile `firstName` / `lastName` / `nationalId` / `phoneNumber` are missing/blank, apply the same mapping from the incoming request (upsert gaps only).
  - If those profile fields already have values, **do not overwrite** them on the idempotent `200` path.
- Alternative acceptable behavior (document if chosen): always no-op profile writes on `200`. Prefer the gap-fill approach above.

On the first successful `201` path: **always** write the mapped fields from the consent form (overwrite previous profile values for those mapped fields). Rationale: the signed consent declaration is the candidate’s attested identity for this process.

### D) Conflict handling (`nationalId`)

If updating `nationalId` would violate a unique constraint / business rule (another candidate already owns that ID):

- Roll back the whole transaction (no evidence row, no verification flag) **or**
- If evidence+flag already committed in older code paths, keep atomicity: fail before commit.

Return existing style error, preferably:

- HTTP `409`
- code: reuse existing profile duplicate identity code if one exists, or `AUTH_CONSENT_VALIDATION` / a new `AUTH_CONSENT_NATIONAL_ID_CONFLICT`
- clear message

Frontend already surfaces 409-ish messaging for profile national ID conflicts in other flows.

### E) Transaction boundaries

All of these must succeed or fail together on `201`:

1. Insert consent evidence row
2. Set `authAndConsentVerification` + `authAndConsentVerifiedAt`
3. Update mapped profile fields (`firstName`, `lastName`, `nationalId`, `phoneNumber`, optional email gap-fill)

No partial updates.

### F) Security

- Still server-owned verification flags.
- Still ignore client email for evidence; for profile email only gap-fill from authenticated session identity.
- Candidate can only update their own profile via this path.
- Do not expose a public “force sync” endpoint.

### G) Tests

Add/extend unit + integration tests:

1. **201 happy path** — after consent, profile GET shows updated `firstName`, `lastName`, `nationalId`, `phoneNumber`, and verification flags true.
2. **Email gap-fill** — empty profile email becomes session email; non-empty different email is left unchanged.
3. **National ID conflict** — returns conflict/validation error and does not mark consent verified / does not insert evidence.
4. **Idempotent 200** — already verified; blank profile fields get gap-filled; non-blank fields remain unchanged (if you implement gap-fill).
5. **Phone** — stored format matches the chosen rule (assert exact string in test).

---

## Out of scope

- Changing request/response JSON shape of `POST /api/candidate/auth-consent` (keep current response).
- Syncing signature or consent sections into profile.
- Frontend changes (will verify via profile GET after submit; already refetches profile).
- Recruiter UI changes.

---

## Acceptance criteria

- [ ] Successful first consent (`201`) updates profile identity/contact fields in the same transaction
- [ ] Evidence row still created as today
- [ ] Verification flags still set as today
- [ ] National ID uniqueness conflicts fail atomically with a clear error
- [ ] Idempotent `200` behavior documented and tested
- [ ] Tests pass
- [ ] PR summary states exact phone storage format chosen

## Return to frontend

Please include in the completion summary:

1. Which profile JSON fields are updated (`firstName`, etc.)
2. Exact `phoneNumber` format stored
3. Whether idempotent `200` overwrites, gap-fills, or no-ops
4. Error code used for national ID conflicts
5. Any deviation from this prompt

Frontend will then confirm refetch shows the synced values on Mi perfil.
