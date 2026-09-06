# Hardening de seguridad — ToDo

Fuente: auditoría frontend 2026-07-21 (24 hallazgos FE-SEC).  
Al cerrar un ítem: marcar `- [x]`, moverlo a **Done** si hace falta, y actualizar el conteo.

**Conteo:** Done 2 · In Progress 0 · Last ToDos 0 · To Do 22

**Antes del primer PR:** autorización explícita; coordinar con backend la evidencia de **FE-SEC-007**. Un lote = un PR pequeño. No agrupar todo.

---

## Done

- [x] **FE-SEC-001** — Reset de password solo con token; forgot sin enumeración
  - UI/handler: `reset-password`, `RestablecerContrasenaContent`, `olvidaste-tu-contrasena`; spec `docs/FORGOT_PASSWORD_BACKEND_SPEC.md`
  - Backend-for-Frontend de forgot normaliza 404/400-enumeración a 200 genérico; reset exige token
- [x] **FE-SEC-013** — Forgot password: respuesta uniforme (status, tamaño, latencia)
  - Front: sin `exists` / `success` distinguibles; 404/400-enumeración → 200 genérico
  - Rate limit por IP/cuenta y padding de tamaño/latencia siguen siendo del backend

---

## In Progress

_(vacío)_

---

## Last ToDos

_(vacío)_

---

## To Do

### Sin empezar

- [ ] **FE-SEC-002** — XSS en plantillas HTML: quitar sink offscreen y placeholders raw
  - `report-template-detail-client.tsx`: no `dangerouslySetInnerHTML` en el documento principal
  - `template-interpolate.ts`: eliminar `{{{...}}}` / sufijo `*Html`; sanitizar al guardar y al renderizar
- [ ] **FE-SEC-003** — SSRF / red en Chromium PDF: denegar red por defecto
  - Interceptor en `html-to-pdf-chromium.ts`; parser allowlist (no regex); cuotas/timeout
  - Renderer schema-driven o servicio aislado queda en **FE-SEC-015** / lote PDF
- [ ] **FE-SEC-004** — Access token HttpOnly + Backend-for-Frontend
  - Hoy `httpOnly: false` + `document.cookie` + `Authorization: Bearer` desde el navegador
  - CSRF robusto es requisito previo o simultáneo (**FE-SEC-011**)
- [ ] **FE-SEC-005** — Parchear Next.js / `ws` y transitivas productivas
  - PR dedicado de lockfile; `npm audit --omit=dev` sin High/Critical abiertos
- [ ] **FE-SEC-006** — Runtime Node Long Term Support (hoy imagen `node:20`, End of Life 2026-04-30)
  - Preferir 24; fijar `engines` e imagen por digest
- [ ] **FE-SEC-007** — Verificar autorización multiempresa / ownership en backend
  - El frontend no es el control; IDs y `sessionStorage.companyId` son manipulables
  - Cierre: matriz 403/404 dos tenants × roles × documentos/PDF. Quitar storage si sobra
- [ ] **FE-SEC-008** — Quitar `admin/admin` y fallback end-to-end a servicio externo
  - Login, `.github/workflows/e2e.yml`, `global-setup.ts`, helpers; CI falla cerrado sin secretos
- [ ] **FE-SEC-009** — Sesión fail-closed: sin identidad/rol desde cookie `ats_user`
  - `lib/server-session-user.ts`, `/api/auth/me`, `proxy.ts`; backend caído → 401/503
- [ ] **FE-SEC-010** — Headers defensivos + Content Security Policy Report-Only → enforcement
  - `poweredByHeader: false`; nosniff / referrer / frame-ancestors; HSTS solo tras inventario HTTPS
- [ ] **FE-SEC-011** — Cross-Site Request Forgery en mutaciones cookie-auth
  - Origin allowlist + Fetch Metadata + token; cubre refresh/logout/documentos/PDF
- [ ] **FE-SEC-012** — Uploads: allowlist / magic bytes / tamaño / cuota en servidor
  - BFF no hace `formData()` sin límite; SVG de logos bloqueado o aislado
  - Barra autoritativa en backend; AV/cuarentena alineada con BE-SEC-016
- [ ] **FE-SEC-014** — Logout con revocación demostrable de la familia refresh
  - Borrar cookies aunque el backend falle; replay de refresh revoca familia
- [ ] **FE-SEC-015** — PDF/reportes: datos autoritativos server-side + cuotas
  - No confiar en filas/HTML del cliente; 413/429; cola si el trabajo es caro
- [ ] **FE-SEC-016** — Redirects y OAuth: un solo helper interno + allowlist Google
  - Login usa `normalizeInternalPath`; state / Proof Key for Code Exchange en backend
- [ ] **FE-SEC-017** — Supply chain: SHA de acciones, digest de imagen, Software Bill of Materials / provenance
  - Reemplazar `react-nestable` (React 15/18 transitivos)
- [ ] **FE-SEC-018** — Verificar Cloud Run / Identity and Access Management / Load Balancer / secretos reales
  - No default service account; ingress y egress de Chromium; evidencia exportada vs `cloudbuild.yaml`
- [ ] **FE-SEC-019** — Controles de IA en backend: esquema, prompt injection, humano en el loop
  - Frontend ya renderiza texto; no acciones solo por salida del modelo
- [ ] **FE-SEC-020** — Data Transfer Object mínimo de documentos (sin `storagePath` / `contentSha256`)
- [ ] **FE-SEC-021** — `apiClient` no adjunta bearer a URLs absolutas
- [ ] **FE-SEC-022** — Errores genéricos, logs redacted, lint/test como gate
  - Sin excepciones en query; `global-error.tsx`; baseline verde
- [ ] **FE-SEC-023** — Quitar artefactos legacy: `chromium-pack.tar`, `vercel.json` si Cloud Run es único, header size 64 KiB
- [ ] **FE-SEC-024** — Mantener `private, no-store` en sesión / información personal / PDF; confirmar borde
  - Dos tenants + back/forward sin mezcla; assets hashed `public, immutable`
