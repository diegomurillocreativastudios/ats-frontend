# ApplicanTree — Auditoría frontend (UI / arquitectura)

**Fecha:** 13 de octubre de 2026  
**Repositorio:** `ats-frontend`  
**Alcance:** Solo análisis y documentación. No se modificó código de producto ni se implementó Portal Pruebas.  
**Marca oficial:** ApplicanTree (`lib/app-brand.ts`). El nombre comercial en código es **ApplicanTree** (no “ApplicantTree”).

---

## Resumen ejecutivo

ApplicanTree es un SaaS de Applicant Tracking System construido con **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS 4** y **next-intl**. El frontend organiza la experiencia en portales por rol (`portal-admin`, `portal-rrhh`, `portal-candidato`, `portal-oportunidades`) más auth y selección de portal.

La identidad visual es **verde Applican + “Apple Glass”** (fondos claros, superficies translúcidas, blur, borde hairline, sombras suaves). Los portales staff (RRHH y Admin) comparten el mismo chrome: shell a altura de viewport (`h-dvh`), sidebar fija desde `lg` (1024px), topbar compacta por debajo, y un `main` con scroll único.

**Conclusión para Portal Pruebas:** debe nacer como un portal más dentro de la app existente, reutilizando tokens CSS, shells de navegación, componentes `components/ui/*`, patrones de BFF (`/api/bff`), roles/guards y namespaces i18n. No debe introducir una quinta estética ni un cliente HTTP paralelo.

### Alcance de la auditoría visual

| Superficie | Método | Viewports inspeccionados |
|---|---|---|
| `/auth/iniciar-sesion` | Navegador real + capturas | Desktop ~1440×900 (layout split marca + formulario) |
| `/portal-oportunidades` | Navegador real + capturas | Desktop ~1440×900; Mobile ~375×812 |
| `/portal-rrhh` sin sesión | Navegador real | Redirección confirmada a `/auth/iniciar-sesion?from=%2Fportal-rrhh` |
| Portal RRHH / Admin autenticados | **Solo código** | Sin credenciales de sesión; no se afirman capturas de dashboard, listas o catálogos internos |

---

## Arquitectura del frontend

### Stack

| Pieza | Versión / detalle | Archivo clave |
|---|---|---|
| Next.js | `16.3.4` (App Router, `output: "standalone"`) | `package.json`, `next.config.mjs` |
| React | `19.2.3` | `package.json` |
| TypeScript | `^5.9.3` | `tsconfig.json` |
| Tailwind | `^4` + `@tailwindcss/postcss` | `app/globals.css`, `tailwind.config.ts`, `postcss.config.mjs` |
| i18n | `next-intl` `^4.13.0` | `i18n/*`, `messages/*` |
| Iconos | `lucide-react` | — |
| Gráficas | `recharts` `^3.8.1` | p. ej. `components/rrhh/vacancy-resultados/vacancy-pipeline-charts.tsx` |
| DnD | `@dnd-kit/*` | Catálogos admin (etapas ordenables) |
| PDF / headless | `jspdf`, `pdfkit`, `puppeteer-core`, `@sparticuz/chromium` | Rutas API de ficha técnica |
| Tests | Vitest + Playwright | `tests/unit/`, `tests/e2e/` |
| Node | `>=24 <25` (`.nvmrc`) | `package.json` |

### Organización de carpetas

```txt
app/                  # Rutas App Router (portales, auth, API routes)
components/           # UI por oficio: portal-admin/, rrhh/, candidato/, public/, auth/, ui/, navigation/, branding/
lib/                  # Dominio, API, auth, roles, reportes, vacancies, security
hooks/                # Hooks de datos/UI (dashboard, perfil, viewport, etc.)
i18n/                 # routing, request config, navigation seam
messages/             # es, en, de, fr, it
proxy.ts              # Edge gate (auth cookie + CSRF + security headers / CSP)
```

### Capas de responsabilidad

1. **`proxy.ts`** — presencia de cookie de access token, rutas públicas, CSRF en mutaciones, headers de seguridad y CSP con nonce (FE-SEC-010).
2. **Layouts de portal** — `requirePortal*User()` valida sesión contra backend y rol.
3. **Páginas `app/`** — orquestación; UI pesada en `components/<oficio>/`.
4. **`lib/api*`** — cliente BFF same-origin; módulos de dominio por recurso.
5. **`hooks/`** — estado de carga/error/datos en cliente cuando hace falta.

No hay URLs absolutas de backend en el cliente: todo pasa por `/api/bff/...` (`lib/api.ts` → `resolveBffUrl`).

---

## Sistema de diseño actual

### Fuentes (Google Fonts vía `next/font`)

Definidas en `app/layout.tsx`:

| Rol | Familia | Variable CSS |
|---|---|---|
| UI / body | Inter | `--font-inter` |
| Display / headings / brand | Manrope | `--font-manrope` |
| Editorial / énfasis | Fraunces (700 italic) | `--font-fraunces` |

Uso semántico en `app/globals.css`:

- `body` → Inter (`font-sans`)
- `h1–h6` → Manrope
- `.font-brand` → Manrope
- `.font-serif` → Fraunces (p. ej. énfasis “Portal de Oportunidades” en la landing pública)

### Paleta real (tokens)

Fuente canónica CSS: `app/globals.css` (`:root`). Espejo TS para PDFs/HTML: `lib/brand-colors.ts`.

| Token | Valor | Uso |
|---|---|---|
| `--color-green-primary` | `#6EB940` | Primario / CTA |
| `--color-green-light` | `#549E3C` | Hover primario |
| `--color-green-medium` | `#438C39` | Secundario |
| `--color-green-dark` | `#337C37` | Hover secundario |
| `--color-green-deep` | `#256D35` | Texto activo en nav |
| `--color-text-gray` | `#57585B` | Texto principal |
| `--ats-arena` | `#E8F5E0` | Bordes / muted / inputs |
| `--ats-cobre-light` | `#A8D98A` | Acento claro |
| `--ats-terracotta-soft` | `#D4EDCC` | Fondo item activo |
| `--background` | `#F4F7F2` | Fondo app |
| `--destructive` | `#DC2626` | Error / destructivo |
| `--muted-foreground` | `#75767A` | Texto secundario |

**Aliases legacy** aún usados en clases Tailwind: `--vo-purple`, `--vo-magenta`, `--ats-terracotta`, etc. Todos remapean a la escala verde (no hay púrpura real en runtime).

### Glass / superficies

Variables:

- `--glass-bg-1`, `--glass-bg-2`, `--glass-border`, `--glass-border-strong`
- `--glass-hairline`, `--glass-highlight`
- `--glass-shadow` / `--glass-shadow-lg`
- `--glass-blur: 16px`

Clases reutilizables (capa `@layer components` en `globals.css`):

- Fondos: `.app-premium-bg`, `.page-gradient-bg`, `.premium-gradient-bg`
- Superficies: `.glass-panel`, `.glass-card`, `.glass-card-hover`, `.glass-navbar`, `.glass-sidebar`, `.glass-modal`, `.glass-input`, `.glass-button`
- Detalle: `.glass-iridescent-border`, `.ambient-orb*`, `.animate-fade-in`, `.animate-slide-up`

Fondo de `body`: degradados radiales verdes/azulados suaves + gradient lineal `#F8FAF6 → #EEF4EC`, `background-attachment: fixed`.

### Espaciado, radios, sombras

| Aspecto | Convención observada |
|---|---|
| Escala | Tailwind (base 4px): `gap-0.5`, `p-4`, `px-4 py-6`, `md:px-8` |
| Radio default (config) | `6px` (`tailwind.config.ts` → `borderRadius.DEFAULT`) |
| Cards / modales | `rounded-xl` / `rounded-2xl` |
| Sidebar width | `260px` (`PortalSidebarFrame`) |
| Sombras glass | `0 10px 30px rgba(87,88,91,0.10)` y variante lg |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-vo-purple` (verde) |

### Breakpoints (Tailwind default)

| Prefijo | Ancho mínimo | Uso en portales |
|---|---|---|
| (base) | 0 | Mobile / tablet: topbar compacta + drawer |
| `sm` | 640px | Grids de selección de portal, headers split |
| `md` | 768px | Padding de página (`md:px-8`) |
| `lg` | 1024px | **Sidebar visible**; topbar desktop; filtros en línea |
| `xl` / `2xl` | 1280 / 1536 | Grids densos puntuales |

Hook de producto: `hooks/use-is-below-lg.ts` → `(max-width: 1023px)`.

En `≤768px`, el blur glass se reduce (rendimiento) en `globals.css`.

---

## Estructura de navegación y layouts

### Mapa de portales

| Ruta base | Rol | Shell / guard |
|---|---|---|
| `/portal-admin/*` | `admin` | `PortalAdminShell` + `requirePortalAdminUser()` |
| `/portal-rrhh/*` | `recruiter` (+ admin) | `RrhhPortalShell` por página + `requirePortalRecruiterUser()` |
| `/portal-candidato/*` | `candidate` (+ admin) | `CandidatePortalShell` + `requirePortalCandidateUser()` |
| `/portal-oportunidades/*` | público | Layout público (sin shell staff) |
| `/seleccion-portal` | staff autenticado | Cards según `getAccessiblePortalKeys()` |
| `/auth/*` | público (parcial) | `AuthSplitShell` + `LoginBrandPanel` |

Homes resueltos en `lib/portal-access.ts`:

- candidate → `/portal-candidato`
- opportunities → `/portal-oportunidades`
- rrhh → `/portal-rrhh`
- admin → `/portal-admin/administracion/usuarios`

### Patrón de shell (RRHH / Admin / Candidato)

Compartido conceptualmente:

```txt
[ sidebar lg+ ] | [ topbar desktop lg+ ]
                | [ topbar tablet <lg  ]
                | [ main scrollable     ]
```

Implementaciones:

- `components/rrhh/rrhh-portal-shell.tsx`
- `components/portal-admin/PortalAdminShell.tsx`
- `components/candidato/candidate-portal-shell.tsx`

Admin aplica el shell en el **layout** (`app/portal-admin/layout.tsx`).  
RRHH aplica el shell **por página** (permite `lockMainScroll` / breadcrumbs distintos).  
Candidato: shell por página + `CandidateSnackbarProvider` en layout.

### Navegación RRHH (`components/rrhh/RRHHSidebar.tsx`)

- Inicio → `/portal-rrhh`
- Candidatos → `/portal-rrhh/candidatos`
- Vacantes → `/portal-rrhh/vacantes`
- Entrevistas → `/portal-rrhh/entrevistas` (también activa `/portal-rrhh/interviews/*`)
- Reportes → `/portal-rrhh/reportes`
- Configuración (abajo) → `/portal-rrhh/configuracion`

### Navegación Admin (`lib/admin-portal-nav.ts` + `AdminSidebar`)

Grupos:

1. **Vacantes** — etapas, estados, departamentos, modalidades, tipos, habilidades blandas, leyes de protección de datos, empresas  
2. **Plantillas**  
3. **Entrevistas** — tipos, modalidades, estados  
4. **Administración** — usuarios, tipos de documento, recordatorios de presentación  
5. **Configuración**

### Chrome compartido de navegación

- `components/navigation/portal-sidebar.tsx` — frame, nav items, grupos, footer de usuario  
- `components/navigation/portal-topbar.tsx` — breadcrumbs, menú cuenta, language switcher  
- `components/navigation/portal-nav-drawer.tsx` — menú lateral en viewports `<lg`  
- `components/branding/ProductBrand.tsx` — logo + wordmark

---

## Componentes reutilizables

### `components/ui/` (sistema base)

| Componente | Archivo | Rol |
|---|---|---|
| Button | `Button.tsx` | Variantes `primary \| secondary \| outline \| ghost \| strong` + `loading` |
| Input | `Input.tsx` | Campo tipado del design system |
| Modal | `Modal.tsx` | Portal a `body`, glass modal, animaciones enter/exit |
| Snackbar | `Snackbar.tsx` | Toast fijo; variantes success/error/warning/info |
| PortalPageHeader | `PortalPageHeader.tsx` | Título + descripción + acciones |
| ResponsiveFilters | `responsive-filters.tsx` | Filtros inline en `lg+`; modal debajo |
| ListPaginationBar | `list-pagination-bar.tsx` | Paginación de listados |
| DatePicker | `date-picker.tsx` | Fecha |
| PhoneCountryInput | `PhoneCountryInput.tsx` | Teléfono + país |
| StarRating | `StarRating.tsx` | Valoraciones |

### Navegación / branding / auth

- `ProductBrand`, `ApplicanTreeLogo`, `AppliAiLogo`
- `LanguageSwitcher`
- Auth: `AuthSplitShell`, `LoginBrandPanel`, `LinkedInLoginButton`, `OtpCodeInput`, inputs/botones de auth

### Portal Admin

- `PortalAdminShell`, `AdminSidebar`, `AdminTopbar`
- `admin-page-chrome.tsx` — frame, superficies, tabla, búsqueda, estados loading
- Contenidos CRUD: usuarios, empresas, catálogos de vacante/entrevista, plantillas, leyes, recordatorios
- `sortable-stages-list.tsx` (DnD)

### Portal RRHH

- Shell + sidebar + topbar
- Vacantes: `VacancyListCard`, filtros, modales nueva/finish, badges publicación, resultados/pipeline charts
- Candidatos: perfil reclutador, modal perfil, entrevistas
- Ficha técnica: `components/rrhh/technical-sheet/*`
- Reportes: hub + shells + vistas por `reportKey`
- Dashboard: metric cards, shortcuts, reminders
- Entrevistas / Google Calendar settings

### Portal Candidato

- Shell, home, documentos, perfil, adecuación de perfil, snackbar provider

### Compartido

- `VacancyLocationLabel`, `copy-public-vacancy-link-button`

---

## Comportamiento responsive

### Estrategia

**Mobile-first con corte crítico en `lg` (1024px)** para el chrome de portales autenticados.

| Viewport | Comportamiento |
|---|---|
| **Mobile (&lt;768px)** | Sin sidebar; topbar compacta (hamburguesa + logo + acciones); filtros en modal (`ResponsiveFilters`); blur glass reducido; padding `px-4` |
| **Tablet (768–1023px)** | Igual patrón de shell que mobile (topbar `variant="tablet"`); más padding (`md:px-8`); grids `sm:` / `md:` |
| **Desktop (≥1024px)** | Sidebar 260px; topbar con breadcrumbs; filtros en línea; layouts densos de tablas/listas |

### Piezas clave

- `useIsBelowLg()` — fuente de verdad JS para UI condicional  
- `PortalNavDrawer` — navegación off-canvas  
- `AuthSplitShell` — en `lg+` grid 55/45 (panel marca + formulario); debajo, marca oculta / logo compacto  
- Landing oportunidades — hero más aéreo; en mobile se apila (captura ~375px verificada)

### Accesibilidad responsive (reglas del repo)

- Área táctil mínima 44×44  
- `prefers-reduced-motion` desactiva animaciones glass/auth  
- Focus visible en controles compartidos

---

## Autenticación y rutas protegidas

### Flujo

1. **Edge (`proxy.ts`)**  
   - Si no hay cookie `AUTH_COOKIES.access` y la ruta no es pública → redirect a `/auth/iniciar-sesion?from=...`  
   - Si hay token y se visita login/registro → redirect a `/seleccion-portal`  
   - CSRF en mutaciones (`assertMutationCsrf`)  
   - Headers + CSP nonce  

2. **Públicas** (`lib/auth/public-paths.ts`): auth pages, `/portal-oportunidades`, privacy, APIs, assets estáticos.

3. **Servidor (layouts)** — `lib/server-session-user.ts`  
   - `lookupServerSession()` consulta backend con access token (fail-closed; no confía en cookie `ats_user` para identidad).  
   - `requirePortalAdminUser` / `requirePortalRecruiterUser` / `requirePortalCandidateUser`  
   - Rol incorrecto → `/seleccion-portal`  
   - Backend no disponible → login con `error=service-unavailable`

4. **Roles** (`lib/roles.ts`)  
   - Admin: `admin`  
   - Recruiter: `recruiter` / contiene `rrhh` / human resources  
   - Candidate: contiene `candidate` / `candidato`  
   - `canChangePortal` solo admin/recruiter  

5. **Selección de portal** (`lib/portal-access.ts`)  
   - Admin: candidato + oportunidades + rrhh + admin  
   - Recruiter: oportunidades + rrhh  
   - Candidate: solo candidato  

6. **Cliente API** — 401 → intento `/api/auth/refresh` → si falla, redirect a login.

**Verificación visual:** acceso a `/portal-rrhh` sin cookie redirige a login con `from=%2Fportal-rrhh`.

---

## Internacionalización

### Configuración

- Locales: `es` (default/fallback), `en`, `it`, `de`, `fr` — `i18n/routing.ts`  
- Locale por cookie `NEXT_LOCALE` (sin prefijo `/en` en URL) — `i18n/request.ts`  
- Plugin Next: `createNextIntlPlugin()` en `next.config.mjs`  
- Provider: `NextIntlClientProvider` en `app/layout.tsx`  
- Merge profundo: claves faltantes heredan de `messages/es.json`

### Estructura de mensajes

Namespaces top-level en `messages/es.json` (~4700+ líneas):

`Common`, `Actions`, `Navigation`, `Topbar`, `Sidebar`, `Auth`, `Validation`, `Errors`, `Metadata`, `PortalSelection`, `CandidatePortal`, `LanguageSwitcher`, `RecruiterPortal`, `AdminPortal`, `CvOutputLanguage`, `PublicOpportunities`, `PrivacyPolicy`

Uso típico:

- Server: `getTranslations("Metadata.recruiterPortal")`  
- Client: `useTranslations("Navigation")`, `useTranslations("RecruiterPortal.reports")`

Documentación interna: `docs/frontend-i18n-setup.md`, `docs/frontend-i18n-scope.md`.

**Implicación Portal Pruebas:** añadir namespace (p. ej. `TestsPortal` / `PruebasPortal`) en los **cinco** JSON y claves de `Metadata` / `Navigation` / `PortalSelection`.

---

## Integración con el backend

### BFF same-origin

- Cliente: `lib/api.ts` → `apiClient.get/post/put/patch/delete/postFormData`  
- URL: `/api/bff` + path relativo de backend  
- Credenciales: `credentials: "include"`  
- Mutaciones: headers CSRF (`csrfHeaders`)  
- Prohibido: URLs `http(s)://` absolutas en el cliente (FE-SEC-021)

Proxy: `app/api/bff/[...path]/route.ts` — reenvía al backend servidor, limita body de uploads, cache privada.

### Módulos de dominio (`lib/api/`)

Ejemplos: `recruiter-vacancies.ts`, `recruiter-candidates.ts`, `recruiter-reports*.ts`, `interviews.ts`, `technical-sheet.ts`, `admin-users.ts`, `admin-vacancy-catalogs.ts`, `public-vacancies.ts`, `candidates.ts`, etc.

### Estados de carga / error / éxito

Patrón habitual en hooks (`hooks/use-*.ts`, `useCandidate*.ts`):

- `loading: boolean`  
- `error: string | null` (o tipado)  
- `data` + `refetch`  

UI:

- Spinners (`Loader2` lucide, `Button loading`)  
- Mensajes vía `getApiErrorMessage` / `lib/api-error.ts`  
- Feedback global: `Snackbar` (success/error/warning/info)  
- Chrome admin: estados de tabla vacía / loading en `admin-page-chrome.tsx`  
- Listados públicos: copy de “Preparando el listado…” mientras cargan filtros/datos  

No hay un store global tipo Redux/Zustand: estado local + hooks + Server Components donde aplica.

---

## Pantallas existentes relevantes

Referencias útiles para diseñar Portal Pruebas (listados, evaluación, reportes, CRUD).

### Vacantes (RRHH)

| Ruta | Notas |
|---|---|
| `/portal-rrhh/vacantes` | Listado + filtros + `VacancyListCard` |
| `/portal-rrhh/vacantes/[id]` | Detalle / pipeline de candidatos |
| `/portal-rrhh/vacantes/[id]/resultados` | Resultados + charts Recharts |
| `/portal-rrhh/vacantes/[id]/interviews` | Entrevistas por vacante |
| `/portal-rrhh/vacantes/[id]/candidatos/[candidateProfileId]/technical-sheet` | Ficha técnica |

### Candidatos / aplicaciones

| Ruta | Notas |
|---|---|
| `/portal-rrhh/candidatos` | Listado; modelo incluye `recruitment.evaluations` |
| `/portal-rrhh/candidatos/[candidateId]` | Perfil reclutador |
| `/portal-rrhh/candidatos/[candidateId]/interviews` | Entrevistas del candidato |
| `/portal-oportunidades` | Postulación pública (referencia UX abierta) |
| `/portal-oportunidades/[vacanteId]/aplicar` | Flujo aplicar |

### Evaluaciones / ficha técnica / feedback

| Ruta / pieza | Notas |
|---|---|
| Technical sheet pages + modals | `components/rrhh/technical-sheet/*` |
| `/portal-rrhh/reportes/evaluaciones-tecnicas` | Hub de reporte `technical-evaluations` |
| `interview-feedback-modal.tsx` | Feedback de entrevista |
| `StarRating` | Componente de puntuación |

### Reportes (RRHH)

Hub: `/portal-rrhh/reportes` (`ReportsHubClient` + `PortalPageHeader`).

Rutas especializadas:

- `resumen`, `avance-vacantes-por-cliente`, `estatus-candidatos-por-etapa`
- `fuentes-reclutamiento`, `evaluaciones-tecnicas`
- `recruiter-productivity`, `salary-expectations`, `preliminary-match-scores`
- `/portal-rrhh/reportes/[id]` plantilla dinámica

### Admin (catálogos / CRUD — patrón de tablas)

- Usuarios, empresas, etapas/estados, departamentos, modalidades, tipos, habilidades blandas  
- Tipos/estados/modalidades de entrevista  
- Plantillas, tipos de documento, recordatorios  

Patrón visual: `AdminPageFrame` + `ADMIN_TABLE_*` + búsqueda + modales + Snackbar.

### Dashboard RRHH

`/portal-rrhh` → `RecruiterDashboard` (métricas, atajos, recordatorios).

---

## Convenciones de desarrollo

Documentadas también en `.cursor/rules/frontend-architecture.mdc` y `ux-ui-design.mdc`.

| Tema | Convención |
|---|---|
| Nombres de archivos/dirs | kebab-case (`rrhh-portal-shell.tsx`, `portal-admin/`) |
| Componentes | Named exports preferidos; `function` components |
| Client vs Server | Server Components por defecto; `'use client'` solo con estado/eventos |
| Copy de producto | En `messages/*.json`, no hardcodeado |
| Colores | Tokens CSS / clases `ats-*` / `vo-*`; evitar hex sueltos nuevos |
| Iconos | Lucide; no emojis como iconografía de producto |
| API | Solo `lib/api` / módulos `lib/api/*`; nunca fetch absoluto al backend |
| Tests | Vitest en `tests/unit/` al cambiar UI/navegación; `npm run qa` antes de push |
| Portales | No inventar un quinto portal con estética propia; extender el modelo actual |

---

## Recomendaciones para integrar Portal Pruebas

### Qué reutilizar (obligatorio para coherencia)

1. **Tokens y glass** — `app/globals.css`, `lib/brand-colors.ts`, clases `.glass-*` / `.bg-card`  
2. **Chrome de portal** — `PortalSidebarFrame`, topbar compartida, patrón `h-dvh` + sidebar `lg`  
3. **UI base** — `Button`, `Input`, `Modal`, `Snackbar`, `PortalPageHeader`, `ResponsiveFilters`, paginación  
4. **Auth / acceso** — extender `PortalKey`, `PORTAL_HOME_HREF`, `getAccessiblePortalKeys`, guards `requirePortal*`, cards en `/seleccion-portal`  
5. **i18n** — nuevo namespace + nav + metadata en 5 idiomas  
6. **BFF** — nuevos módulos en `lib/api/` consumidos vía `apiClient`  
7. **Patrones de pantalla** — listados tipo Admin CRUD o RRHH cards; reportes hub si hay métricas; modales para crear/editar  

### Estructura sugerida (sin implementar aún)

```txt
app/portal-pruebas/          # rutas + layout con require*
components/pruebas/          # shell, sidebar, pantallas del oficio
lib/api/pruebas-*.ts         # endpoints de dominio
messages/*                   # namespace PruebasPortal (o TestsPortal)
lib/portal-access.ts         # nueva PortalKey
lib/roles.ts                 # helper is*Role si el backend define rol dedicado
```

### Decisiones de producto a cerrar antes de diseñar

- ¿Quién entra? (admin, recruiter, rol nuevo `tester` / `evaluator`)  
- ¿Es catálogo/admin CRUD, pipeline tipo RRHH, o hub de reportes?  
- ¿Nombre de ruta en español (`portal-pruebas`) alineado al resto?  
- ¿Aparece en selección de portal para admin y/o recruiter?

### Referencias de diseño prioritarias

1. **Shell + nav** — copiar el contrato de `RrhhPortalShell` / `PortalAdminShell`  
2. **Listados densos** — `admin-page-chrome` si es CRUD; `VacancyListCard` si es exploración  
3. **Evaluación** — ficha técnica + `StarRating` + modales de feedback  
4. **Reportes** — hub de reportes RRHH si Portal Pruebas expone resultados agregados  

---

## Riesgos y aspectos pendientes

1. **Auditoría visual incompleta de portales autenticados** — RRHH/Admin/Candidato no se capturaron en sesión; el diseño interno se infiere del código y del sistema glass compartido. Conviene una pasada visual autenticada (desktop/tablet/mobile) antes del handoff de diseño de Portal Pruebas.  
2. **Aliases legacy `vo-*` / `ats-terracotta`** — nombres históricos que ya no describen el color real; riesgo de confusión al diseñar. Preferir `--color-green-*` / documentación de esta auditoría.  
3. **Shell inconsistente entre portales** — Admin monta shell en layout; RRHH por página. Portal Pruebas debe elegir un patrón y documentarlo (recomendación: layout + shell, con props vía contexto si necesita `lockMainScroll`).  
4. **Rol de Portal Pruebas no existe hoy** — `PORTAL_KEYS` solo tiene candidate/opportunities/rrhh/admin. Requiere backend + frontend coordinados.  
5. **i18n sin prefijo URL** — OK para etapa actual; cualquier deep-link localizado sigue dependiendo de cookie.  
6. **Densidad de `messages/es.json`** — archivo grande; un namespace nuevo es manejable, pero hay que mantener paridad en 5 locales.  
7. **Dependencia de BFF y sesión backend** — el portal no puede “mockear” auth en edge; sin endpoints reales solo se puede maquetar UI estática.  
8. **Gráficas y PDF** — si Portal Pruebas necesita reportes/PDF, reutilizar Recharts y el pipeline existente; no introducir otra librería sin acuerdo.  
9. **CI gates** — cambios futuros en `app|components|lib` deben pasar lint + Vitest + cspell (`npm run qa`).  

---

## Anexo A — Evidencia visual (inspección real)

### A.1 Login `/auth/iniciar-sesion` (Desktop ~1440×900)

- Layout **split**: panel izquierdo verde con marca ApplicanTree, claim de producto, lista de beneficios y tarjeta de persona (p. ej. “Sofía Carrillo”); panel derecho formulario blanco.  
- CTA primario verde sólido “Iniciar Sesión”.  
- Language switcher + enlace de soporte.  
- SSO LinkedIn visible en el árbol de accesibilidad.  
- Sin sesión, es la puerta de entrada tras intentar `/portal-rrhh`.

### A.2 Portal Oportunidades `/portal-oportunidades`

**Desktop (~1440×900):**  
- Header con logo + language switcher.  
- Hero tipográfico: énfasis “Portal de Oportunidades” en verde con tipografía serif/italic (Fraunces).  
- Subcopy y zona de filtros / listado.

**Mobile (~375×812):**  
- Misma jerarquía apilada en una columna.  
- Filtros (“Buscar vacantes”, “Departamento”, …) debajo del hero.  
- Language switcher compacto (icono globo).

### A.3 No inspeccionado visualmente (solo código)

- Dashboard RRHH, listado de vacantes/candidatos, kanban/pipeline, ficha técnica, hub de reportes, catálogos Admin, portal candidato autenticado, selección de portal con sesión.

---

## Anexo B — Referencias rápidas de archivos

| Tema | Rutas |
|---|---|
| Tokens / glass | `app/globals.css`, `lib/brand-colors.ts`, `tailwind.config.ts` |
| Marca | `lib/app-brand.ts`, `components/branding/*` |
| Roles / portales | `lib/roles.ts`, `lib/portal-access.ts` |
| Auth edge / server | `proxy.ts`, `lib/server-session-user.ts`, `lib/auth/public-paths.ts` |
| API | `lib/api.ts`, `lib/api/*`, `app/api/bff/[...path]/route.ts` |
| i18n | `i18n/routing.ts`, `i18n/request.ts`, `messages/*.json` |
| Shells | `components/rrhh/rrhh-portal-shell.tsx`, `components/portal-admin/PortalAdminShell.tsx`, `components/candidato/candidate-portal-shell.tsx` |
| Nav compartida | `components/navigation/*` |
| UI base | `components/ui/*` |
| Reglas UX | `.cursor/rules/ux-ui-design.mdc` |
| Reglas arquitectura | `.cursor/rules/frontend-architecture.mdc` |

---

*Fin del documento de auditoría. Listo como input para el diseño e implementación posterior de Portal Pruebas.*
