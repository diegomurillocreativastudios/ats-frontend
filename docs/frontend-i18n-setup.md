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

## 16. Pendientes para la siguiente etapa

- Decidir si se adopta ruteo por prefijo (requiere mover rutas a `app/[locale]/`).
- Integrar `lib/pageTitles.ts` con `next-intl` (breadcrumbs/títulos) — ver §11.7 y §13.4.
- Aplicar `Metadata.auth.login` cuando se decida reestructurar el login a
  server wrapper + client content (o cuando se migre a ruteo por prefijo).
- Migrar módulos de negocio (Vacantes, Candidatos, Admin) por fases, poblando los
  namespaces reservados (`Errors`, `EmptyStates`, etc.).
- Completar el Portal Candidato: **perfil** (`app/mi-perfil`,
  `candidate-self-profile-view.tsx`, `candidate-profile-edit-field-groups.tsx`).
  Los sub-componentes de subida de documentos ya se migraron en Etapa 5C (§15).
- Migrar el mapper de enums `lib/candidate-portal-translations.ts` con keys por
  enum y fallback al valor crudo de la API — ver §14.5.
- Migrar registro (`app/auth/registrarse`) y páginas públicas de oportunidades.
- Internacionalizar errores de backend **solo** si el backend expone códigos de
  error estables (deuda compartida frontend/backend).
- Migrar la metadata de rutas de negocio (`portal-*`) si se requiere SEO/títulos
  localizados, una vez migrados sus módulos.
