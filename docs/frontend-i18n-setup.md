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

## 11. Pendientes para la siguiente etapa

- Decidir si se adopta ruteo por prefijo (requiere mover rutas a `app/[locale]/`).
- Migrar componentes transversales (navegación, primitivos UI) a claves i18n.
- Definir convención de naming de claves y poblar `en/it/de/fr` reales.
