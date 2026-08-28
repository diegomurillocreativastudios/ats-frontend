# LinkedIn SSO — Frontend

Este documento describe el flujo frontend de inicio de sesión con LinkedIn en ApplicanTree ATS.

## Arquitectura

El frontend **no** usa NextAuth ni guarda tokens en el navegador.

Patrón BFF (igual que el login tradicional):

```text
browser → route handler Next.js → backend → cookies
```

## Variables de entorno

```env
NEXT_PUBLIC_API_URL=https://TU_BACKEND_RENDER_URL
```

En route handlers del servidor también se respetan, si existen:

```env
API_URL=
BACKEND_URL=
```

Ver `lib/server-backend-url.ts`.

**No** agregar secretos de LinkedIn al frontend.

## Flujo

1. Usuario abre `/auth/iniciar-sesion`.
2. Click en **Continuar con LinkedIn** (`components/auth/LinkedInLoginButton.tsx`).
3. Redirección full-page a:
   `{NEXT_PUBLIC_API_URL}/api/auth/linkedin/login`
4. Si la URL de login incluye `?from=/ruta-interna`, el botón envía `returnUrl` al backend.
5. Backend redirige a LinkedIn y vuelve al frontend en:
   `/auth/sso/success#code={exchangeCode}`
   (`returnUrl` opcional en query: `/auth/sso/success?returnUrl=/portal#code=...`)
   El path **no** debe llevar slash final: `/auth/sso/success/#code=` dispara un 308
   de Vercel/Next y puede perder el fragmento.
6. La página `/auth/sso/success` lee el `code` **solo del fragmento** (`window.location.hash`),
   limpia el hash con `history.replaceState` (y cualquier `?code=` legado sin usarlo),
   y llama a `POST /api/auth/sso/exchange` (route handler local).
7. El route handler llama al backend:
   `POST {BACKEND_URL}/api/auth/sso/exchange`
8. Se setean cookies de sesión con el helper compartido (`lib/auth/server-auth-session.ts`).
9. Redirección final:
   - `returnUrl` del backend (si es interno)
   - `returnUrl` / `from` en query (si es interno)
   - default: `/seleccion-portal`

**Cutover (BE-SEC-013 residual):** el exchange code **no** debe viajar en `?code=`.
No hay fallback permanente a query: FE y BE deben desplegar el cambio de redirect
(`SuccessRedirect` → `#code=`) en el mismo release. Nunca loguear `code`, hash ni Location.

## Rutas públicas

- `/auth/iniciar-sesion`
- `/auth/sso/success`

Registradas en `lib/auth/public-paths.ts`.

`proxy.ts` excluye explícitamente `/auth/sso/success` de redirects de páginas auth.
También alias `/login` y `/iniciar-sesion` → `/auth/iniciar-sesion` (conserva query).

## Errores

- `?error=...` o `?reason=...` en `/auth/sso/success` → mensaje amigable, sin exchange.
- Los errores **siguen en query** (no en hash). Códigos conocidos en `lib/auth/sso-errors.ts`.
- `account_exists`: la cuenta local ya existe y LinkedIn **no** se auto-vincula; el usuario debe entrar con correo/contraseña.
- Si el backend redirige a `/auth/iniciar-sesion?reason=...` (o `/login?error=linkedin_sso_failed&reason=...`),
  el login muestra el mensaje dedicado cuando el `reason` es conocido.
- Traducciones en `Auth.sso.*` (`messages/*.json`).

## Cómo probar local

1. Definir `NEXT_PUBLIC_API_URL` apuntando al backend local (con redirect a `#code=`).
2. Ir a `/auth/iniciar-sesion`.
3. Probar login LinkedIn completo: confirmar que tras aterrizar no queda `code=` en query ni en history.
4. Probar `?from=/portal-rrhh`.
5. Probar `/auth/sso/success?error=access_denied`.
6. Probar `/auth/sso/success?reason=account_exists` y `/auth/iniciar-sesion?reason=account_exists`.
7. Confirmar que `/auth/sso/success?code=...` (sin hash) **no** hace exchange.
8. Confirmar que login email/password sigue funcionando.

## Dependencia backend

- `GET /api/auth/linkedin/login`
- `POST /api/auth/sso/exchange`
- Redirect de éxito: `/auth/sso/success#code={exchangeCode}` (+ `?returnUrl=` opcional)
- Redirect de error: `/auth/sso/success?error=...` o `?reason=...` (o `/login` con los mismos params)
- `Referrer-Policy: no-referrer` en redirects del backend
