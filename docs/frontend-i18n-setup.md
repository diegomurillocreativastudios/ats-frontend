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

## 12. Pendientes para la siguiente etapa

- Decidir si se adopta ruteo por prefijo (requiere mover rutas a `app/[locale]/`).
- Integrar `lib/pageTitles.ts` con `next-intl` (breadcrumbs/títulos) — ver §11.7.
- Migrar módulos de negocio (Vacantes, Candidatos, Admin, Portal candidato) por
  fases, poblando los namespaces reservados (`Errors`, `EmptyStates`, etc.).
- Poblar `Validation`/`Errors` al migrar formularios complejos.
