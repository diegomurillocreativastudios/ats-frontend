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
   `/auth/sso/success?code=...`
6. La página `/auth/sso/success` llama a:
   `POST /api/auth/sso/exchange` (route handler local).
7. El route handler llama al backend:
   `POST {BACKEND_URL}/api/auth/sso/exchange`
8. Se setean cookies de sesión con el helper compartido (`lib/auth/server-auth-session.ts`).
9. Redirección final:
   - `returnUrl` del backend (si es interno)
   - `returnUrl` / `from` en query (si es interno)
   - default: `/seleccion-portal`

## Rutas públicas

- `/auth/iniciar-sesion`
- `/auth/sso/success`

Registradas en `lib/auth/public-paths.ts`.

`proxy.ts` excluye explícitamente `/auth/sso/success` de redirects de páginas auth.

## Errores

- `?error=...` o `?reason=...` en `/auth/sso/success` → mensaje amigable, sin exchange.
- Códigos conocidos del backend mapeados en `lib/auth/sso-errors.ts`.
- `account_exists`: la cuenta local ya existe y LinkedIn **no** se auto-vincula; el usuario debe entrar con correo/contraseña.
- Si el backend redirige a `/auth/iniciar-sesion?reason=account_exists` (o `error=`), el login muestra el mismo mensaje.
- Traducciones en `Auth.sso.*` (`messages/*.json`).

## Cómo probar local

1. Definir `NEXT_PUBLIC_API_URL` apuntando al backend local.
2. Ir a `/auth/iniciar-sesion`.
3. Probar login LinkedIn completo.
4. Probar `?from=/portal-rrhh`.
5. Probar `/auth/sso/success?error=access_denied`.
6. Probar `/auth/sso/success?reason=account_exists` y `/auth/iniciar-sesion?reason=account_exists`.
7. Confirmar que login email/password sigue funcionando.

## Dependencia backend

- `GET /api/auth/linkedin/login`
- `POST /api/auth/sso/exchange`
- Redirect final del backend hacia `/auth/sso/success?code=...`
- Redirect de error hacia `/auth/sso/success?error=...` o `?reason=...` (p. ej. `account_exists`)
