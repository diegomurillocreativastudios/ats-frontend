# Especificación del frontend ATS (documento maestro)

Documento vivo que describe el estado **actual** del repositorio `ats-frontend`, su arquitectura, rutas, integraciones y convenciones. Sirve como índice y base para ampliar documentación (wiki, Confluence, tickets).

**Cómo usar este archivo**

- Mantener una única fuente de verdad aquí; los detalles de contrato API puntuales pueden seguir en `docs/` o archivos `*-SPEC.md`.
- Al añadir módulos: actualizar la tabla de rutas, `lib/`, hooks y dependencias.
- Marcar con *(pendiente)* lo que esté planificado pero no implementado en código.

---

## 1. Resumen del producto

| Aspecto | Descripción |
|--------|-------------|
| **Nombre en UI** | ATS App |
| **Dominio** | SaaS tipo **ATS** (Applicant Tracking System): reclutamiento, vacantes, candidatos, etapas, plantillas, documentos. |
| **Portales** | **Candidato** (`/portal-candidato`, documentos, perfil) y **RRHH** (`/portal-rrhh`, vacantes, candidatos, plantillas, etapas). |
| **Idioma UI** | Principalmente español (rutas y copys en español). |

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión (package.json) |
|------|------------|-------------------------|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Lenguaje | TypeScript | ~5.9 |
| Estilos | Tailwind CSS | 4.x (`@import "tailwindcss"` en `app/globals.css`) |
| Fuentes | `next/font`: Inter, Space Grotesk | — |
| Iconos | lucide-react | ^0.564 |
| Drag & drop (plantillas/etapas) | react-nestable | ^3.0.2 |
| Tests unitarios / componentes | Vitest + Testing Library + jsdom | ver `package.json` |
| E2E | Playwright | ver `package.json` |

**Scripts npm relevantes**

| Script | Propósito |
|--------|-----------|
| `npm run dev` | Desarrollo (aumenta `max-http-header-size` vía `node`) |
| `npm run build` / `npm run start` | Producción |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright (opcionalmente levanta `dev`; ver README) |

---

## 3. Estructura de carpetas (alto nivel)

```
app/                 # App Router: layouts, páginas, route handlers
app/api/auth/        # BFF: login, logout, refresh, me, forgot/reset password
components/          # UI por dominio: auth/, candidato/, rrhh/, ui/, raíz
hooks/               # Hooks de datos y formularios (candidato, usuario)
lib/                 # API client, auth cookies, utilidades de perfil, errores
tests/e2e/           # Playwright + helpers
tests/unit/          # Vitest
docs/                # Especificaciones puntuales (backend, testing)
.cursor/rules/       # Reglas del editor para el equipo
```

**Alias TypeScript:** `@/*` → raíz del repo (`tsconfig.json`).

---

## 4. Configuración y entorno

### 4.1 Variables de entorno

Documentar aquí cada variable que use el código; valores reales solo en `.env.local` (no commitear).

| Variable | Dónde se usa | Notas |
|----------|----------------|-------|
| `NEXT_PUBLIC_API_URL` | Cliente (`apiClient`), SSR que necesita URL pública | Base del backend **sin** barra final inconsistente; el código suele normalizar. |
| `NEXT_PUBLIC_APP_URL` | `lib/api.ts` (origen en servidor para refresh) | Fallback `http://localhost:3000`. |
| `API_URL` / `BACKEND_URL` | `lib/server-backend-url.ts` | Solo servidor (Route Handlers); útil si el backend no es alcanzable con la misma URL que el navegador. |
| `NODE_ENV` | Cookies `secure` en login | `production` activa `secure: true`. |

*(Añadir filas cuando se incorporen analytics, feature flags, etc.)*

### 4.2 Next.js

- Configuración mínima: `next.config.mjs` (sin rewrites documentados en repo).
- No hay `middleware.ts` en el repositorio; la protección de rutas depende de **redirecciones en páginas** (ej. `app/page.ts`) y del flujo de login. Existe `proxy.ts` con lógica de “auth guard” y redirects documentada en comentarios — **no está cableada** a un middleware de Next.js hasta que se añada un archivo `middleware.ts` que la invoque.

### 4.3 Estilos y tema

- **Tailwind v4:** entrada principal `app/globals.css` con `@import "tailwindcss"` y bloque `@theme inline` (tokens `--color-vo-*`, fuentes).
- **`tailwind.config.ts`:** `content` en `app/`, `components/`, `pages/`; `theme.extend.colors` con paleta **VO** (purple, magenta, navy, sky, pink, yellow) y semánticos (destructivo, éxito, muted).
- Marca visual y diseño de auth referenciados en README (`design.pen`, responsive).

---

## 5. Autenticación y sesión

### 5.1 Modelo

- Sesión basada en **cookies** definidas en `lib/auth.ts`:
  - `ats_access_token` — token de acceso (legible por JS para `Authorization` en cliente).
  - `ats_refresh_token` — refresh (**httpOnly** en login).
  - `ats_token_expires` — expiración (epoch seconds).
  - `ats_user` — JSON del usuario (id, name, email, role).
- Helpers: `getAccessToken`, `getCurrentUser`, `hasAuth`, `AUTH_COOKIES`.

### 5.2 Route Handlers (`app/api/auth/`)

| Ruta | Método | Rol |
|------|--------|-----|
| `/api/auth/login` | POST | Proxies a `{BACKEND}/login`, setea cookies, hidrata usuario vía `fetch-backend-session-user` cuando aplica. |
| `/api/auth/logout` | POST | Limpia cookies de sesión. |
| `/api/auth/refresh` | POST | Renueva tokens usando cookie refresh. |
| `/api/auth/me` | GET | Sesión actual (según implementación en repo). |
| `/api/auth/forgot-password` | POST | Encaminado al backend (ver `docs/FORGOT_PASSWORD_BACKEND_SPEC.md`). |
| `/api/auth/reset-password` | POST | Restablecer contraseña. |

### 5.3 Cliente HTTP (`lib/api.ts`)

- `apiClient.request`: concatena `NEXT_PUBLIC_API_URL`, adjunta `Bearer` desde cookie en cliente, `credentials` según endpoint.
- **401:** intenta `/api/auth/refresh`; si falla, redirige a `/auth/iniciar-sesion`.
- Métodos: `get`, `post`, `put`, `patch`, `delete`, `postFormData` (multipart).

### 5.4 Flujos de password

- Contrato detallado de pantallas forgot/reset y API: **`spec-fe.md`** (raíz del repo) y **`docs/FORGOT_PASSWORD_BACKEND_SPEC.md`**.
- Rutas UI: `/recuperar-contrasena`, `/auth/forgot-password`, `/auth/restablecer-contrasena`, `/restablecer-contrasena` (convivencia de paths por enlaces y marketing).

### 5.5 Guardas y entrada

- **`app/page.ts`:** si no hay `ats_access_token` → `/auth/iniciar-sesion`; si hay → `/seleccion-portal`.
- Tras login exitoso, el producto dirige a selección de portal (`/seleccion-portal`).
- **`proxy.ts`:** lógica documentada para paths públicos, redirects desde `/iniciar-sesion` y `/crear-cuenta`, y exclusión de reset con token si hay sesión — requiere **middleware** para aplicarse globalmente *(estado actual: archivo presente, middleware no registrado)*.

---

## 6. Mapa de rutas (App Router)

### 6.1 Páginas

| Ruta | Descripción breve |
|------|-------------------|
| `/` | Redirección según cookie (ver §5.5). |
| `/seleccion-portal` | Elección entre portal candidato y RRHH. |
| `/auth/iniciar-sesion` | Login. |
| `/auth/registrarse` | Registro. |
| `/auth/forgot-password` | Olvidé contraseña (wrapper puede delegar a contenido compartido). |
| `/auth/restablecer-contrasena` | Reset con `token` en query. |
| `/recuperar-contrasena` | Variante de flujo recuperación. |
| `/restablecer-contrasena` | Variante de página de reset. |
| `/portal-candidato` | Home portal candidato. |
| `/portal-candidato/documentos` | Documentos. |
| `/portal-rrhh` | Dashboard RRHH. |
| `/portal-rrhh/vacantes` | Listado vacantes. |
| `/portal-rrhh/vacantes/[id]` | Detalle vacante. |
| `/portal-rrhh/candidatos` | Listado candidatos. |
| `/portal-rrhh/candidatos/[candidateId]` | Perfil candidato (RRHH). |
| `/portal-rrhh/plantillas` | Plantillas. |
| `/portal-rrhh/etapas` | Etapas del proceso. |
| `/mi-perfil` | Perfil del usuario autenticado. |

### 6.2 Layouts

- `app/layout.tsx`: fuentes, `PageTitle`, `globals.css`.
- Layouts anidados por área: `portal-candidato`, `mi-perfil`, `portal-rrhh` (y sub-layouts `layout.ts` donde existan) — revisar archivo por archivo para reglas de shell (sidebar, topbar).

*(Añadir aquí capturas o wireframes cuando existan.)*

---

## 7. Componentes por dominio

| Área | Ubicación | Ejemplos de piezas |
|------|-----------|---------------------|
| Auth | `components/auth/` | `AuthBrand`, inputs y botones específicos auth |
| Candidato | `components/candidato/` | Sidebars, topbar, tarjetas dashboard, documentos, edición de perfil, snackbar |
| RRHH | `components/rrhh/` | Sidebar, topbar, modales (vacante, plantilla, etapa, estados), listas recientes, stats |
| UI genérico | `components/ui/` | `Button`, `Input`, `Modal`, `Snackbar` |
| Global | `components/` | `PageTitle` (título documento según ruta) |

---

## 8. Lógica compartida (`lib/`)

Inventario orientativo (ampliar al agregar archivos):

| Ámbito | Archivos / tema |
|--------|------------------|
| API | `api.ts`, `api-error.ts`, `server-backend-url.ts` |
| Auth | `auth.ts`, `fetch-backend-session-user.ts` |
| Candidato / perfil | `candidate-*.ts`, `profile-form-options.ts`, `recruiter-canonical-profile-merge.ts`, etc. |
| UX / formato | `pageTitles.ts`, `getInitials.ts`, `formatPhoneSv.ts`, `normalizeCountryDisplay.ts` |
| RRHH | `recruiterStagePayload.ts` |
| Enlaces sociales | `social-link-presets.ts` |

Contratos backend adicionales: `docs/CANDIDATE_PROFILE_PUT_BACKEND_SPEC.md`.

---

## 9. Hooks (`hooks/`)

| Hook | Propósito (resumido) |
|------|----------------------|
| `useCurrentUser` | Usuario desde cookies / estado cliente |
| `useCandidateProfile` | Perfil candidato (RRHH o flujos asociados) |
| `useCandidateSelfProfile` | Perfil propio (portal candidato) |
| `use-candidate-profile-editor` | Edición de formulario de perfil |
| `useCandidateDashboard` | Datos agregados del dashboard candidato |

---

## 10. Testing

| Tipo | Herramienta | Ubicación | Notas |
|------|-------------|-----------|--------|
| Unit / componentes | Vitest | `tests/unit/`, configuración `vitest.setup.ts` | `npm run test` |
| E2E | Playwright | `tests/e2e/`, `tests/e2e/helpers/` | Requiere API para flujos reales; ver `playwright.config.ts` y README |
| Plan maestro | — | `docs/TESTING_PLAN.md` | Cobertura objetivo y fases |

Variables útiles: `PLAYWRIGHT_SKIP_WEBSERVER`, `PLAYWRIGHT_BASE_URL`.

---

## 11. Documentación relacionada en el repo

| Archivo | Contenido |
|---------|-----------|
| `README.md` | Instalación, scripts, testing, notas de diseño |
| `spec-fe.md` | Contrato forgot/reset password (frontend vs API) |
| `docs/TESTING_PLAN.md` | Estrategia de pruebas |
| `docs/FORGOT_PASSWORD_BACKEND_SPEC.md` | Especificación backend recuperación |
| `docs/CANDIDATE_PROFILE_PUT_BACKEND_SPEC.md` | Perfil candidato PUT |

---

## 12. Convenciones del equipo (resumen)

- **TypeScript** con path `@/`; reglas estrictas parcialmente relajadas en `tsconfig` (`noImplicitAny`, `strictNullChecks` en false — valorar endurecer con el tiempo).
- **Estilo:** proyecto mezcla comillas y estilos; al editar, **seguir el archivo vecino**.
- **Reglas Cursor:** `.cursor/rules/` — Next, Playwright, frontend general (locators, Tailwind, etc.).
- **Commits:** Conventional Commits (ver reglas del workspace).

---

## 13. Roadmap / extensiones *(rellenar)*

Usar esta sección para planificar sin mezclar con el inventario factual.

- [ ] Middleware global usando `proxy.ts` o equivalente
- [ ] Internacionalización (i18n) si se requiere
- [ ] Mapa de estados de vacantes y pipeline documentado en UI
- [ ] Observabilidad (logs cliente, métricas Web Vitals)

---

## 14. Changelog de este documento

| Fecha | Cambio |
|-------|--------|
| 2026-04-14 | Creación inicial: inventario stack, rutas, auth, lib, tests y referencias. |

---

*Fin del documento base — añadir secciones nuevas debajo de §13 o como anexos numerados.*
