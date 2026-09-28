# API de logout y refresh (backend ATS)

Referencia para el backend y para alinear **BFF Next.js** (`/api/auth/*`) y la app.

**Base URL del API:** la configurada en `NEXT_PUBLIC_API_URL` / `API_URL` (sin `/` final).

Cierra **FE-SEC-014**: revocación demostrable de la familia de refresh tokens.

---

## Resumen

| Método | Ruta | Rol |
|--------|------|-----|
| `POST` | `/auth/refresh` | Renueva access + refresh. Rota el refresh; reuse de uno ya rotado revoca toda la familia. |
| `POST` | `/auth/logout` | Revoca la familia del refresh enviado. Respuesta uniforme. |

Los endpoints Identity `POST /identity/refresh` responden **410 Gone**. Usar solo `/auth/*` (vía BFF).

---

## 1) `POST /auth/refresh`

**Body:**

```json
{ "refreshToken": "<valor opaco>" }
```

**200** — tokens nuevos (mismo esquema que login):

```json
{
  "tokenType": "Bearer",
  "accessToken": "...",
  "expiresIn": 3600,
  "refreshToken": "..."
}
```

El refresh anterior queda marcado como `rotated`. Un segundo uso del anterior (**replay**) revoca **toda** la familia (incluido el refresh vigente) y responde **401**.

**401** — token ausente, inválido, expirado, familia muerta o reuse.

**429** — rate limit.

---

## 2) `POST /auth/logout`

**Body:**

```json
{ "refreshToken": "<opcional>" }
```

**200** — siempre:

```json
{ "ok": true }
```

Si el hash del refresh existe, se revoca su familia (`logout`). Sin token o token desconocido: igual **200** (no enumerar).

**429** — rate limit.

---

## Comportamiento del BFF / app (implementado)

| Caso | Comportamiento |
|------|----------------|
| Logout con refresh en cookie | BFF llama `POST {API}/auth/logout` y **siempre** borra cookies de sesión. |
| Backend caído / timeout | Cookies se borran igual; UI puede mostrar toast de “no confirmamos”. |
| Refresh fallido | BFF limpia access, refresh, expires, `ats_user` y CSRF. |
| Refresh exitoso | Nuevas cookies HttpOnly; rota CSRF. |

---

## Checklist de integración (BFF / Next)

- [x] Logout: `POST {API}/auth/logout` con `{ refreshToken }` cuando hay cookie.
- [x] Logout: borrar cookies aunque el API falle.
- [x] Refresh: `POST {API}/auth/refresh` (no `/api/auth/refresh` ni `/identity/refresh`).
- [x] Refresh fallido: limpiar todas las cookies de sesión.

---

## Errores frecuentes

- Llamar `/identity/refresh` → **410**.
- Reusar un refresh ya rotado → **401** y familia muerta (señal de robo).
- Desplegar el cambio de ruta del BFF **antes** del backend → refresh falla hasta re-login.
