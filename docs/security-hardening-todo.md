# Hardening de seguridad — ToDo

Fuente: auditoría frontend 2026-07-21 (24 hallazgos FE-SEC).  
Al cerrar un ítem: marcar `- [x]`, moverlo a **Done** si hace falta, y actualizar el conteo.

**Conteo:** Done 18 · In Progress 0 · Last ToDos 1 · To Do 5

**Antes del primer PR:** autorización explícita. Un lote = un PR pequeño. No agrupar todo.

---

## Done

- [x] **FE-SEC-001** — Reset de password solo con token; forgot sin enumeración
  - UI/handler: `reset-password`, `RestablecerContrasenaContent`, `olvidaste-tu-contrasena`; spec `docs/FORGOT_PASSWORD_BACKEND_SPEC.md`
  - Backend-for-Frontend de forgot normaliza 404/400-enumeración a 200 genérico; reset exige token
- [x] **FE-SEC-013** — Forgot password: respuesta uniforme (status, tamaño, latencia)
  - Front: sin `exists` / `success` distinguibles; 404/400-enumeración → 200 genérico
  - Rate limit por IP/cuenta y padding de tamaño/latencia siguen siendo del backend
- [x] **FE-SEC-002** — XSS en plantillas HTML: quitar sink offscreen y placeholders raw
  - Ficha y reportes solo esquema JSON; preview/PDF sin interpolar HTML de autor
  - `template-interpolate.ts`: sin `{{{...}}}` / sufijo `*Html`; valores siempre escapados
  - Detalle de reporte: PDF schema por servidor; sin host offscreen; Admin exige JSON en reportes/ficha
- [x] **FE-SEC-003** — SSRF / red en Chromium PDF: denegar red por defecto
  - Interceptor deny-by-default en `pdf-chromium-network-policy.ts` (pipeline + paginado)
  - Allowlist con `URL` + origen público; hosts/IPs con `node:net` BlockList/`isIP` (sin regex)
  - Cuotas/timeouts/semáforo en ruta ficha; renderer schema / servicio aislado en **FE-SEC-015**
- [x] **FE-SEC-004** — Access token HttpOnly + Backend-for-Frontend
  - `ats_access_token` HttpOnly; `apiClient` → `/api/bff` same-origin con cookies
  - Sin `getAccessToken` / Bearer en el browser; CV/storage/HTML vía puente
- [x] **FE-SEC-011** — Cross-Site Request Forgery en mutaciones cookie-auth
  - Origin allowlist + Fetch Metadata + token double-submit (`ats_csrf` / `X-CSRF-Token`)
  - Gate en `proxy.ts` para `POST`/`PUT`/`PATCH`/`DELETE` bajo `/api/*`; bootstrap `GET /api/auth/csrf`
- [x] **FE-SEC-021** — `apiClient` no adjunta bearer a URLs absolutas
  - `resolveBffUrl` rechaza `http(s)://`; el cliente ya no adjunta Authorization
- [x] **FE-SEC-005** — Parchear Next.js / `ws` y transitivas productivas
  - `next` / `eslint-config-next` 16.3.4; `puppeteer-core` / `puppeteer` 25.10.0 (`ws` 8.21.3)
  - `npm audit --omit=dev` sin High/Critical; CSRF header en `csrf-constants` (sin `node:crypto` en cliente)
- [x] **FE-SEC-006** — Runtime Node Long Term Support (Node 24)
  - `Dockerfile` base/runner: `node:24-bookworm-slim@sha256:…`; `engines`: `>=24 <25`; `.nvmrc` 24
  - CI ya en 24; test de regresión `node-lts-runtime-pin.test.ts`
- [x] **FE-SEC-007** — `companyId` explícito; ownership en backend (catálogo compartido)
  - Front: sin `sessionStorage` de empresa ni UUID default; create/edit fail-closed si no hay empresa del catálogo
  - Backend: `CreateVacancy` exige `companyId` (400 sin fallback a `…0001`)
  - Evidencia BE-SEC-004 / ownership: candidato ajeno → 403; sin sesión → 401; Recruiter en CRUD empresas → 403; empresa inactiva denegada; ficha con IDs cruzados → 404; Recruiter ve empresas activas del comprador (no muro A↔B)
- [x] **FE-SEC-008** — Quitar `admin/admin` y fallback end-to-end a servicio externo
  - Login sin `isAdminDemo`; helpers/`global-setup` sin defaults `admin`/`admin`
  - `e2e.yml` exige `E2E_API_URL` + secrets; CI falla cerrado; pin `e2e-credentials-fail-closed.test.ts`
- [x] **FE-SEC-009** — Sesión fail-closed: sin identidad/rol desde cookie `ats_user`
  - `lookupServerSession` / `fetchBackendSessionUser`: ok | unauthenticated | unavailable
  - `/api/auth/me` y layouts de portal solo confían en `/api/auth/session`; backend caído → 401/503
  - Proxy sin rol desde cookie; `useCurrentUser` / `getCurrentUser` sin fallback a `ats_user`
- [x] **FE-SEC-010** — Headers defensivos + Content Security Policy con nonce
  - `poweredByHeader: false`; nosniff / referrer / `X-Frame-Options` / Permissions-Policy / COOP en config + proxy
  - CSP enforce por defecto (`CSP_MODE=report-only` rollback); nonce en `proxy.ts`; `POST /api/csp-report`
  - HSTS opt-in (`ENABLE_HSTS=1`) tras inventario HTTPS
- [x] **FE-SEC-012** — Uploads: allowlist / magic bytes / tamaño / cuota en servidor
  - BFF: tope de cuerpo por ruta (5/10/15/20 MB); sin `formData()` sin límite
  - Documentos candidato: reenvío de buffer acotado; SVG de logos no se pinta como data URI
  - Barra autoritativa / AV / cuarentena siguen en backend (BE-SEC-016)
- [x] **FE-SEC-014** — Logout con revocación demostrable de la familia refresh
  - Spec: `docs/LOGOUT_REFRESH_BACKEND_SPEC.md`; BFF → `POST /auth/logout` y `/auth/refresh`
  - Cookies siempre borradas aunque el API falle; backend: store + replay revoca familia
- [x] **FE-SEC-015** — PDF/reportes: datos autoritativos server-side + cuotas
  - Reportes: `POST` PDF vuelve a pedir filas al backend; ignora `rows`/`summary`/`extras` del cliente
  - Ficha: sin `previewHtml`; Chromium solo esquema JSON del servidor; 413/429 reutilizados
- [x] **FE-SEC-016** — Redirects y OAuth: un solo helper interno + allowlist Google
  - `normalizeInternalPath` + login/`returnUrl` vía helper; Google solo `accounts.google.com/o/oauth2/`
  - State / Proof Key for Code Exchange siguen siendo del backend
- [x] **FE-SEC-017** — Supply chain: SHA de acciones, digest de imagen, Software Bill of Materials / provenance
  - Actions pinneadas a SHA en `spellcheck` / `e2e` / `supply-chain`; builders Cloud Build por digest; sin `:latest`
  - `requestedVerifyOption: VERIFIED`; workflow CycloneDX + `attest-sbom`; etapas con `@dnd-kit` (sin `react-nestable`)
  - Tests: `supply-chain-pins`, `react-nestable-removed`, `stages-reorder-contract`

---

## In Progress

_(vacío)_

---

## Last ToDos

- [ ] **FE-SEC-018** — Verificar Cloud Run / Identity and Access Management / Load Balancer / secretos reales
  - No default service account; ingress y egress de Chromium; evidencia exportada vs `cloudbuild.yaml`
  - Pausado: hace falta acceso al proyecto de Google Cloud para exportar evidencia real

---

## To Do

### Sin empezar

- [ ] **FE-SEC-019** — Controles de IA en backend: esquema, prompt injection, humano en el loop
  - Frontend ya renderiza texto; no acciones solo por salida del modelo
- [ ] **FE-SEC-020** — Data Transfer Object mínimo de documentos (sin `storagePath` / `contentSha256`)
- [ ] **FE-SEC-022** — Errores genéricos, logs redacted, lint/test como gate
  - Sin excepciones en query; `global-error.tsx`; baseline verde
- [ ] **FE-SEC-023** — Quitar artefactos legacy: `chromium-pack.tar`, `vercel.json` si Cloud Run es único, header size 64 KiB
- [ ] **FE-SEC-024** — Mantener `private, no-store` en sesión / información personal / PDF; confirmar borde
  - Dos tenants + back/forward sin mezcla; assets hashed `public, immutable`
