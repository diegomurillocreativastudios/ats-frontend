# API de recuperación de contraseña (backend ATS)

Referencia para el backend y para alinear **BFF Next.js** (`/api/auth/*`) y la app.

**Base URL del API:** la configurada en `NEXT_PUBLIC_API_URL` (sin `/` final).

---

## Resumen

El backend expone dos endpoints JSON (`Content-Type: application/json`):

| Método | Ruta | Rol |
|--------|------|-----|
| `POST` | `/auth/forgot-password` | El usuario indica el correo; si existe cuenta, se gestiona recuperación (token en BD, envío de mail si aplica). |
| `POST` | `/auth/reset-password` | Nueva contraseña. Identificación: **token** (enlace del mail) o **email** (flujo in-app / solo correo). |

---

## 1) `POST /auth/forgot-password`

**Body:**

```json
{ "email": "usuario@dominio.com" }
```

**400** — correo vacío o formato inválido: `{ "message": "..." }`

**200** — siempre que el formato sea válido:

```json
{
  "exists": true,
  "success": true,
  "message": "texto para mostrar al usuario"
}
```

`exists` y `success` son el mismo valor.

- Si **no** hay cuenta: `exists: false`, `success: false`, mensaje acorde.
- Si **sí** hay cuenta: `exists: true`, `success: true`, mensaje de confirmación (mail, avisos, etc.).

---

## 2) `POST /auth/reset-password`

### Opción A — enlace del correo (flujo mail)

```json
{
  "password": "TuNuevaClave123",
  "token": "<valor del query ?token=... del enlace>"
}
```

No enviar `email`. El `token` es obligatorio en este modo. El backend valida el token guardado en BD.

### Opción B — solo correo (`email` + `password`)

```json
{
  "password": "TuNuevaClave123",
  "email": "usuario@dominio.com"
}
```

No enviar `token`, o enviarlo **vacío**. El backend busca el usuario por correo; si existe, genera el token interno de Identity y actualiza la contraseña (comportamiento actual del servicio). Tras un cambio correcto, marca como usados los tokens de recuperación pendientes de ese usuario.

### Prioridad si llegan `token` y `email`

El backend **prioriza `token`**. Si el token es viejo o inválido, **falla aunque el email sea válido**. En el front, para el flujo solo por correo: **no envíes `token`** en el body; solo `{ password, email }`.

**Contraseña:** mínimo 8 caracteres (validar en cliente; el backend puede rechazar con **400**).

**200** éxito:

```json
{ "ok": true }
```

**400** — token/correo inválidos, contraseña no válida, etc.: `{ "message": "..." }`.

**429** — rate limit.

---

## Comportamiento del BFF / app (implementado)

| Caso | Cuerpo hacia `{API}/auth/reset-password` |
|------|------------------------------------------|
| URL con `?token=...` (no vacío) | `{ password, token }` — **sin** `email`. |
| URL con `?email=...` y **sin** `token` | `{ password, email }` — **sin** `token`. |

Así se evita mandar ambos campos y se respeta la prioridad del backend.

---

## Seguridad (contexto de producto)

Un endpoint que acepte solo `email` + `password` sin un segundo factor verificable implica que quien pueda invocar ese endpoint con un correo registrado podría intentar cambiar la contraseña **sin demostrar posesión del correo**, salvo controles en BFF (sesión, IP, captcha, etc.). Endurecer en el futuro implicaría volver a exigir token/OTP u otro paso verificable.

---

## Checklist de integración (BFF / Next)

- [ ] Forgot: `POST {API}/auth/forgot-password` con `{ email }`.
- [ ] Redirección a `/restablecer-contrasena?email=...` tras `exists/success` (producto actual).
- [ ] Reset por correo: `POST` con `{ password, email }` sin `token`.
- [ ] Reset por mail: `POST` con `{ password, token }` sin `email`.
- [ ] No enviar contraseña en `forgot-password`; solo en `reset-password`.

---

## Errores frecuentes

- Enviar **`token` y `email` a la vez** en el flujo “solo correo”: el backend usa el token; si es inválido, falla aunque el correo sea correcto. El BFF ya separa los dos flujos.
- Token expirado o ya usado (flujo mail) → error genérico.
- `NEXT_PUBLIC_API_URL` mal configurada → 404 o CORS.
