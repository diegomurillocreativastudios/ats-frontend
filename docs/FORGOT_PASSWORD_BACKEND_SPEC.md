# API de recuperación de contraseña (backend ATS)

Referencia para el backend y para alinear **BFF Next.js** (`/api/auth/*`) y la app.

**Base URL del API:** la configurada en `NEXT_PUBLIC_API_URL` (sin `/` final).

---

## Resumen

El backend expone dos endpoints JSON (`Content-Type: application/json`):

| Método | Ruta | Rol |
|--------|------|-----|
| `POST` | `/auth/forgot-password` | El usuario indica el correo. Si existe cuenta, se genera un token de un solo uso con expiración y se envía el enlace por mail. La respuesta **no revela** si el correo está registrado. |
| `POST` | `/auth/reset-password` | Nueva contraseña. Solo con **token** del enlace de recuperación (`?token=...`). |

Los endpoints legacy `/identity/forgotPassword` y `/identity/resetPassword` responden **410 Gone**. Usar solo `/auth/*` (vía BFF).

---

## 1) `POST /auth/forgot-password`

**Body:**

```json
{ "email": "usuario@dominio.com" }
```

**400** — correo vacío o formato inválido: `{ "message": "..." }`

**429** — rate limit (mismo comportamiento que antes).

**200** — siempre el mismo mensaje genérico, exista o no la cuenta:

```json
{
  "message": "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña."
}
```

No vienen `exists` ni `success`. El front **no** debe bifurcar la UI según existencia de cuenta ni redirigir a `/restablecer-contrasena?email=...`.

---

## 2) `POST /auth/reset-password`

**Body (único modo aceptado):**

```json
{
  "password": "TuNuevaClave123",
  "token": "<valor del query ?token=... del enlace>"
}
```

- `token` es **obligatorio**.
- `email` **no** se acepta como forma de reset. Si se envía solo `{ password, email }` → **400**.

**Contraseña:** mínimo 8 caracteres (validar en cliente; el backend puede rechazar con **400**).

**200** éxito:

```json
{ "ok": true }
```

Tras un reset exitoso, las sesiones Bearer existentes dejan de valer (401). El usuario debe volver a iniciar sesión.

**400** — token faltante/inválido/expirado/reusado, o password corta: `{ "message": "..." }`.

**429** — rate limit.

---

## Enlace del correo

```
{PublicAppBaseUrl}/auth/restablecer-contrasena?token=...
```

El front lee `token` de la query y lo envía en el body del reset. Sin token (o con enlace inválido/expirado en el backend), el formulario no debe permitir el cambio.

---

## Comportamiento del BFF / app (implementado)

| Caso | Comportamiento |
|------|----------------|
| Forgot `200` | BFF y UI muestran siempre el mensaje genérico; sin `exists`/`success`. |
| Reset con `?token=...` | `POST` con `{ password, token }` — **sin** `email`. |
| Reset sin `token` (p. ej. solo `?email=` o URL vacía) | Formulario bloqueado; UI de enlace inválido/expirado. |

---

## Seguridad (contexto de producto)

El cambio de contraseña exige posesión del enlace con token de un solo uso. No es posible restablecer solo con correo + nueva contraseña. El backend invalida tokens reusados, aplica rate limiting e invalida sesiones existentes tras un reset exitoso.

---

## Checklist de integración (BFF / Next)

- [x] Forgot: `POST {API}/auth/forgot-password` con `{ email }`.
- [x] Forgot: UI uniforme (sin `exists`/`success`); sin redirect a `?email=`.
- [x] Reset: `POST` con `{ password, token }` sin `email`.
- [x] Sin token en la URL → bloquear el form y mostrar enlace inválido/expirado.
- [x] No enviar contraseña en `forgot-password`; solo en `reset-password`.

---

## Errores frecuentes

- Enviar `{ password, email }` sin token → **400** (contrato endurecido).
- Token expirado o ya usado → **400** con mensaje genérico.
- `NEXT_PUBLIC_API_URL` mal configurada → 404 o CORS.
