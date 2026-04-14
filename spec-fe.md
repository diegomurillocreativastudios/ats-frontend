# Contrato frontend: Olvidé contraseña y restablecer contraseña

Este documento es la referencia mínima para que el frontend complete el flujo contra la API actual. Base URL de ejemplo: `https://<API_HOST>` (sin path común `/api` para estos endpoints).

---

## 1. Variables de entorno recomendadas

| Variable | Uso |
|----------|-----|
| URL pública del backend | Ej. `NEXT_PUBLIC_API_URL` o similar — base para `fetch` |
| URL pública del SPA | Debe alinearse con `PasswordReset:PublicAppBaseUrl` en servidor (misma origen que el enlace del correo) |

El correo que envía el backend apunta a:

`{PUBLIC_APP_URL}/auth/restablecer-contrasena?token=<TOKEN>`

Implementá la ruta **`/auth/restablecer-contrasena`** (o equivalente en tu router) y leé el query param **`token`**.

---

## 2. Endpoints

### 2.1 Solicitar enlace — `POST /auth/forgot-password`

**Headers:** `Content-Type: application/json`

**Body:**

```json
{
  "email": "usuario@ejemplo.com"
}
```

**Respuesta 200 OK**

```json
{
  "exists": true,
  "success": true,
  "message": "Te enviamos un correo con un enlace para restablecer tu contraseña."
}
```

Notas:

- En esta API, **`exists` y `success` vienen con el mismo valor** (indican si había cuenta con ese correo).
- Mensajes posibles incluyen: correo no registrado, cuenta sin envío por falta de configuración del servidor, fallo temporal del envío, etc. (texto en español, campo `message`).

**Errores 400**

```json
{
  "message": "El correo electrónico es obligatorio."
}
```

```json
{
  "message": "El formato del correo electrónico no es válido."
}
```

**429 Too Many Requests** — límite: **5 req / IP / minuto**

```json
{
  "message": "Demasiados intentos. Probá de nuevo más tarde."
}
```

---

### 2.2 Restablecer contraseña — `POST /auth/reset-password`

**Headers:** `Content-Type: application/json`

**Flujo principal (desde el mail):** enviar **`password`** + **`token`** (el de la URL). **`email`** puede omitirse o ir `null`.

**Body ejemplo (recomendado desde la pantalla de enlace):**

```json
{
  "password": "nuevaContraseñaSegura",
  "token": "<valor del query param token>",
  "email": null
}
```

**Flujo alternativo (solo si el producto lo habilita):** si solo hay **`email`** (sin `token`), el backend acepta restablecer con correo; si vienen **ambos**, **manda el backend por `token`**.

**Respuesta 200 OK**

```json
{
  "ok": true
}
```

**Errores 400 (ejemplos)**

```json
{
  "message": "Solicitud inválida."
}
```

```json
{
  "message": "La contraseña no cumple los requisitos."
}
```

```json
{
  "message": "Indicá el token de recuperación (enlace del correo) o el correo tras haber solicitado restablecer la contraseña."
}
```

```json
{
  "message": "El enlace no es válido o expiró."
}
```

**429** — límite: **10 req / IP / minuto** (mismo cuerpo que en forgot).

---

## 3. Reglas de UI sugeridas

| Pantalla | Comportamiento |
|----------|----------------|
| **Olvidé contraseña** | Campo email; POST a `/auth/forgot-password`; mostrar `message` del servidor o un texto fijo si querés ocultar si el correo existe (la API igual devuelve `exists`). |
| **Restablecer contraseña** | Leer `token` de `?token=`; formulario nueva contraseña + confirmación en cliente; POST con `password` y `token`. |
| **Validación cliente** | Mínimo **8 caracteres** para alinear con `MinimumPasswordLength` por defecto (el backend puede configurarse distinto). |
| **Éxito** | Tras `ok: true`, redirigir a login con mensaje de éxito. |
| **Token faltante** | Si el usuario entra a `/auth/restablecer-contrasena` sin `token`, no llamar a reset sin datos; mostrar error o enlace a “Olvidé contraseña”. |

---

## 4. Checklist de integración

1. [ ] `POST` absoluto: `{API_BASE}/auth/forgot-password` y `{API_BASE}/auth/reset-password` (sin `/api` extra salvo que tu gateway añada path; en el repo actual son rutas raíz).
2. [ ] Manejar **429** con mensaje amigable y backoff / deshabilitar botón temporalmente.
3. [ ] Ruta SPA **`/auth/restablecer-contrasena`** coherente con el link del correo.
4. [ ] Codificación: enviar el `token` tal cual en JSON (el valor ya viene correcto en la query string).
5. [ ] Probar flujo completo en el entorno donde `PasswordReset__PublicAppBaseUrl` y el mail estén configurados.

---

## 5. Referencia rápida de archivos backend

- Contratos JSON y mensajes: `engine/Identity/PasswordResetEndpointExtensions.cs`
- Texto del enlace del mail: `MatchEngine.Infrastructure/Services/PasswordResetService.cs` (`/auth/restablecer-contrasena?token=`)

---

*Documento pensado para el equipo frontend; copiar/pegar en ticket o wiki según convenga.*
