# Especificación: Portal Admin y gestión de usuarios

## Objetivo

Introducir un **portal de administración** (`portal-admin`) accesible solo para administradores de plataforma (rol de sesión `admin` / `Admin`, ver `lib/roles.ts`), con sidebar propio y la pantalla **«Usuarios»** integrada con **`/api/admin/users`** (contrato en el anexo de este documento).

## Contexto en el código actual (referencia)

| Área | Estado hoy |
|------|------------|
| Portales existentes | Candidato (`/portal-candidato/*`), RRHH (`/portal-rrhh/*`). |
| Usuario y rol | `GET /api/auth/me` expone `id`, `name`, `email`, `role` (string o primer elemento de `roles` del backend). Ver `app/api/auth/me/route.ts`. |
| Sidebar RRHH | `components/rrhh/RRHHSidebar.tsx` — lista fija de `navItems` bajo `/portal-rrhh/...`. |
| Protección por ruta | `app/portal-admin/layout.tsx` llama a `requirePortalAdminUser()` (cookies + API session o `ats_user`). Sin `middleware.ts` global. |

## Alcance (frontend)

| # | Requisito |
|---|-----------|
| 1 | Nueva **área de rutas** bajo el prefijo `/portal-admin` (App Router: `app/portal-admin/...`). |
| 2 | Solo usuarios que cumplan **`isAdminRole`** (`lib/roles.ts`, comparación case-insensitive con `admin`) acceden al portal; el resto es redirigido a login o `/seleccion-portal`. |
| 3 | **Sidebar dedicado** al portal admin (patrón análogo a `RRHHSidebar`: aside + `nav` + bloque de usuario con `useCurrentUser`). |
| 4 | Ítem de menú **«Usuarios»** que navegue a la vista de gestión de usuarios (ruta canónica sugerida: `/portal-admin/usuarios`). |
| 5 | Vista **Usuarios**: listado paginado, filtros, crear usuario, modal de detalle (lockout, email confirmado, roles, envío de reset). Cliente: `lib/api/admin-users.ts` + `components/portal-admin/AdminUsuariosContent.tsx`. |

## Rutas propuestas

| Ruta | Propósito |
|------|-----------|
| `/portal-admin` | Landing del portal admin (redirección a `/portal-admin/usuarios` o página de bienvenida mínima; decidir en implementación). |
| `/portal-admin/usuarios` | Gestión de usuarios de la plataforma (contenido principal pendiente de API). |

**Convención de URL:** minúsculas y guiones, alineado con `portal-rrhh` y `portal-candidato`.

## Autorización (rol `admin`)

### Fuente de verdad del rol

- Cliente: `useCurrentUser()` → `user.role` (`hooks/useCurrentUser.ts`).
- Servidor: misma información vía cookie/sesión y/o reutilización de la lógica de `app/api/auth/me` o `fetchBackendSessionUser` (`lib/fetch-backend-session-user.ts`) en layouts o route handlers.

### Normalización

El backend puede enviar `role`, `type`, o `roles[]`. Hoy `/api/auth/me` colapsa a un único string `role`. Para el portal admin:

- **Criterio de acceso (layout):** `isAdminRole()` en `lib/roles.ts` — comparación **case-insensitive** con `"admin"` (cubre `Admin` de Identity en sesión).
- **API administración:** el backend exige rol **Admin** en Identity para `/api/admin/users` (403 si el token no es administrador). El layout del portal y el API deben alinearse (misma cuenta con rol Admin).

### Capas de defensa (recomendado)

1. **Servidor:** `layout.tsx` o verificación en servidor en `page.tsx` que compruebe sesión + rol antes de renderizar hijos; redirección si no es admin.
2. **Cliente:** ocultar enlaces al portal admin en otras UIs si no aplica; mostrar estado de carga/error en el shell del portal.
3. **API / BFF:** las llamadas a endpoints de administración deben usar token; el backend debe rechazar con 403 si el token no es de un admin (el frontend no sustituye esta validación).

## Sidebar (Portal Admin)

- **Componente nuevo** (nombre sugerido: `AdminSidebar` o `PortalAdminSidebar`) en `components/admin/` o `components/portal-admin/`, coherente con la estructura del repo.
- **Ítems iniciales:** al menos **Usuarios** → `/portal-admin/usuarios`. Prever `navItems` como array extensible (igual que `RRHHSidebar`).
- **Estado activo:** `usePathname()` con prefijo para subrutas futuras.
- **Bloque inferior:** avatar/iniciales + nombre + etiqueta de rol (`user.role`), reutilizando patrones de `RRHHSidebar` y `getInitials` si aplica.

## Vista «Usuarios» (implementado)

- **Ruta UI:** `/portal-admin/usuarios` — componente cliente `AdminUsuariosContent.tsx` (tabla, filtros, paginación, `Modal`, `Snackbar`, `apiClient`).
- **Filtros:** correo (contiene), rol (`Admin` \| `Recruiter` \| `Candidate`), solo bloqueados; botones Aplicar / Limpiar.
- **Acciones:** crear usuario (email, password opcional, roles iniciales); modal detalle con PATCH lockout / email confirmado, POST roles, DELETE rol, POST send-password-reset.
- **Errores:** mensajes vía `getApiErrorMessage`; 403 en listado muestra aviso explícito.

## Criterios de aceptación

1. Un usuario con `role` distinto de `admin` **no** puede usar el portal admin: al visitar `/portal-admin` o `/portal-admin/usuarios` es redirigido o ve un mensaje de no autorización coherente con el resto de la app.
2. Un usuario cuyo rol de sesión cumpla `isAdminRole` (p. ej. `Admin`) accede a `/portal-admin/usuarios` y ve el shell con sidebar.
3. El sidebar del portal admin muestra el enlace **«Usuarios»** y marca activa la ruta cuando corresponde.
4. Las llamadas al API usan el mismo `Bearer` que el resto del front; 401/403/429 muestran feedback acorde (`apiClient` redirige 401 a login tras refresh).

## Fuera de alcance (esta especificación)

- Diseño visual detallado (más allá de consistencia con portales existentes).
- Permisos granulares dentro de `admin` (solo rol binario admin / no admin).
- Internacionalización fuera del español ya usado en el producto.

## Checklist de implementación (dev)

- [x] Crear `app/portal-admin/layout.tsx` (y opcionalmente `app/portal-admin/page.tsx` con redirect).
- [x] Implementar verificación de rol `admin` en servidor (`lib/server-session-user.ts` + `lib/roles.ts`).
- [x] Crear sidebar del portal admin y página `/portal-admin/usuarios`.
- [x] Asegurar que enlaces al portal admin solo se muestran a admins (`/seleccion-portal`, `RRHHSidebar`).
- [x] Incorporar esquema de endpoints de usuarios: cliente API (`lib/api/admin-users.ts`), UI (`AdminUsuariosContent.tsx`). *(Tests E2E/unit opcionales, pendiente si el equipo los pide.)*
- [x] Actualizar `specs/spec.md` (tabla de rutas / portales) cuando el módulo exista en código.

## Anexo: API de administración de usuarios (`/api/admin/users`)

**Autenticación:** todas las rutas requieren usuario autenticado con rol **Admin** (Identity). Enviar **`Authorization: Bearer <access_token>`** (mismo mecanismo que el resto del front: cookie `ats_access_token` → `apiClient`).

**Base path (respecto de `NEXT_PUBLIC_API_URL`):** `/api/admin/users`

**Serialización:** JSON en **camelCase** (`email`, `roleNames`, etc.).

**Rate limiting:** política `admin-users` (límite alto/min). Posible **429**.

---

### `GET /api/admin/users`

Lista paginada.

**Query (opcional):**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | number | Por defecto `1`. |
| `pageSize` | number | Si es `0` u omite, el servidor usa default (típ. 20) y máximo (típ. 100). |
| `email` | string | Filtro por fragmento de correo (contiene, case-insensitive). |
| `role` | string | Solo usuarios con ese rol (nombre Identity, ej. `Recruiter`). |
| `lockedOnly` | boolean | `true` = solo cuentas con lockout activo. |

**200:** `{ items: [{ id, email, userName, emailConfirmed, lockoutActive, roles[] }], totalCount, page, pageSize }`

**401** sin token válido · **403** si no es Admin.

---

### `GET /api/admin/users/{id}`

**200:** `{ id, email, userName, emailConfirmed, lockoutEnabled, lockoutEnd, lockoutActive, roles[], createdAtUtc }` (`createdAtUtc` puede ser `null`).

**404** si no existe.

---

### `POST /api/admin/users`

Crea usuario.

**Body:**

```json
{
  "email": "usuario@empresa.com",
  "password": "opcional",
  "roleNames": ["Candidate"]
}
```

- `email` obligatorio (también actúa como `userName` interno).
- `password` opcional; vacío → backend genera clave y dispara flujo tipo “olvidé contraseña”.
- `roleNames` opcional; valores típicos **`Admin`**, **`Recruiter`**, **`Candidate`**. Rol inválido → **400** `{ message }`.

**201:** cuerpo = detalle (como GET por id). Cabecera **Location** al detalle.

**409** correo duplicado · **400** validación.

---

### `PATCH /api/admin/users/{id}`

Actualiza lockout y/o email confirmado. Al menos un campo; si ambos `null` → **400**.

```json
{
  "lockoutEnabled": true,
  "emailConfirmed": true
}
```

- `lockoutEnabled: true` bloquea; `false` desbloquea y resetea intentos.
- `emailConfirmed` actualiza flag en Identity.

**200** detalle actualizado · **404** inexistente.

---

### `POST /api/admin/users/{id}/roles`

**Body:** `{ "roleNames": ["Recruiter", "Candidate"] }`

**200** detalle con roles actualizados · **400** / **404** según caso.

---

### `DELETE /api/admin/users/{id}/roles/{roleName}`

Quita un rol (ej. `.../roles/Admin`). Codificar `roleName` en URL si hubiera caracteres especiales.

**200** detalle · **400** si no se puede (p. ej. último administrador) · **404** en algunos mapeos.

---

### `POST /api/admin/users/{id}/send-password-reset`

Equivale a recuperación de contraseña para ese email.

**200:** `{ "ok": true, "message": "..." }`

**404** / **400** / **429** según backend.

---

### Errores habituales

| Código | Uso |
|--------|-----|
| 401 | Token ausente o inválido. |
| 403 | Autenticado pero sin rol Admin en API. |
| 400 / 404 / 409 | Cuerpo `{ "message": "..." }` (a menudo en español). |
| 429 | Rate limit (admin-users o global). |

### Sesión del usuario logueado (UI)

Seguir usando **`GET /api/auth/session`** (o `/api/auth/me` del BFF) para mostrar admin actual; no requiere ser solo Admin.

### OpenAPI / Swagger

Documentación en Scalar/Swagger del backend cuando esté habilitado (`ENABLE_SWAGGER` o Development).
