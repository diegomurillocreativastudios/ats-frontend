# Setup base de i18n del Frontend (`next-intl`)

> **Etapa 1 — Infraestructura base.**
> Este documento describe la configuración de `next-intl` instalada. **No** migra
> textos de la aplicación ni altera contenido dinámico/IA. Complementa a
> [`frontend-i18n-scope.md`](./frontend-i18n-scope.md) (Etapa 0).

---

## 1. Librería instalada

- **`next-intl` `^4.13.0`** (compatible con Next.js 16 App Router + React 19).

## 2. Locales soportados

| Código | Idioma   | Rol                    |
| ------ | -------- | ---------------------- |
| `es`   | Español  | **Default + fallback** |
| `en`   | Inglés   | Soportado              |
| `it`   | Italiano | Soportado              |
| `de`   | Alemán   | Soportado              |
| `fr`   | Francés  | Soportado              |

La fuente de verdad es `i18n/routing.ts` (`locales`, `defaultLocale = "es"`).

## 3. Estructura de archivos

```txt
i18n/
  routing.ts      # locales soportados, defaultLocale ("es"), isLocale(), localeCookieName
  request.ts      # getRequestConfig: resuelve locale + carga mensajes con fallback a es
  navigation.ts   # seam de navegación (re-export de next/navigation por ahora)

messages/
  es.json         # fuente de verdad + fallback
  en.json
  it.json
  de.json
  fr.json
```

## 4. Decisión de ruteo: sin prefijo de URL (cookie-based)

Esta es la decisión arquitectónica clave de la etapa (riesgo #5 de la Etapa 0).

**Decisión:** Etapa 1 usa `next-intl` **sin ruteo por prefijo de locale**. El
locale activo se resuelve en `i18n/request.ts` desde la cookie `NEXT_LOCALE`,
con `es` como default cuando la cookie no existe o es inválida.

**Por qué no se usó prefijo (`/`, `/en`, `/it`, `/de`, `/fr`) en esta etapa:**

- El ruteo por prefijo de `next-intl` exige mover las **~62 rutas** `page`/`layout`
  a `app/[locale]/` y encadenar su middleware con el `proxy.ts` de auth existente.
- Eso es un **refactor amplio de rutas** que la Etapa 1 prohíbe explícitamente
  (su objetivo es solo dejar la infraestructura base lista).

**Migración futura a prefijo (Etapa 2+):** mover rutas a `app/[locale]/`, cambiar
`i18n/routing.ts` por `defineRouting({ localePrefix: "as-needed" })`, reemplazar
`i18n/navigation.ts` por `createNavigation(routing)` e integrar el middleware de
`next-intl` con el `proxy.ts` de auth. Los componentes que importen navegación
desde `@/i18n/navigation` no necesitarán cambios.

## 5. Middleware vs. proxy

El proyecto usa **Next.js 16**, donde el antiguo `middleware.ts` se llama
**`proxy.ts`** (ya existe con la lógica de auth/roles). Como esta etapa usa
ruteo **sin prefijo**, `next-intl` **no requiere** middleware/proxy propio: el
locale se resuelve por request en `request.ts`. **No se creó ni duplicó** ningún
middleware/proxy, y `proxy.ts` de auth quedó intacto.

## 6. `<html lang>` dinámico

`app/layout.tsx` pasó de `<html lang="en">` (fijo) a `<html lang={locale}>`,
donde `locale` viene de `getLocale()` de `next-intl`. Además envuelve la app en
`NextIntlClientProvider` para habilitar traducciones en componentes cliente.

## 7. Fallback a español

`i18n/request.ts` hace deep-merge del diccionario del locale activo sobre `es.json`,
de modo que cualquier clave ausente en otro idioma usa el texto en español.

## 8. Prueba funcional mínima

`tests/unit/i18n-setup.test.tsx` valida (vía Vitest + Testing Library):
- los 5 locales y `es` como default,
- el type guard `isLocale`,
- la traducción real de un texto estático de UI (`Common.loading`) en `es` y `en`,
- que los 5 diccionarios comparten las mismas claves de `Common`.

## 9. Regla crítica respetada

**No se traduce data generada por IA.** Los diccionarios solo contienen texto
estático de UI (`Common.loading/save/cancel`). No se tocó ningún componente que
renderice salida de Vertex AI, BD o input de usuario, ni se enviaron locales al
backend.

## 10. Selector de idioma (Etapa 2)

Etapa 2 añade un **selector de idioma funcional** que cambia el locale de la
plataforma **sin prefijo de URL**, persistiéndolo en la cookie `NEXT_LOCALE`.

### Componente

`components/language-switcher.tsx` (client component, `"use client"`):

- Lee el locale activo con `useLocale()` de `next-intl`.
- Itera los locales centralizados de `i18n/routing.ts` (`locales`); **no** duplica
  la lista. Solo mantiene un mapa de metadatos (endónimo + clave a11y) por locale.
- Muestra los nombres nativos (endónimos): `Español`, `English`, `Italiano`,
  `Deutsch`, `Français`. Los endónimos **no se traducen** (son nombres propios).
- Textos de UI traducidos vía namespace `LanguageSwitcher` (`label`, `spanish`,
  `english`, `italian`, `german`, `french`) usados para etiquetas accesibles.

### Cómo persiste y refresca

Al elegir un idioma distinto al activo:

1. Escribe la cookie `NEXT_LOCALE` (nombre tomado de `localeCookieName`):
   `NEXT_LOCALE=<locale>; path=/; max-age=<1 año>; samesite=lax`.
2. Llama `router.refresh()` (importado desde el seam `@/i18n/navigation`), que
   re-ejecuta los Server Components. `i18n/request.ts` vuelve a leer la cookie y
   resuelve el nuevo locale + mensajes (con fallback a `es`).

No se envía el locale al backend ni se modifican llamadas a API.

### Integración en la UI global

El selector se integró en los **tres topbars** transversales (uno por portal),
en el clúster de acciones derecho, junto al botón de notificaciones:

- `components/candidato/CandidateTopbar.tsx`
- `components/rrhh/RRHHTopbar.tsx`
- `components/portal-admin/AdminTopbar.tsx`

### Regla crítica respetada

El selector **solo** cambia la UI estática preparada con `next-intl`. No traduce,
transforma ni reprocesa data generada por IA (Vertex AI), contenido de BD/API,
texto extraído de archivos, input de usuario ni nombres propios/tecnologías.

### Pruebas

`tests/unit/language-switcher.test.tsx` valida: render del selector, los 5
idiomas disponibles, el locale activo marcado, la escritura de la cookie
`NEXT_LOCALE` al cambiar idioma y la llamada a `router.refresh()`.

## 11. Estructura de diccionarios y UI transversal (Etapa 3)

Etapa 3 define la **estructura real y escalable de diccionarios** y migra los
textos **transversales/globales** de UI (topbars + sidebars). **No** migra
módulos de negocio (Vacantes, Candidatos, Resultados IA, etc.).

### 11.1 Convención de namespaces

Los 5 archivos `messages/*.json` comparten exactamente la misma estructura de
keys. `es.json` es la **fuente de verdad**. Namespaces actuales:

| Namespace          | Uso                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| `Common`           | Textos genéricos reutilizables (`loading`, `save`, `cancel`).       |
| `Actions`          | Verbos/acciones reutilizables (`logout`).                           |
| `Navigation`       | Etiquetas de ítems de navegación (sidebars): `home`, `candidates`…  |
| `Topbar`           | Textos de las barras superiores (portal, notificaciones, menú…).    |
| `Sidebar`          | `aria-label`s de las barras laterales y navegación.                 |
| `LanguageSwitcher` | Etiquetas del selector de idioma (Etapa 2).                         |

**Reglas de naming:**

- Namespace en `PascalCase`; keys en `camelCase`.
- Agrupar por **componente o concepto transversal**, no por pantalla de negocio.
- Reutilizar `Common`/`Actions` antes de duplicar una key en otro namespace.
- Mantener las keys **idénticas** en los 5 idiomas (ver §11.4).

Estructura preparada para crecer (se irán poblando en etapas siguientes según se
migren módulos): `Auth`, `Validation`, `Errors`, `EmptyStates`, `LoadingStates`.
No se crean vacíos para no añadir ruido; se agregan cuando haya texto real.

### 11.2 Cómo agregar nuevas keys

1. Agregá la key en `messages/es.json` (fuente de verdad), en el namespace correcto.
2. Replicá la **misma ruta de key** en `en/it/de/fr` con su traducción.
3. Consumila en el componente con `useTranslations("Namespace")`.
4. Corré `npx vitest run tests/unit/messages-structure.test.ts` para validar paridad.

### 11.3 Ejemplo de uso correcto (`useTranslations`)

```tsx
"use client"
import { useTranslations } from "next-intl"

function Topbar() {
  const t = useTranslations("Topbar")
  return <span>{t("notifications")}</span> // ✅ UI estática traducible
}
```

Para listas de navegación se guarda una `labelKey` (no el texto) y se resuelve
en render:

```tsx
const navItems = [{ href: "/portal-rrhh/candidatos", labelKey: "candidates" }] as const
const t = useTranslations("Navigation")
// ...
;<span>{t(item.labelKey)}</span>
```

### 11.4 Validación de paridad de keys

`tests/unit/messages-structure.test.ts` aplana cada diccionario y **falla** si
un idioma omite o agrega una key respecto de `es.json`. También verifica que los
namespaces transversales existan en los 5 idiomas.

### 11.5 Regla crítica: NO traducir data IA/dinámica

El selector y `next-intl` **solo** traducen UI estática controlada por frontend.
**Nunca** se traduce:

- Resultados/resúmenes/razones/recomendaciones generados por IA (Vertex AI).
- Texto extraído de archivos o ingresado por usuarios.
- Datos dinámicos de API/BD (nombres, roles, títulos de vacante/candidato).
- Nombres propios y tecnologías (React, Next.js, PostgreSQL, Docker, AWS, .NET…).

```tsx
// ✅ Traducible (UI estática)
<h2>{t("Topbar.notifications")}</h2>
<span>{t("Navigation.candidates")}</span>

// ❌ NO traducible (data dinámica / IA)
<p>{candidate.name}</p>
<p>{user.role}</p>
<p>{detail.match.qualitativeReasoningPositive}</p>
```

> Nota: en sidebars/topbars, `displayName` (`user.name`) y `roleLabel`
> (`user.role`) provienen de la API y **se dejan intactos**; solo se tradujo el
> estado de carga (`Common.loading`) y las etiquetas estáticas.

### 11.6 Componentes migrados en esta etapa

- `components/candidato/CandidateTopbar.tsx`
- `components/rrhh/RRHHTopbar.tsx`
- `components/portal-admin/AdminTopbar.tsx`
- `components/candidato/CandidateSidebar.tsx`
- `components/rrhh/RRHHSidebar.tsx`
- `components/portal-admin/AdminSidebar.tsx`

### 11.7 `lib/pageTitles.ts` — pendiente (no forzado)

`lib/pageTitles.ts` genera títulos de documento y labels de breadcrumb a partir
del `pathname`. Integrarlo con `next-intl` implica que es **server-side puro sin
contexto de locale** y alimenta breadcrumbs que ya mezclan labels dinámicos
(nombres de vacante/candidato). Migrarlo es un cambio **amplio y transversal a
módulos de negocio**, fuera del scope de esta etapa. Se documenta como
**pendiente** para una etapa dedicada (idealmente junto con el ruteo por prefijo).

## 12. Pantallas de autenticación/acceso (Etapa 4)

Etapa 4 migra a `next-intl` los **textos estáticos** de las pantallas de
autenticación y acceso de entrada. **No** toca lógica de auth, APIs, ni módulos
de negocio pesados, y **no** traduce data dinámica/IA ni errores de backend.

### 12.1 Pantallas migradas

| Pantalla                | Archivo                                                        | Tipo            |
| ----------------------- | ------------------------------------------------------------- | --------------- |
| Login                   | `app/auth/iniciar-sesion/page.tsx`                            | Client          |
| Recuperar contraseña    | `app/auth/forgot-password/ForgotPasswordContent.tsx`         | Client          |
| Restablecer contraseña  | `app/restablecer-contrasena/RestablecerContrasenaContent.tsx` | Client          |
| Restablecer (wrappers)  | `app/restablecer-contrasena/page.tsx`, `app/auth/restablecer-contrasena/page.tsx` | Server (fallback) |
| Selección de portal     | `app/seleccion-portal/page.tsx`                              | Server (RSC)    |

En Server Components se usa `getTranslations` de `next-intl/server`; en Client
Components, `useTranslations`. Los títulos de marca con saltos de línea usan
`t.rich("...", { br: () => <br /> })` para preservar el layout exacto.

### 12.2 Namespaces agregados

| Namespace        | Uso                                                                          |
| ---------------- | ---------------------------------------------------------------------------- |
| `Auth`           | Textos de login/forgot/reset: marca, títulos, labels, placeholders, botones, enlaces y toasts de UI (`login.*`, `forgot.*`, `reset.*`, `loadingFallback`). |
| `Validation`     | Validaciones **del frontend** de auth (campo requerido, email inválido, mínimo de caracteres, contraseñas no coinciden). |
| `Errors`         | Mensajes genéricos de UI reutilizables (`connection`). Fallback cuando el backend no devuelve mensaje. |
| `PortalSelection`| Pantalla de selección de portal (títulos, tarjetas, `aria-label`s, footer). |

Los 5 diccionarios (`es/en/it/de/fr`) mantienen **exactamente** la misma
estructura de keys (`es.json` = fuente de verdad). Validado por
`tests/unit/messages-structure.test.ts` y `tests/unit/auth-i18n.test.tsx`.

### 12.3 Regla: NO traducir errores dinámicos / backend automáticamente

Los handlers conservan el patrón `data.message || data.detail || t("...fallback")`:

- Si el **backend** devuelve un mensaje (`message`/`detail`), se muestra **tal
  cual** (puede venir en español). **No** se traduce ni se reprocesa.
- Solo el **fallback** controlado por frontend (cuando el backend no envía
  texto) se toma del diccionario. Lo mismo aplica al error de conexión local
  (`Errors.connection`).

Los errores literales del backend en español quedan como **deuda futura**: para
internacionalizarlos haría falta que el backend devuelva códigos de error
estables (no texto), lo cual está fuera del scope de i18n de frontend.

### 12.4 Selector de idioma en pantallas no autenticadas

`components/language-switcher.tsx` se integró en la esquina superior derecha
(`absolute top/right`, sin alterar el layout) de:

- Login, Recuperar contraseña, Restablecer contraseña (estado válido e inválido).
- Selección de portal.

Esto permite **cambiar de idioma antes de iniciar sesión**. El cambio sigue
siendo cookie-based (`NEXT_LOCALE`) + `router.refresh()`, sin prefijo de URL y
**sin enviar el locale al backend**.

### 12.5 Qué NO se tocó en esta etapa

- Lógica de login/recuperación/reset, navegación, cookies de sesión y redirects:
  intactos.
- Contratos de API / requests: sin cambios. No se envía `locale` al backend.
- Registro (`app/auth/registrarse`): **no migrado** (fuera del listado de Etapa 4).
- Páginas públicas de oportunidades (`components/public/*`): **no migradas**;
  contienen mayormente data dinámica de vacantes y formularios de postulación.
- Data generada por IA / Vertex AI, BD/API, input de usuario, nombres propios y
  tecnologías: **no se traducen**.

### 12.6 Tests de la etapa

`tests/unit/auth-i18n.test.tsx` valida (Vitest + Testing Library):
- Login renderiza textos desde `next-intl` en `es` y `en`.
- Recuperar/restablecer contraseña renderizan textos desde `next-intl`.
- El selector de idioma está disponible en login y recuperar contraseña.
- Estado de enlace inválido del reset traducido.
- Paridad de namespaces (`Auth`, `Validation`, `Errors`, `PortalSelection`) en los 5 idiomas.

## 13. Metadata estática de auth/acceso (Etapa 5A)

Etapa 5A migra a `next-intl` la **metadata estática** (`title`/`description` de
`<head>`) de las páginas de auth/acceso que ya exponían metadata controlada por
frontend. Es una etapa **pequeña, incremental y acotada**: no toca módulos de
negocio, ni lógica de auth, ni APIs, ni envía locale al backend.

### 13.1 Metadata migrada

Las páginas pasaron de `export const metadata = { title: { absolute: "ATS | …" }, … }`
(español estático) a `export async function generateMetadata()` con
`getTranslations` de `next-intl/server`:

| Ruta                                   | Archivo                                  | Namespace                       |
| -------------------------------------- | ---------------------------------------- | ------------------------------- |
| Recuperar contraseña                   | `app/auth/forgot-password/page.tsx`      | `Metadata.auth.forgotPassword`  |
| Restablecer contraseña (pública)       | `app/restablecer-contrasena/page.tsx`    | `Metadata.auth.resetPassword`   |
| Restablecer contraseña (`/auth`)       | `app/auth/restablecer-contrasena/page.tsx` | `Metadata.auth.resetPassword` |
| Selección de portal                    | `app/seleccion-portal/page.tsx`          | `Metadata.portalSelection`      |

El `title` se devuelve **sin** el prefijo de marca; el `template` global de
`app/layout.tsx` (`title: { default: "ATS", template: "ATS | %s" }`) antepone
`ATS | …`, de modo que el resultado visible (`ATS | <título>`) no cambia respecto
del `{ absolute: "ATS | …" }` anterior, pero ahora **localizado**.

```ts
// app/auth/forgot-password/page.tsx
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth.forgotPassword")
  return { title: t("title"), description: t("description") }
}
```

### 13.2 Namespace `Metadata` agregado (5 idiomas)

Se añadió el namespace `Metadata` a `es/en/it/de/fr` (con `es.json` como fuente de
verdad):

```jsonc
"Metadata": {
  "auth": {
    "login":          { "title": "…", "description": "…" },
    "forgotPassword": { "title": "…", "description": "…" },
    "resetPassword":  { "title": "…", "description": "…" }
  },
  "portalSelection":  { "title": "…", "description": "…" }
}
```

`Metadata.auth.login` se incluye como **preparación** del namespace (estructura
coherente y lista para uso futuro). **No** se aplica todavía a `app/auth/iniciar-sesion/page.tsx`
porque es un **Client Component** (`"use client"`) y no puede exportar
`generateMetadata`; añadirla exigiría reestructurar la página (server wrapper +
client content), lo cual queda fuera del scope acotado de esta etapa. El título
de pestaña del login lo sigue resolviendo `PageTitle` (cliente) vía
`lib/pageTitles.ts` (ver §13.4).

La paridad exacta de keys en los 5 diccionarios la valida
`tests/unit/messages-structure.test.ts`.

### 13.3 Reglas críticas respetadas

- **NO se traduce data generada por IA** (Vertex AI), ni texto extraído de
  archivos, ni input de usuario.
- **NO se traduce data dinámica de API/BD** (nombres, roles, títulos de
  vacante/candidato).
- **NO se traducen breadcrumbs dinámicos** (`candidate.name`, `vacancy.title`,
  etc.): siguen viniendo por props/data de ruta sin tocar.
- **NO se modificaron** APIs, contratos, lógica de auth ni redirects.
- **NO se envía** el locale al backend.
- **NO se implementaron** rutas con prefijo (`/en`, `/it`, …) ni se movió nada a
  `app/[locale]`. El ruteo sigue siendo cookie-based (`NEXT_LOCALE`).

### 13.4 Decisión sobre `lib/pageTitles.ts` — Opción B (no migrar todavía)

Se **revisó** `lib/pageTitles.ts` y se decidió **NO migrarlo** en esta etapa
(Opción B: preparación/documentación, sin migración). Motivos:

- `getPageTitle()` es una función **pura y síncrona sin contexto de locale**,
  consumida por el Client Component `components/PageTitle.tsx` en **cada ruta**
  (`useLayoutEffect`/`useEffect`) para fijar `document.title`. Hacerla
  locale-aware obliga a inyectar `useTranslations`/traducciones y a tocar
  `PageTitle.tsx`.
- Sus mapas de labels (`RRHH_PATH_LABEL`, `ADMIN_PATH_LABEL`,
  `CANDIDATO_PATH_LABEL`, `EXACT_PATH_SUFFIX`) cubren **decenas de etiquetas de
  módulos de negocio** (Vacantes, Candidatos, Entrevistas, Reportes, Usuarios,
  Empresas…). Migrarlos es precisamente migrar navegación de negocio, fuera de
  scope.
- Las funciones `format*DocumentTitle()` **interpolan data dinámica**
  (`vacancyDisplayName`, `candidate.name`) usada por páginas RRHH
  (`app/portal-rrhh/vacantes/[id]`, `…/candidatos/[candidateId]`,
  `…/entrevistas/[vacancyId]`). Eso es breadcrumb/título **dinámico que NO debe
  traducirse**.

Por tanto, migrarlo sería un **cambio amplio y transversal a módulos de negocio**
y se posterga a una etapa dedicada. **No** se creó namespace `PageTitles` para no
poblar keys sin uso real. Recomendación futura: abordarlo junto con el ruteo por
prefijo, separando claramente labels estáticos (traducibles) de los segmentos
dinámicos (nombres de vacante/candidato), que deben permanecer intactos.

### 13.5 Tests de la etapa

`tests/unit/metadata-i18n.test.ts` valida (Vitest):
- `generateMetadata` de forgot password, reset password (ambas rutas) y selección
  de portal resuelve `title`/`description` desde `next-intl` en `es` y `en`
  (mockeando `getTranslations` con los diccionarios reales).
- Presencia del namespace `Metadata` y paridad de sus sub-keys
  (`auth.{login,forgotPassword,resetPassword}`, `portalSelection.{title,description}`)
  en los 5 idiomas.

`tests/unit/messages-structure.test.ts` y `tests/unit/auth-i18n.test.tsx` siguen
pasando (paridad estructural completa de los 5 diccionarios).

## 14. Portal Candidato básico (Etapa 5B)

Etapa 5B migra a `next-intl` los **textos estáticos de UI** del **Portal Candidato
básico** (home/dashboard, documentos y entrevistas). Es una etapa **acotada e
incremental**: no toca módulos pesados, ni lógica de negocio, ni APIs, ni traduce
data dinámica/IA.

### 14.1 Componentes/rutas migrados

| Componente / ruta                                            | Tipo   | Namespace usado              |
| ------------------------------------------------------------ | ------ | ---------------------------- |
| `components/candidato/candidate-portal-home.tsx`             | Client | `CandidatePortal.home`       |
| `components/candidato/StatCard.tsx`                          | Server | `CandidatePortal.stats`      |
| `components/candidato/NextActivitiesCard.tsx`                | Client | `CandidatePortal.activities` |
| `components/candidato/MyPostulationsCard.tsx`                | Client | `CandidatePortal.applications` |
| `components/candidato/ProcessTrackingCard.tsx`               | Client | `CandidatePortal.process`    |
| `components/candidato/CandidateInterviewsContent.tsx`        | Client | `CandidatePortal.interviews` |
| `app/portal-candidato/documentos/DocumentosContent.tsx`      | Client | `CandidatePortal.documents`  |

Rutas afectadas: `/portal-candidato`, `/portal-candidato/documentos`,
`/portal-candidato/entrevistas`. Se usa `useTranslations` (todos son
client/colocados en árbol cliente). Los valores con interpolación
(`{name}`, `{current}/{total}`, `{percentage}`, `{order}`, `{id}`, `{minutes}`,
`{hours}`, `{fileName}`) y las pluralizaciones de toasts de documentos usan el
formato ICU de `next-intl` (`{count, plural, one {…} other {…}}`).

### 14.2 Namespace `CandidatePortal` (5 idiomas)

Se añadió el namespace `CandidatePortal` a `es/en/it/de/fr` (con `es.json` como
fuente de verdad), agrupado por sección de UI:

```jsonc
"CandidatePortal": {
  "home":         { /* greeting, description, aria-labels, loading */ },
  "stats":        { /* labels + descripciones de las 4 tarjetas de stats */ },
  "activities":   { /* título + empty state de próximas actividades */ },
  "applications": { /* título + empty state + "Etapa {current} de {total}" */ },
  "process":      { /* seguimiento del proceso: títulos, fases, progreso */ },
  "interviews":   { /* cabeceras, secciones, empties, etiquetas de tarjeta */ },
  "documents":    { /* cabeceras, botones, loading + toasts (fallback front) */ }
}
```

La paridad exacta de keys en los 5 diccionarios la validan
`tests/unit/messages-structure.test.ts` y `tests/unit/candidate-portal-i18n.test.tsx`.

### 14.3 Qué quedó fuera de scope (no migrado)

- **Portal RRHH y Portal Admin** y sus módulos (Vacantes, Candidatos internos,
  Resultados IA, Reportes, Catálogos): intactos.
- **Perfil del candidato** (`app/mi-perfil`, `candidate-self-profile-view.tsx`,
  `candidate-profile-edit-field-groups.tsx`): formularios extensos, **pendiente**.
- **Sub-componentes de subida de documentos** (`DocumentsUploadZone`,
  `DocumentsList`, `SingleFileUploadZone`, `AgregarCandidatoModal`,
  `candidate-portal-snackbar`): lógica compleja, **pendiente** en 5B →
  **completado en Etapa 5C** (ver §15).
- `lib/pageTitles.ts`, breadcrumbs dinámicos, metadata de login y ruteo por
  prefijo: fuera de scope (igual que etapas previas).

### 14.4 Regla crítica: NO traducir data dinámica/IA

Se mantuvo **intacta** toda la data dinámica que llega por props/hooks/API:

```tsx
// ✅ Traducible (UI estática)
<h2>{t("title")}</h2>
{t("stageProgress", { current, total })}

// ❌ NO traducible (data dinámica / API / usuario)
{candidate.greetingName}      // nombre del usuario
{post.jobTitle}               // título de vacante (API)
{post.companyLine}            // empresa (API)
{row.statusDisplayName}       // estado mostrado por backend
{row.interviewTypeLabel}      // tipo de entrevista (API)
{formatInterviewLocalDateTime(row.scheduledAtUtc)} // fecha (formato local)
{error}                       // mensaje de error de API
```

En el saludo del home, el nombre se inyecta como **valor** del placeholder
(`t("greeting", { name })`): se traduce solo el envoltorio estático, nunca el
nombre. En toasts de documentos se conserva el patrón
`getApiErrorMessage(err) || t("...fallback")`: el mensaje del **backend** se
muestra tal cual; solo el **fallback** controlado por frontend sale del diccionario.

### 14.5 Mapper de enums `lib/candidate-portal-translations.ts` — pendiente

`MyPostulationsCard` y `ProcessTrackingCard` usan
`translateApplicationStatus` / `translateStageName` / `getApplicationStatusStyle`
de `lib/candidate-portal-translations.ts`. Ese módulo es un **mapper frontend de
enums** que recibe **valores provenientes de la API** (`Active`, `Pending`,
`Revision`, `Offer`, nombres de etapa…) y los mapea a español, con **fallback al
valor crudo** si no hay match.

**Decisión:** **NO** se migra en esta etapa (queda **pendiente**). Motivos:

- Está acoplado a **valores de enum del backend**; internacionalizarlo bien exige
  un set estable de claves de enum (no texto) y decidir el comportamiento del
  fallback cuando llega un valor desconocido.
- Toca la frontera entre UI estática y data dinámica de API, fuera del alcance
  "básico/seguro" de esta etapa.

Recomendación futura: migrarlo en una etapa dedicada, mapeando cada enum conocido
a una key de `next-intl` (p. ej. `CandidatePortal.statusEnum.Active`) y dejando el
valor crudo de la API como fallback intacto.

### 14.6 Qué NO se tocó

- **No** se modificaron llamadas a API ni contratos; **no** se envía `locale` al
  backend.
- **No** se modificó la lógica de autenticación, subida de documentos, entrevistas
  ni perfil (solo se reemplazaron literales de UI por keys).
- **No** se implementaron rutas con prefijo (`/en`, `/it`, …) ni se movió nada a
  `app/[locale]`. El ruteo sigue siendo cookie-based (`NEXT_LOCALE`).
- **No** se tocó `lib/pageTitles.ts` ni se crearon servicios/caches de traducción.

### 14.7 Tests de la etapa

`tests/unit/candidate-portal-i18n.test.tsx` valida (Vitest + Testing Library):

- `StatCard`, `NextActivitiesCard`, `MyPostulationsCard`, `ProcessTrackingCard`,
  `CandidatePortalHome` y `CandidateInterviewsContent` renderizan textos estáticos
  desde `next-intl` en `es` y `en`.
- Presencia del namespace `CandidatePortal` y de sus secciones
  (`home`, `stats`, `activities`, `applications`, `process`, `interviews`,
  `documents`) en los 5 idiomas.

`tests/unit/messages-structure.test.ts`, `tests/unit/metadata-i18n.test.ts`,
`tests/unit/auth-i18n.test.tsx`, `tests/unit/topbars-i18n.test.tsx`,
`tests/unit/language-switcher.test.tsx` e `tests/unit/i18n-setup.test.tsx` siguen
pasando (45 tests i18n en verde) — el selector de idioma sigue funcionando.

## 15. Portal Candidato — documentos/subida/snackbars (Etapa 5C)

Etapa 5C completa el i18n de los **sub-componentes de documentos** del Portal
Candidato que quedaron pendientes en 5B (§14.3): zonas de subida, lista de
documentos, modal de carga y labels controlados. Sigue siendo **acotada e
incremental**: no toca el perfil del candidato, ni RRHH/Admin, ni lógica de
negocio/API, ni traduce data dinámica/IA.

### 15.1 Componentes migrados

| Componente                                            | Tipo   | Namespace usado                          |
| ----------------------------------------------------- | ------ | ---------------------------------------- |
| `components/candidato/DocumentsUploadZone.tsx`        | Client | `CandidatePortal.documents.upload`       |
| `components/candidato/DocumentsList.tsx`              | Client | `CandidatePortal.documents.list`         |
| `components/candidato/SingleFileUploadZone.tsx`       | Client | `CandidatePortal.documents.singleUpload` |
| `components/candidato/AgregarCandidatoModal.tsx`      | Client | `CandidatePortal.documents.modal`        |

Todos usan `useTranslations`. Los textos con interpolación (`{fileName}`,
`{name}`, `{size}`, `{max}`, `{detail}`) y la pluralización de archivos
seleccionados (`{count, plural, one {…} other {…}}`) usan formato ICU. El mensaje
de borrado de `DocumentsList` usa `t.rich("deleteMessage", { name })`: el nombre
del documento se inyecta como **chunk de React** (no se traduce), solo el
envoltorio estático sale del diccionario.

`SingleFileUploadZone` ahora resuelve sus textos por defecto desde el diccionario
(`primaryText`/`ariaLabel`/`typeErrorMessage` opcionales → fallback `t()`); los
callers que pasan props explícitas (p. ej. `AgregarCandidatoModal`) también las
obtienen de `next-intl`.

> **Nota de componente compartido:** `AgregarCandidatoModal` se usa tanto en el
> flujo del candidato (`DocumentosContent`, `variant="self"`) como en RRHH
> (`app/portal-rrhh/candidatos`, `variant="recruiter"`). Se migran **ambas
> variantes** porque el componente vive en `components/candidato`, su copy es
> **UI estática controlada por frontend** (no data de API/IA) y el
> `NextIntlClientProvider` es global (`app/layout.tsx`). Las notas que mencionan
> "IA"/"RRHH" son texto estático de divulgación, **no** salida de Vertex AI.

`components/candidato/candidate-portal-snackbar.tsx` se auditó: es un **provider
de contexto** que solo muestra el mensaje que recibe; no contiene texto estático
propio, así que no requiere migración. Los fallbacks de toasts de documentos ya
viven en `CandidatePortal.documents` (toast*) desde 5B y conservan el patrón
`getApiErrorMessage(err) || t("…")`.

### 15.2 Namespace `CandidatePortal.documents` ampliado

Sobre las keys planas de 5B se añadieron **subsecciones anidadas** en los 5
diccionarios (`es` fuente de verdad):

```jsonc
"CandidatePortal": {
  "documents": {
    /* … keys planas de 5B (breadcrumb, title, toasts…) … */
    "upload":       { /* dropzone, estados, botones procesar/quitar, errores de validación */ },
    "list":         { /* heading, empty state, aria descargar/eliminar, modal de borrado */ },
    "singleUpload": { /* prompts, aria y errores de la zona de un solo archivo */ },
    "modal": {
      "kpis":      { "cv": {…}, "insert": {…}, "savings": {…} },
      "self":      { /* copy de la variante candidato */ },
      "recruiter": { /* copy de la variante RRHH */ }
      /* + labels compartidos: cancel, retry, selects, headings… */
    }
  }
}
```

Paridad exacta validada por `tests/unit/messages-structure.test.ts` y por
`tests/unit/candidate-portal-documents-i18n.test.tsx`.

### 15.3 Decisión sobre `lib/candidate-portal-translations.ts`

**Se revisó** y **se mantiene la decisión de 5B: NO migrar en esta etapa**
(queda pendiente). El archivo contiene mappers de enums
(`translateApplicationStatus`, `translateStageStatus`, `translateStageName`) y
`getApplicationStatusStyle`. Motivos para diferirlo:

- `translateStageName` mapea **nombres de etapa provenientes del backend/BD**
  (`Revision`, `Offer`, `Aplicantes`, `Entrevista`, `En espera`): es data
  dinámica de API, **no** UI estática — traducirla violaría la regla crítica.
- `getApplicationStatusStyle` deriva el estilo **haciendo match de substrings**
  del label en español/inglés (`contratado`, `activ`, `pendiente`…); traducir los
  labels a `it/de/fr` **rompería** el styling.
- Las funciones son utilidades puras **sin acceso limpio a `t()`** y son
  consumidas por componentes ya migrados en 5B (`MyPostulationsCard`,
  `ProcessTrackingCard`), cuyos tests habría que rehacer — fuera del scope
  acotado de 5C.

Recomendación futura (sin cambios respecto a §14.5): etapa dedicada que separe
enums controlados por frontend (con key + fallback al valor crudo) de los nombres
de etapa que llegan del backend, y que refactorice el matching de estilos para no
depender del texto traducido.

### 15.4 Regla crítica: NO traducir data dinámica/IA

Se mantuvo intacta toda la data dinámica:

```tsx
// ✅ Traducible (UI estática)
<Button>{t("upload.process")}</Button>
{t("upload.selectedCount", { count: files.length })}

// ❌ NO traducible (data dinámica / API / usuario / IA)
{file.name}                       // nombre de archivo del usuario
{resolveDocumentName(doc)}        // nombre derivado del storagePath (API)
{option.name}                     // tipo de documento (catálogo de API)
{error}                           // mensaje de error de API
getApiErrorMessage(err)           // mensaje del backend (se respeta tal cual)
```

Validaciones de archivo: `validateFile`/`validateSingleFile` devuelven ahora un
**código de razón** (`"type"`/`"size"`) y el componente traduce el mensaje vía
`t()`, en vez de retornar strings en español. El tamaño se interpola como valor.

### 15.5 Qué NO se tocó

- **No** se modificaron llamadas a API ni contratos; **no** se envía `locale` al
  backend.
- **No** se modificó la lógica de subida, descarga, eliminación o validación de
  documentos, ni la de autenticación (solo se reemplazaron literales por keys y
  se cambió el formato de retorno de los validadores).
- **No** se implementaron rutas con prefijo ni se movió nada a `app/[locale]`.
- **No** se tocó `lib/pageTitles.ts`, ni RRHH/Admin (salvo la variante recruiter
  del modal compartido, ver §15.1), ni Resultados/salida de Vertex AI.

### 15.6 Tests de la etapa

`tests/unit/candidate-portal-documents-i18n.test.tsx` valida:

- `DocumentsUploadZone`, `DocumentsList` y `SingleFileUploadZone` renderizan sus
  textos estáticos desde `next-intl` en `es` y `en`.
- `AgregarCandidatoModal` (variante `self`) traduce título y botón cancelar.
- Presencia de las subsecciones `upload`/`list`/`singleUpload`/`modal` y de las
  variantes `self`/`recruiter` del modal en los 5 idiomas.

La suite i18n previa (`messages-structure`, `candidate-portal-i18n`, topbars,
auth, language-switcher, etc.) sigue pasando.

## 16. Etapa 5D — i18n del Perfil del Candidato

Migración acotada y segura de los textos estáticos del **Perfil del Candidato**
al namespace `CandidatePortal.profile`. El ruteo sigue siendo cookie-based
(`NEXT_LOCALE`), sin prefijos ni `app/[locale]`.

### 16.1 Componentes / rutas migrados

- `app/mi-perfil/MiPerfilContent.tsx` — vista de página (título, descripción,
  estados de carga/error, tarjeta de sesión, breadcrumb del topbar) y los toasts
  de guardado (`toasts.saveSuccess` / `toasts.saveError`).
- `components/candidato/candidate-self-profile-view.tsx` — navegación de
  secciones, títulos de grupos/secciones, labels de la ficha en modo lectura,
  acciones (descargar CV, gestionar documentos, guardar, cancelar), hero,
  empty states y fallbacks de descarga (`download.cvError` / `download.genericError`).
- `components/candidato/candidate-profile-edit-field-groups.tsx` — labels,
  placeholders, hints, botones, títulos de sección y aria-labels del **formulario
  de edición** (identidad, contacto, ubicación, preferencias, experiencia,
  educación, idiomas, habilidades, enlaces, referencias, reconocimientos).
- `components/candidato/candidate-salary-expectation-card.tsx` — título, moneda,
  label, placeholder, hint y estado «sin registrar».
- `components/candidato/social-link-type-picker.tsx` — label de tipo, placeholder
  de selección, prompt «Otro», label/placeholder de nombre de plataforma. Los
  nombres de plataformas preset (LinkedIn, GitHub, etc.) **no** se traducen.

> Nota de componentes compartidos: `candidate-profile-edit-field-groups.tsx`,
> `candidate-salary-expectation-card.tsx`, `social-link-type-picker.tsx` y el hook
> `use-candidate-profile-editor.ts` también son **reutilizados por la vista
> recruiter de RRHH** (`components/rrhh/recruiter-candidate-profile-view.tsx`).
> Como viven en `components/candidato/` y son parte del Perfil del Candidato, se
> migraron; **ningún archivo de `components/rrhh/` fue modificado**. En `es`
> (default) el render de RRHH es idéntico; en otros locales esos campos también
> se traducirán (efecto colateral deseado, sin regresión funcional).

### 16.2 Namespace `CandidatePortal.profile`

Estructura agregada (idéntica en `es/en/it/de/fr`):

```txt
page, session, toasts, nav, groups, actions, download, intro, hero,
notFound, sections, fields, values, emptyStates,
form (labels, placeholders, hints, selects, buttons, items, aria, addLink),
salary, socialLink, options (gender, maritalStatus, availability)
```

### 16.3 Decisión sobre `lib/profile-form-options.ts`

- **Migrado (seguro):** `getGenderOptions(t)`, `getMaritalStatusOptions(t)` y
  `getAvailabilityOptions(t)` devuelven opciones con **label traducible** vía
  `options.gender|maritalStatus|availability.*` y **`value` canónico en español
  preservado** (lo que persiste/espera el backend). Ejemplo:

```ts
{ value: "Inmediata", label: t("options.availability.immediate") }
```

  Las constantes `GENDER_OPTIONS` / `MARITAL_STATUS_OPTIONS` /
  `AVAILABILITY_OPTIONS` se conservan como fuente de los values canónicos.
  Único consumidor en el portal: `candidate-profile-edit-field-groups.tsx`.
- **Pendiente (no migrado):** `getCountrySelectOptions` /
  `getCountryIso2SelectOptions` generan los nombres de país con
  `Intl.DisplayNames(["es"])` y, además, **son consumidos por módulos RRHH**
  (`VacancyListFilters`, `VacancyLocationFields`, `public-vacancies`,
  `vacancy-location-display`). Localizarlos toca RRHH y la generación dinámica de
  nombres → fuera del scope de 5D.
- `mergeLegacySelectOption` sigue añadiendo el sufijo `(valor actual)` en español
  para valores legacy fuera de catálogo (caso borde, sin migrar).

### 16.4 Regla crítica: NO traducir data dinámica / IA / backend

No se tradujo ninguna data dinámica. Se conservan tal cual:

```tsx
{displayName} {headlineDisplay} {summary}      // datos de perfil (API/CV)
{email} {phoneDisplay} {countryDisplay}        // datos del usuario/API
{apiError.message} {saveProfileError}          // mensajes del backend
{validationError} {triggerLabel}               // provienen del hook compartido
formatCompliancePreview(compliance, …)         // keys/valores de compliance (API)
getApiErrorMessage(err) || t("download.…")     // fallback solo si no hay backend msg
```

Los `value` enviados al backend (género, estado civil, disponibilidad, país,
documento, etc.) **no cambian**: solo se traduce el label visible.

### 16.5 Qué NO se tocó

- **No** se modificaron llamadas a API ni payloads/nombres de campos; **no** se
  envía `locale` al backend; **no** se cambió lógica de perfil/guardado/edición,
  validaciones de negocio ni autenticación.
- **No** se tocó `use-candidate-profile-editor.ts` (hook compartido con RRHH): sus
  mensajes de validación y `triggerLabel` quedan **pendientes** para una etapa que
  trate el hook sin afectar RRHH.
- **No** se tocó `getBirthDateInputValidationError` (`lib/candidate-profile.ts`,
  validación compartida).
- **No** se migró la metadata estática de `app/mi-perfil/page.tsx` (export
  `metadata`; requiere `generateMetadata` + `getTranslations`) — pendiente.
- **No** se tocó `lib/pageTitles.ts` ni `lib/candidate-portal-translations.ts`.
- **No** se tocaron módulos RRHH/Admin, resultados/salida de Vertex AI, ni se
  implementaron rutas con prefijo.
- Las secciones compartidas de solo-lectura de `components/rrhh/CandidateProfileSections`
  (listas de experiencia/educación/idiomas, etc.) **no** se tocaron: renderizan
  data dinámica y son componentes RRHH.

### 16.6 Tests de la etapa

`tests/unit/candidate-portal-profile-i18n.test.tsx` valida:

- La vista de perfil renderiza textos estáticos desde `next-intl` en `es` y `en`.
- El formulario de edición renderiza labels/placeholders desde `next-intl` en
  `es` y `en`.
- Las opciones migradas traducen el **label** pero conservan el **`value`
  canónico** (`Masculino`, `Inmediata`, etc.) tanto en las funciones
  `get*Options(t)` como en el `<select>` renderizado.
- Presencia y paridad del namespace `CandidatePortal.profile` (18 subsecciones) y
  de `options.{gender,maritalStatus,availability}` en los 5 idiomas.

`tests/unit/messages-structure.test.ts` sigue garantizando la paridad exacta de
keys entre los 5 diccionarios. La suite i18n previa sigue pasando.

## 16-E. Etapa 5E — cierre seguro de pendientes del Portal Candidato

Etapa de cierre de pendientes **seguros** de Etapa 5D. No entra a mappers de
enums delicados ni a módulos RRHH/Admin. Regla de negocio vigente: **no se
traduce data generada por IA** ni data dinámica de API/BD/usuario.

### 16-E.1 Metadata de `/mi-perfil`

`app/mi-perfil/page.tsx` pasó del export estático `metadata` (título absoluto
`"ATS | Mi perfil"` en español) a `generateMetadata()` con
`getTranslations("Metadata.candidateProfile")`:

```ts
export async function generateMetadata() {
  const t = await getTranslations("Metadata.candidateProfile")
  return { title: t("title"), description: t("description") }
}
```

Se usa `title` plano (`"Mi perfil"`), de modo que el template del root layout
(`{ default: "ATS", template: "ATS | %s" }`) produce el mismo resultado visible
`"ATS | Mi perfil"`, igual que el resto de páginas ya migradas (auth/acceso).

Namespace agregado en los 5 diccionarios:

```json
"Metadata": {
  "candidateProfile": { "title": "...", "description": "..." }
}
```

> El `document.title` dinámico (`ATS | <nombre>`) que fija el cliente en
> `candidate-self-profile-view.tsx` **no** se tocó: depende del nombre del
> usuario (data dinámica) y queda fuera de alcance.

### 16-E.2 Validación de fecha de nacimiento — migración por códigos

`lib/candidate-profile.ts` ahora expone
`getBirthDateInputValidationErrorCode()`, que devuelve un código agnóstico al
idioma (`"invalid" | "futureDate" | "tooYoung" | null`) **sin cambiar la lógica
de negocio** (calendario válido, no futura, 18+ años).

- `getBirthDateInputValidationError()` (string en español) se **conserva** y se
  reimplementa sobre el código → cualquier código mapea a
  `BIRTH_DATE_INPUT_INVALID_MESSAGE`. Esto mantiene intactos sus consumers no
  migrados (el hook compartido y el test existente).
- El render en `ProfileEditLocationAndPersonalFields`
  (`candidate-profile-edit-field-groups.tsx`, componente del Portal Candidato ya
  migrado en 5D) traduce el código cerca del componente:
  `t(\`form.validation.birthDate.${code}\`)`.

Keys agregadas: `CandidatePortal.profile.form.validation.birthDate.{invalid,futureDate,tooYoung}`.

### 16-E.3 `mergeLegacySelectOption` — sufijo «(valor actual)» traducible

`lib/profile-form-options.ts`: `mergeLegacySelectOption` acepta un tercer
parámetro **opcional** `formatLegacyLabel(value)` (default en español,
retrocompatible). El componente del Portal Candidato pasa
`(value) => t("form.legacy.currentValue", { value })`.

El `value` de la opción legacy permanece **canónico/intacto** (lo que persiste el
backend); solo cambia el `label` visible. Key agregada:
`CandidatePortal.profile.form.legacy.currentValue` (`"{value} (valor actual)"`).

### 16-E.4 Decisión sobre `use-candidate-profile-editor.ts` — **PENDIENTE**

El hook es **compartido** con RRHH (`components/rrhh/recruiter-candidate-profile-view.tsx`
además de `candidate-self-profile-view.tsx`). Inyectar `useTranslations` en el
hook traduciría también el texto de RRHH (cambiaría su comportamiento) y pasar
`t()`/mensajes desde ambos consumers exigiría tocar el archivo RRHH. Para
respetar «no migrar RRHH», sus mensajes de validación (`"Completá titular…"`,
`"Tu perfil debe tener currículum…"`) y `triggerLabel` quedan **pendientes** para
una etapa dedicada al hook compartido (p. ej. parámetro opcional de mensajes con
default en español, sin tocar el consumer RRHH).

### 16-E.5 Decisión sobre opciones de país — **PENDIENTE (Opción B)**

`getCountrySelectOptions` y `getCountryIso2SelectOptions` (`lib/profile-form-options.ts`)
**no** se migran. Motivos:

- `getCountryIso2SelectOptions` es consumido por RRHH en
  `components/rrhh/VacancyListFilters.tsx`.
- Ambas usan `Intl.DisplayNames(["es"])`, orden regional por nombre en español y
  un **cache de módulo**; localizar requeriría parametrizar el locale y romper el
  cache global, afectando a consumers RRHH/globales.

Migración localizada (Opción A) descartada por riesgo en RRHH. Queda pendiente
para una etapa que toque RRHH.

### 16-E.6 Qué NO se tocó en 5E

- `lib/candidate-portal-translations.ts` (mapper de enums) — etapa dedicada.
- `lib/pageTitles.ts`, breadcrumbs dinámicos, `Metadata.auth.login`.
- Llamadas a API, payloads, nombres de campos; **no** se envía `locale` al
  backend; **no** se cambió lógica de perfil/guardado/validación de negocio ni
  autenticación.
- Componentes RRHH/Admin, resultados/salida de Vertex AI, texto libre del
  backend, datos dinámicos de API/BD/usuario, nombres propios ni tecnologías.
- No se implementaron rutas con prefijo (`/en`, `/it`, …) ni `app/[locale]`.

### 16-E.7 Tests de la etapa

- `tests/unit/metadata-i18n.test.ts`: la metadata de `/mi-perfil` se genera desde
  `next-intl` en `es`/`en`, y `Metadata.candidateProfile` mantiene paridad de
  keys en los 5 idiomas.
- `tests/unit/candidate-profile-birth-date.test.ts`: `getBirthDateInputValidationErrorCode`
  distingue `invalid`/`futureDate`/`tooYoung`; la variante string conserva el
  comportamiento previo (compatibilidad).
- `tests/unit/candidate-portal-profile-i18n.test.tsx`: `mergeLegacySelectOption`
  traduce el label pero conserva el `value` canónico, y respeta el default en
  español.
- `tests/unit/messages-structure.test.ts`: paridad exacta de keys (incluye las
  nuevas `form.validation`, `form.legacy` y `Metadata.candidateProfile`).

## 16-F. Portal RRHH básico (Etapa 6)

Etapa 6 migra a `next-intl` la **UI estática simple del Portal RRHH básico**. Es
una etapa **acotada e incremental**: no toca módulos pesados (Resultados IA,
Score Breakdown, Vacantes complejas, Reportes, Admin), ni lógica de negocio, ni
APIs, ni traduce data dinámica/IA. El ruteo sigue siendo cookie-based
(`NEXT_LOCALE`), sin prefijos ni `app/[locale]`.

### 16-F.1 Componentes / rutas RRHH migrados

| Ruta / componente                       | Tipo   | Namespace usado                  |
| --------------------------------------- | ------ | -------------------------------- |
| `app/portal-rrhh/candidatos/page.tsx`   | Client | `RecruiterPortal.candidates`     |
| `app/portal-rrhh/configuracion/page.tsx`| Server | `RecruiterPortal.settings`       |

`/portal-rrhh/candidatos` es el **home real** del Portal RRHH (la raíz
`/portal-rrhh` redirige ahí). Se migró el listado base: encabezado de página,
breadcrumb, buscador (placeholder + `aria-label`), botón **Agregar candidato**,
estados de **carga/vacío/error** controlados por frontend, botón **Reintentar**,
los **encabezados de tabla** simples (Candidato, Teléfono, País, Título, Fecha
subida, Acciones), los `aria-label`s de fila/acciones (el nombre se inyecta como
**valor** del placeholder, nunca se traduce) y la etiqueta `Contratado`/`No
Contratado` (derivada del booleano `hired` en el frontend, **no** de un enum del
backend). En `configuracion` se usa `getTranslations` de `next-intl/server`
(Server Component → la página pasa a `async`).

### 16-F.2 Namespace `RecruiterPortal` (5 idiomas)

Se añadió el namespace `RecruiterPortal` a `es/en/it/de/fr` (con `es.json` como
fuente de verdad), agrupado por sección real de UI:

```jsonc
"RecruiterPortal": {
  "candidates": { /* breadcrumb, title, description, buscador, botones,
                     loading/empty/error, followUpSaved, hired/notHired,
                     aria-labels con {name}, table.{candidate,phone,country,
                     headline,uploadedAt,actions} */ },
  "settings":   { /* breadcrumb, portalCrumb, title, description,
                     googleCalendar.{title,description} */ }
}
```

La estructura se ajustó a los **componentes reales** (en vez de los grupos
genéricos sugeridos `home/dashboard/stats/cards/...`). La paridad exacta de keys
en los 5 diccionarios la validan `tests/unit/messages-structure.test.ts` y
`tests/unit/recruiter-portal-i18n.test.tsx`.

> Las tarjetas demo `RRHHDashboardStats`, `RecentActivityCard` y
> `RecentCandidatesCard` **no** se migraron: no están montadas en ninguna ruta
> (solo se referencian en el doc de scope) y contienen datos mock con nombres
> propios. Migrarlas no aporta valor real en esta etapa.

### 16-F.3 Qué quedó fuera de scope (no migrado)

- **Resultados IA / salida de Vertex AI**, **Score Breakdown**, detalle profundo
  de candidato, **Vacantes complejas** y formularios de vacantes, **Reportes**,
  **Portal Admin** y **Configuraciones avanzadas**: intactos.
- **Mappers de estados/etapas** que dependen de enums del backend o de mappers
  compartidos (`lib/candidate-portal-translations.ts`): **pendiente** (data
  dinámica de API; ver §14.5).
- `lib/pageTitles.ts`, `lib/candidate-portal-translations.ts`, breadcrumbs
  dinámicos, `Metadata.auth.login` y rutas con prefijo: fuera de scope.
- El mapper `mapCandidateFromApi` (fallback `"Sin nombre"` y formato de fecha
  `es-CL`): es **data-shaping** sobre data de API, **no** UI estática → se dejó
  intacto y queda como pendiente menor.

### 16-F.4 Regla crítica: NO traducir data dinámica / IA / backend

```tsx
// ✅ Traducible (UI estática controlada por frontend)
<PortalPageHeader title={t("title")} description={t("description")} />
<th>{t("table.candidate")}</th>
{t("empty")}

// ❌ NO traducible (data dinámica / API / usuario / IA)
{candidate.name} {candidate.email} {candidate.country} {candidate.headline}
{candidate.date}            // fecha de subida (API)
{fetchError}                // se respeta el mensaje del backend tal cual
```

En el listado, el error de carga conserva el patrón
`err?.message ?? err?.detail ?? t("loadError")`: el mensaje del **backend** se
muestra tal cual; solo el **fallback** controlado por frontend sale del
diccionario. **No** se envía `locale` al backend ni se modificó ninguna llamada
a API.

### 16-F.5 Qué NO se tocó

- **No** se modificaron llamadas a API, payloads ni nombres de campos; **no** se
  envía `locale` al backend.
- **No** se modificó lógica de RRHH (filtros, navegación, vacantes, candidatos,
  reportes) ni de autenticación: solo se reemplazaron literales de UI por keys.
- **No** se implementaron rutas con prefijo (`/en`, `/it`, …) ni se movió nada a
  `app/[locale]`. **No** se tocó `proxy.ts`.
- **No** se tocó `lib/pageTitles.ts` ni `lib/candidate-portal-translations.ts`.
- **No** se migró Portal Admin, Resultados IA ni Score Breakdown, ni componentes
  que renderizan salida de Vertex AI.

### 16-F.6 Tests de la etapa

`tests/unit/recruiter-portal-i18n.test.tsx` valida (Vitest + Testing Library):

- `CandidatosPage` (home RRHH) renderiza su UI estática desde `next-intl` en `es`
  y `en` (título, descripción, buscador, botón, estado vacío) con `apiClient`
  mockeado a `[]`.
- `RRHHConfiguracionPage` (Server Component) renderiza título y la tarjeta de
  Calendario Google desde `next-intl` en `es` y `en` (mockeando
  `next-intl/server`).
- Presencia del namespace `RecruiterPortal` y de sus subsecciones
  (`candidates`, `settings`) en los 5 idiomas.

La suite i18n previa (`messages-structure`, `candidate-portal-i18n`,
`candidate-portal-profile-i18n`, `metadata-i18n`, `auth-i18n`, `topbars-i18n`,
`language-switcher`, `i18n-setup`) sigue pasando (66 tests i18n en verde).

## 16-G. Vacantes RRHH básico (Etapa 7)

Etapa 7 migra a `next-intl` la **UI estática simple de Vacantes RRHH**: el listado
de vacantes, su encabezado, los filtros simples, los estados de
carga/vacío/error controlados por frontend y los labels estáticos de la tarjeta
de vacante. Es una etapa **acotada e incremental**: no toca Resultados IA, Score
Breakdown, `VacancyConfig`, configuración avanzada de vacante, detalle profundo
de candidato, Reportes ni Portal Admin. El ruteo sigue siendo cookie-based
(`NEXT_LOCALE`), sin prefijos ni `app/[locale]`.

### 16-G.1 Componentes / rutas RRHH migrados

| Ruta / componente                          | Tipo   | Namespace usado                       |
| ------------------------------------------ | ------ | ------------------------------------- |
| `app/portal-rrhh/vacantes/page.tsx`        | Client | `RecruiterPortal.vacancies`           |
| `components/rrhh/VacancyListFilters.tsx`   | Client | `RecruiterPortal.vacancies.filters`   |
| `components/rrhh/VacancyListCard.tsx`      | Client | `RecruiterPortal.vacancies`           |

Se migró: encabezado de página (título, descripción), breadcrumb del topbar,
botón **Nueva Vacante** (+ variante corta `Nueva` y su `aria-label`), buscador
simple (placeholder), filtros simples (labels Nombre/Empresa/Modalidad/País/
Departamento, opción vacía «Todas»/«Todos», `aria-label` «Filtrar por {label}»,
**Limpiar filtros**), estados de **carga/vacío/error** controlados por frontend,
botón **Reintentar**, botón **Crear vacante** del empty state, los `aria-label`s
de la tarjeta (el título/empresa se inyectan como **valor** del placeholder,
nunca se traducen), el `alt` del logo, el fallback **Sin título** (solo cuando la
API no envía título) y los labels **Candidatos** / **Ver detalles**.

> El empty state usa dos keys separadas (`emptyStates.noVacancies` y
> `emptyStates.noVacanciesFiltered`) en vez de concatenar fragmentos, para no
> romper el orden gramatical en otros idiomas.

### 16-G.2 Namespace `RecruiterPortal.vacancies` (5 idiomas)

Se añadió la subsección `vacancies` al namespace `RecruiterPortal` en
`es/en/it/de/fr` (con `es.json` como fuente de verdad), agrupada por concepto
real de UI:

```jsonc
"RecruiterPortal": {
  "vacancies": {
    "breadcrumb":     "…",
    "page":          { /* title, description, *RegionLabel (aria) */ },
    "filters":       { /* regionLabel, name, searchPlaceholder, company,
                          modality, country, department, allFemale, allMale,
                          filterByAria */ },
    "cards":         { /* untitled, candidates, cardAria, cardReadOnlyAria,
                          logoAlt (todos con {title}/{company} como valor) */ },
    "actions":       { /* create, createShort, createAria, createVacancy,
                          viewDetails, viewDetailsAria, clearFilters, retry */ },
    "emptyStates":   { /* noVacancies, noVacanciesFiltered */ },
    "loadingStates": { /* loading */ },
    "errors":        { /* loadFailed (fallback de frontend) */ },
    "toasts":        { /* created (fallback de frontend) */ }
  }
}
```

La estructura se ajustó a los **componentes reales** (sin `table`, porque
Vacantes usa **tarjetas**, no tabla). La paridad exacta de keys en los 5
diccionarios la validan `tests/unit/messages-structure.test.ts` y
`tests/unit/recruiter-vacancies-i18n.test.tsx`.

### 16-G.3 Qué quedó fuera de scope (no migrado)

- **Resultados IA / salida de Vertex AI**, **Score Breakdown**, `VacancyConfig`,
  configuración avanzada de vacante, detalle profundo de candidato, **Reportes**
  y **Portal Admin**: intactos.
- **Formularios de creación/edición de vacante** (`NuevaVacanteModal`,
  `VacancyLocationFields`, etc.): formularios grandes/complejos con validaciones
  y payloads — **pendiente** para una etapa dedicada (no se tocaron en Etapa 7).
- **Sub-rutas de vacante** (`vacantes/[id]`, `…/resultados`, `…/interviews`,
  `…/technical-sheet`): detalle profundo / Resultados IA — fuera de scope.
- `app/portal-rrhh/vacantes/layout.ts` (metadata estática del `<head>`): no
  migrada (la metadata de rutas de negocio se difiere, ver §17).

### 16-G.4 Labels de estado de vacante — mapper controlado, **PENDIENTE**

`VacancyListCard` usa `STATUS_LABELS` (`Activa`/`Cerrada`/`Pausada`/`Borrador`),
un **mapper frontend** acoplado a `vacancy.status`, que a su vez deriva de
`mapStatusKey` sobre el `status`/`state` que envía el **backend**. Siguiendo la
regla de la etapa («si existe un mapper frontend controlado para estados,
documentarlo como pendiente»), **NO** se migra en Etapa 7. Se añadió un comentario
en el componente marcándolo como pendiente.

Recomendación futura: etapa dedicada que mapee cada key de estado conocida
(`activa`/`cerrada`/`pausada`/`borrador`) a `next-intl`, conservando el `value`
canónico que usa el styling y dejando intacto el fallback a `activa`.

> **Actualización (Etapa 10): RESUELTO.** Este mapper se migró de forma segura en
> la Etapa 10 — ver **§16-J**. El styling se conserva en `STATUS_STYLES` (keyed por
> el enum frontend) y el label visible se traduce vía `getVacancyStatusLabel`, con
> fallback al valor crudo si el código es desconocido.

### 16-G.5 Regla crítica: NO traducir data dinámica / IA / backend

```tsx
// ✅ Traducible (UI estática controlada por frontend)
<PortalPageHeader title={t("page.title")} description={t("page.description")} />
{t("emptyStates.noVacanciesFiltered")}
<span>{t("cards.candidates")}</span>

// ❌ NO traducible (data dinámica / API / usuario / IA)
{vacancy.title} {vacancy.company} {vacancy.modality} {vacancy.department}
{vacancy.candidates}        // conteo de candidatos (API)
{statusConfig.label}        // estado de vacante (mapper sobre backend, pendiente)
{fetchError}                // mensaje del backend se respeta tal cual
```

En la tarjeta, el título y la empresa se inyectan como **valor** del placeholder
en los `aria-label`/`alt` (`t("cards.cardAria", { title })`): se traduce solo el
envoltorio estático, nunca el dato. El error de carga conserva el patrón
`err?.message || err?.detail || t("errors.loadFailed")`: el mensaje del **backend**
se muestra tal cual; solo el **fallback** de frontend sale del diccionario.

### 16-G.6 Qué NO se tocó

- **No** se modificaron llamadas a API, payloads ni nombres de campos; **no** se
  envía `locale` al backend (la llamada sigue siendo `GET /api/recruiter/vacancies`).
- **No** se modificó la lógica de RRHH (filtrado `filterVacancyList`, navegación,
  mappers de vacante, rematch) ni de autenticación: solo se reemplazaron
  literales de UI por keys (+ se separó el empty state en dos keys y se añadió un
  prop `ariaLabel` a `FilterSelect`).
- **No** se implementaron rutas con prefijo (`/en`, `/it`, …) ni se movió nada a
  `app/[locale]`. **No** se tocó `proxy.ts`.
- **No** se tocó `lib/pageTitles.ts` ni `lib/candidate-portal-translations.ts`.
- **No** se migró Portal Admin, Resultados IA, Score Breakdown ni componentes que
  renderizan salida de Vertex AI.

### 16-G.7 Tests de la etapa

`tests/unit/recruiter-vacancies-i18n.test.tsx` valida (Vitest + Testing Library):

- `VacantesPage` renderiza su UI estática desde `next-intl` en `es` y `en`
  (título, descripción, buscador, botón Nueva Vacante, estado vacío) con
  `apiClient` y los catálogos de filtros mockeados a `[]`.
- `VacancyListCard` traduce `Candidatos` / `Ver detalles` y el fallback `Sin
  título` en `es`/`en`, manteniendo **intacta** la data dinámica (título y empresa
  de la API).
- Presencia de la subsección `vacancies` y de sus grupos (`page`, `filters`,
  `cards`, `actions`, `emptyStates`, `loadingStates`, `errors`, `toasts`) en los 5
  idiomas, y conservación de los placeholders canónicos (`Vacante: {title}`).

La suite i18n previa (`messages-structure`, `recruiter-portal-i18n`,
`candidate-portal-*`, `metadata-i18n`, `auth-i18n`, `topbars-i18n`,
`language-switcher`, `i18n-setup`) sigue pasando. Los 7 fallos preexistentes de
Vitest (`admin-vacancy-catalog-content`, `build-vacancy-progress-report-pdfkit-buffer`,
`public-vacancies`, `recruiter-companies-api`, `report-filter-renderer`) **no**
están relacionados con esta etapa (se verificó que fallan también sin estos
cambios).

## 16-H. Formulario de creación de vacante RRHH (Etapa 8)

Etapa acotada de i18n para la **UI estática del formulario de creación de
vacante** RRHH (`NuevaVacanteModal`), que quedó como pendiente de la Etapa 7.

### 16-H.1 Componentes / rutas migrados

```txt
components/rrhh/NuevaVacanteModal.tsx
```

`NuevaVacanteModal` ahora consume `useTranslations("RecruiterPortal.vacancies.form")`
para todo su texto estático: título del modal, labels y placeholders de campos,
labels de ubicación (pasados por props al `VacancyLocationFields` ya existente),
opción `Sin especificar` de los selects de área/modalidad, sección de
requerimientos (labels, placeholders, `aria-label` con índice y texto de ayuda),
acciones del footer (`Cancelar` / `Crear vacante`), validaciones frontend y
fallbacks de error controlados por frontend.

### 16-H.2 Namespace `RecruiterPortal.vacancies.form` (5 idiomas)

Se amplió `RecruiterPortal.vacancies` con el subnamespace `form`, presente en los
5 diccionarios (`es`, `en`, `it`, `de`, `fr`) con paridad exacta de keys:

```txt
form.title
form.fields.name.{label,placeholder}
form.fields.description.{label,placeholder}
form.fields.details.{label,placeholder}
form.fields.salary.{label,ariaLabel,placeholder}
form.fields.advantages.{label,placeholder}
form.fields.client.{label,ariaLabel}
form.fields.country.label
form.fields.state.label
form.fields.locationHelper
form.fields.department.{label,ariaLabel}
form.fields.modality.{label,ariaLabel}
form.fields.unspecifiedOption
form.fields.requirements.{label,namePlaceholder,valuePlaceholder,importanceLabel,helper,nameAria,valueAria,scaleAria,removeAria}
form.actions.{add,addRequirementAria,cancel,submit}
form.validation.{nameRequired,descriptionRequired,companyRequired,requirementValueRequired,requirementNameRequired}
form.errors.{createFailed,companiesLoadFailed,companiesLoadFallbackSuffix,catalogsLoadFailed,catalogsLoadFallbackSuffix}
```

Los `aria-label` indexados usan placeholder ICU `{index}` (p. ej.
`"Requerimiento {index} - Nombre"`), inyectando `index + 1` como valor.

### 16-H.3 Regla de `value` canónico (selects)

Los selects controlados por frontend traducen **solo el label visible**, nunca el
`value`. La única opción frontend del formulario es `Sin especificar`, cuyo
`value` permanece `""` (canónico) mientras el label sale del diccionario
(`form.fields.unspecifiedOption`). El test verifica explícitamente que el `value`
no cambia al traducir.

### 16-H.4 Regla crítica: NO traducir data dinámica / IA / backend

- Opciones de **empresa/cliente**, **área (departamento)** y **modalidad** vienen
  de API/BD (`listRecruiterCompanies`, `listAdminVacancyCatalog`) y **no** se
  traducen; su texto se renderiza tal cual (`company.name`, `option.displayName`).
- El nombre por defecto de compañía `Visible Outsource` es un **nombre propio** y
  se mantiene hardcodeado (no se traduce).
- Las opciones de **país/estado** del `VacancyLocationFields` provienen de
  catálogos remotos (GeoNames / countrystatecity) y **no** se traducen; solo se
  pasan por props los labels estáticos del campo.
- Los **valores ingresados por el usuario** (nombre, descripción, detalles,
  salario, ventajas, requerimientos) **no** se transforman: se envían tal cual en
  el payload.
- Errores: se conserva el patrón `err?.message || err?.detail || t(fallback)`. El
  mensaje del **backend** se muestra tal cual; solo el **fallback** de frontend
  sale del diccionario. En los avisos de carga, el mensaje del backend (o vacío)
  se concatena con un sufijo estático traducido.

### 16-H.5 Qué NO se tocó / fuera de scope

- **No** se modificaron llamadas a API, payloads ni nombres de campos; **no** se
  envía `locale` al backend (sigue `POST /api/recruiter/vacancies`).
- **No** se modificó la lógica funcional de creación de vacante (validación de
  negocio, `toSnakeCase`, pesos/atributos, `appendVacancyLocationToPayload`,
  `persistVacancyCompanyId`).
- **No** se migró el **formulario de edición** del detalle de vacante
  (`app/portal-rrhh/vacantes/[id]/page.tsx`): está acoplado a Resultados IA,
  Score Breakdown y `VacancyConfig` (fuera de scope) → **pendiente** para una
  etapa dedicada.
- **No** se migraron los textos internos de `VacancyLocationFields`
  (`Sin especificar` de país/estado, helper por defecto, errores de carga), por
  ser un componente compartido también con el detalle de vacante → **pendiente**.
- **No** se tocó `STATUS_LABELS` / mappers de estado, `lib/pageTitles.ts` ni
  `lib/candidate-portal-translations.ts`.
- **No** se implementaron rutas con prefijo ni se tocó `proxy.ts`.
- **No** se migró Portal Admin, Resultados IA, Score Breakdown ni componentes que
  renderizan salida de Vertex AI.

### 16-H.6 Tests de la etapa

`tests/unit/recruiter-vacancy-form-i18n.test.tsx` valida (Vitest + Testing Library):

- `NuevaVacanteModal` renderiza su UI estática desde `next-intl` en `es` y `en`
  (título, labels, placeholders, acciones, labels de ubicación), con API y
  catálogos mockeados.
- Las validaciones frontend (`nombre`/`descripción` requeridos) salen del
  diccionario en `es` y `en` al enviar el formulario vacío.
- El `value` canónico de la opción `Sin especificar` permanece `""` aunque el
  label se traduzca.
- Paridad exacta de keys del subnamespace `form` en los 5 idiomas.

La suite i18n previa (incl. `recruiter-vacancies-i18n` de Etapa 7 y
`messages-structure`) sigue pasando.

## 16-I. Cierre seguro de Vacantes RRHH (Etapa 9)

La Etapa 9 cierra los **pendientes seguros** de Vacantes RRHH detectados en la
Etapa 8, sin tocar edición compleja, IA, Score Breakdown ni `VacancyConfig`.

### 16-I.1 Componentes/rutas migrados

```txt
components/rrhh/VacancyLocationFields.tsx     (textos estáticos vía props)
components/rrhh/NuevaVacanteModal.tsx         (inyecta los labels traducidos)
app/portal-rrhh/vacantes/layout.ts           (metadata estática → generateMetadata)
```

### 16-I.2 Decisión sobre `VacancyLocationFields` (Opción B — props)

`VacancyLocationFields` es un componente **compartido**: lo consumen
`NuevaVacanteModal` (migrado en Etapa 8) y el **formulario de edición** del
detalle de vacante (`app/portal-rrhh/vacantes/[id]/page.tsx`), que está **fuera
de scope** por estar acoplado a IA/Score/`VacancyConfig`.

Para no acoplar el componente compartido directamente a `next-intl` ni alterar al
consumidor fuera de scope, se eligió la **Opción B (migración por props)**:

- Se añadieron props opcionales con **defaults en español** que preservan el
  comportamiento actual:
  - `unspecifiedLabel` (default `"Sin especificar"`)
  - `loadCountriesErrorLabel` (default `"No se pudieron cargar los países."`)
  - `loadStatesErrorLabel` (default `"No se pudieron cargar los estados o provincias."`)
- El estado de error interno pasó de guardar el string a una unión discriminada
  (`"countries" | "states" | null`); el texto visible se resuelve en render desde
  las props. Esto evita reejecutar efectos y mantiene la lógica intacta.
- `NuevaVacanteModal` inyecta los labels traducidos desde
  `RecruiterPortal.vacancies.location`.
- El formulario de edición (fuera de scope) **no se tocó**: usa los defaults en
  español, idéntico al comportamiento previo.

### 16-I.3 Namespace `RecruiterPortal.vacancies.location`

Solo se añadieron las keys que corresponden a textos **estáticos reales** del
componente (no se inventaron `city`/`selectCountry`/`selectState`, que no existen):

```json
{
  "RecruiterPortal": {
    "vacancies": {
      "location": {
        "unspecified": "Sin especificar",
        "loadCountriesError": "No se pudieron cargar los países.",
        "loadStatesError": "No se pudieron cargar los estados o provincias."
      }
    }
  }
}
```

### 16-I.4 Metadata de vacantes RRHH

`app/portal-rrhh/vacantes/layout.ts` tenía metadata **estática** hardcodeada
(`title.absolute` + `description`). Se migró a `generateMetadata()` con
`getTranslations`, preservando el formato `title.absolute` (override del template
`ATS | %s` del root layout):

```ts
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("Metadata.recruiterVacancies");
  return {
    title: { absolute: t("title") },
    description: t("description"),
  };
}
```

Namespace nuevo `Metadata.recruiterVacancies` (en los 5 diccionarios):

```json
{
  "Metadata": {
    "recruiterVacancies": {
      "title": "ATS | Portal RRHH | Vacantes",
      "description": "Gestiona las posiciones abiertas y vacantes de la empresa"
    }
  }
}
```

### 16-I.5 Regla de no traducir data dinámica/IA (reafirmada)

En esta etapa **solo** se tradujo UI estática controlada por el frontend. **No**
se tradujo ni alteró:

- Catálogos remotos: nombres de países/estados/provincias provienen de API/BD
  (`fetchAllLocationCountries`, `getStatesOfCountry`, GeoNames) y se renderizan
  **sin traducir**. Los `value` canónicos de los `select` (códigos ISO) no cambian.
- Data generada por IA (resúmenes, razones positivas/negativas, recomendaciones,
  Score Breakdown, señales usadas), texto extraído de archivos, texto de usuario,
  nombres propios ni tecnologías.
- No se modificaron llamadas a API ni se envió `locale` al backend.

### 16-I.6 Qué quedó fuera de scope (pendientes no seguros)

- **Formulario de edición** del detalle de vacante
  (`app/portal-rrhh/vacantes/[id]/page.tsx`): mezcla edición con IA, Score
  Breakdown y `VacancyConfig`. Sigue con textos en español hardcodeados (incl. su
  uso de `VacancyLocationFields` con labels en español por defecto).
- `STATUS_LABELS` y mappers de estados/etapas: requieren mapper dedicado con
  fallback al valor crudo del backend — **pendiente** (ver §16-G.4).
- `VacancyConfig`, Resultados IA, Score Breakdown, Hard gates, pesos de scoring:
  no se tocan (data IA / configuración delicada).
- `lib/pageTitles.ts` y `lib/candidate-portal-translations.ts`: intactos.

### 16-I.7 Tests de la etapa

`tests/unit/recruiter-vacancy-location-i18n.test.tsx` valida (Vitest + Testing
Library):

- `VacancyLocationFields` renderiza la opción «Sin especificar/Unspecified» y el
  mensaje de error de carga desde los **labels recibidos por props** en `es` y
  `en` (catálogos remotos mockeados, forzando el camino de error).
- El componente usa los **defaults en español** cuando no se pasan labels
  (consumidores legacy / fuera de scope).
- `generateMetadata` del layout de vacantes resuelve `title`/`description` desde
  `next-intl` en `es` y `en`.
- Paridad exacta de keys de `RecruiterPortal.vacancies.location` y
  `Metadata.recruiterVacancies` en los 5 idiomas.

La suite i18n previa (incl. `recruiter-vacancy-form-i18n` de Etapa 8,
`metadata-i18n` y `messages-structure`) sigue pasando. Las fallas restantes de la
suite global (reportes PDF, `recruiter-companies-api`, `public-vacancies`,
`admin-vacancy-catalog`, `report-filter-renderer`) son **preexistentes** y ajenas
a esta etapa (verificado con y sin los cambios de Etapa 9).

## 16-J. Mappers controlados de estados/labels (Etapa 10)

Etapa de migración **segura y acotada** de mappers controlados de estados/labels
que dependen de **códigos/enums/booleanos frontend estables**. Regla principal:

> Solo traducir códigos/enums/booleanos controlados. Si llega texto libre, valor
> desconocido o label configurado desde backend/BD, **mostrar el valor crudo**.

### 16-J.1 Mappers auditados

Patrones buscados: `STATUS_LABELS`, `statusLabel(s)`, `translateStageName`,
`translateApplicationStatus`, `translateStageStatus`, `getApplicationStatusStyle`,
`mapCandidateFromApi`, y fallbacks (`Sin nombre`, `Sin título`, `No especificado`,
`Contratado`/`No Contratado`, `Activa`/`Cerrada`/`Pausada`/`Borrador`).

| Mapper / archivo | Categoría | Decisión |
| --- | --- | --- |
| `STATUS_LABELS` (label) en `components/rrhh/VacancyListCard.tsx` | **A** | **Migrado** |
| Fallback `"Sin nombre"` en `mapCandidateFromApi` (`app/portal-rrhh/candidatos/page.tsx`) | **A** | **Migrado** |
| Booleano `hired`/`notHired` (`candidatos/page.tsx`) | A | Ya migrado en Etapa 6 (`t("hired")`/`t("notHired")`) — sin cambios |
| Fallback `cards.untitled` (`"Sin título"`) en `VacancyListCard` | A | Ya migrado en Etapa 7 — sin cambios |
| `translateApplicationStatus` (`lib/candidate-portal-translations.ts`) | **C** | No migrado (acoplado a `getApplicationStatusStyle` por substring) |
| `translateStageStatus` (`lib/candidate-portal-translations.ts`) | B/C | No migrado (vive junto a los anteriores; se difiere en bloque) |
| `translateStageName` (`lib/candidate-portal-translations.ts`) | **B** | No migrado (nombres de etapa del backend/BD) |
| `getApplicationStatusStyle` (`lib/candidate-portal-translations.ts`) | **C** | No migrado (styling por substring del label) |

### 16-J.2 Mappers migrados (Categoría A)

**1) Estado de vacante — `lib/vacancies/vacancy-status-labels.ts` (nuevo).**

El enum frontend estable `VacancyListStatusKey` (`activa | cerrada | pausada |
borrador`), producido por `mapStatusKey`, se traduce con:

```ts
export const VACANCY_STATUS_TRANSLATION_KEYS = {
  activa: "statuses.active",
  cerrada: "statuses.closed",
  pausada: "statuses.paused",
  borrador: "statuses.draft",
} as const satisfies Record<VacancyListStatusKey, string>

export function getVacancyStatusLabel(status, t) {
  if (!status) return ""
  const key = VACANCY_STATUS_TRANSLATION_KEYS[status]
  return key ? t(key) : String(status) // fallback al valor crudo
}
```

En `VacancyListCard` el styling se separó en `STATUS_STYLES` (sólo `bgClass`/
`textClass`, keyed por el enum) y el label visible se obtiene de
`getVacancyStatusLabel(vacancy.status, t)` con `t = useTranslations("RecruiterPortal.vacancies")`.

**2) Fallback `"Sin nombre"` — `mapCandidateFromApi`.**

Es un **fallback frontend controlado** (no es data del backend): sólo se aplica
cuando el nombre real llega vacío. Se parametrizó el mapper con `noNameLabel`
(default crudo `"Sin nombre"`) y la página lo resuelve vía `t("noName")`:

```ts
const noNameLabel = t("noName")
setCandidates(list.map((item, i) => mapCandidateFromApi(item, i, noNameLabel)))
```

El nombre real del candidato (data dinámica) **no** se traduce ni transforma.

### 16-J.3 Namespaces agregados

`es` es la fuente de verdad; paridad exacta en los 5 diccionarios.

```jsonc
"RecruiterPortal": {
  "vacancies": {
    "statuses": { "active": "Activa", "closed": "Cerrada", "paused": "Pausada", "draft": "Borrador" }
  },
  "candidates": {
    "noName": "Sin nombre" // + hired/notHired ya existentes
  }
}
```

### 16-J.4 Regla de fallback al valor crudo

Todo mapper migrado devuelve el **valor crudo** cuando el código no es un enum
controlado conocido:

```ts
status = "ACTIVE"                    → t("statuses.active")
status = "CUSTOM_STATUS_FROM_BACKEND" → "CUSTOM_STATUS_FROM_BACKEND" // sin traducir
```

### 16-J.5 Mappers NO migrados y razón

- **`lib/candidate-portal-translations.ts` (se mantiene la decisión de 5B/5C/§15.3).**
  - `translateStageName`: mapea **nombres de etapa del backend/BD** (`Revision`,
    `Offer`, `Aplicantes`, `Entrevista`, `En espera`) → data dinámica, **no** UI
    estática. Traducirla violaría la regla crítica.
  - `getApplicationStatusStyle`: deriva el estilo por **substring del label**
    traducido (`contratado`, `activ`, `pendiente`…). Traducir el label a `it/de/fr`
    **rompería** el styling → **Categoría C**, requiere refactor dedicado que
    separe códigos estables del styling.
  - `translateApplicationStatus`/`translateStageStatus`: aunque las keys parecen
    enums (`Active`, `Pending`…), están **acopladas** a `getApplicationStatusStyle`
    vía el texto que producen → se difieren en bloque junto al refactor de estilos.

### 16-J.6 Qué NO se tocó (en línea con el scope)

- **No** se modificaron llamadas a API, payloads ni nombres de campos; **no** se
  envía `locale` al backend.
- **No** se modificó la lógica de RRHH/candidatos/vacantes/auth (sólo se separó
  styling de label y se parametrizó un fallback de display).
- **No** se tradujo data dinámica/IA/backend: `{candidate.name}`, `{vacancy.title}`,
  `{company.name}`, `{stage.name}`, resultados/razonamientos de Vertex AI, Score
  Breakdown, texto libre de API.
- **No** se implementaron rutas con prefijo (`/en`, `/it`…) ni `app/[locale]`; **no**
  se tocó `proxy.ts` ni `lib/pageTitles.ts`.
- **No** se migró Portal Admin, Resultados IA, Score Breakdown ni `VacancyConfig`.

### 16-J.7 Tests de la etapa

- `tests/unit/recruiter-status-mappers-i18n.test.tsx` (nuevo):
  - `getVacancyStatusLabel` traduce códigos conocidos en `es`/`en`, devuelve el
    valor crudo para un código desconocido (sin invocar `t`) y `""` para `null`.
  - `VacancyListCard` traduce el estado controlado en `es`/`en` y muestra el valor
    crudo para un estado no controlado, sin tocar la data dinámica.
  - Paridad de `vacancies.statuses` y de `candidates.noName/hired/notHired` en los
    5 idiomas + verificación de las translation keys del mapper.
- `tests/unit/recruiter-candidates-status-i18n.test.tsx` (nuevo): renderiza
  `CandidatosPage` con `apiClient` mockeado y valida que `"Sin nombre"` se traduce
  (`es`/`en`) **sólo** cuando el nombre llega vacío, que el nombre real no se
  traduce, y que el booleano `hired`/`notHired` resuelve labels controlados.
- `tests/unit/messages-structure.test.ts` sigue pasando (paridad de los 5
  diccionarios).

Los **7 fallos preexistentes** de Vitest (`admin-vacancy-catalog-content`,
`build-vacancy-progress-report-pdfkit-buffer`, `public-vacancies`,
`recruiter-companies-api`, `report-filter-renderer`) **no** están relacionados con
esta etapa: se verificó vía `git stash` que fallan igual sin estos cambios.
`npm run build` pasa (exit 0). `tsc`/`lint` reportan únicamente errores
preexistentes en archivos fuera de scope (tests de reportes/admin/companies).

## 17. Pendientes para la siguiente etapa

- Decidir si se adopta ruteo por prefijo (requiere mover rutas a `app/[locale]/`).
- Integrar `lib/pageTitles.ts` con `next-intl` (breadcrumbs/títulos) — ver §11.7 y §13.4.
- Aplicar `Metadata.auth.login` cuando se decida reestructurar el login a
  server wrapper + client content (o cuando se migre a ruteo por prefijo).
- El **Portal RRHH básico** se migró en Etapa 6 (§16-F: listado de candidatos +
  configuración) y **Vacantes RRHH básico** en Etapa 7 (§16-G: listado, filtros
  simples y tarjeta). El **formulario de creación de vacante**
  (`NuevaVacanteModal`) se migró en Etapa 8 (§16-H). El **cierre seguro de
  Vacantes RRHH** se hizo en Etapa 9 (§16-I): textos estáticos de
  `VacancyLocationFields` (vía props) y metadata estática de
  `/portal-rrhh/vacantes`. Quedan pendientes los módulos RRHH pesados:
  **formulario de edición** del detalle de vacante
  (`app/portal-rrhh/vacantes/[id]/page.tsx`), detalle profundo de
  candidato, Resultados IA / Score Breakdown, `VacancyConfig`, Reportes,
  Entrevistas, Etapas/Estados y Configuraciones avanzadas. El mapper de estado de
  vacante (`STATUS_LABELS` de la tarjeta) **se migró en Etapa 10** — ver §16-J.
- Migrar módulos de negocio (Vacantes, Candidatos, Admin) por fases, poblando los
  namespaces reservados (`Errors`, `EmptyStates`, etc.).
- El **Perfil del Candidato** se migró en Etapa 5D (§16). Quedan pendientes los
  mensajes de validación y `triggerLabel` del hook compartido
  `use-candidate-profile-editor.ts`, las opciones de país
  (`getCountrySelectOptions`) y la metadata de `app/mi-perfil/page.tsx`.
- Migrar el mapper de enums `lib/candidate-portal-translations.ts` con keys por
  enum y fallback al valor crudo de la API — ver §14.5.
- Migrar registro (`app/auth/registrarse`) y páginas públicas de oportunidades.
- Internacionalizar errores de backend **solo** si el backend expone códigos de
  error estables (deuda compartida frontend/backend).
- Migrar la metadata de rutas de negocio (`portal-*`) si se requiere SEO/títulos
  localizados, una vez migrados sus módulos.
