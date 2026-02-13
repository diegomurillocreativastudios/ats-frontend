# Documentación API Backend – ATS Frontend

Base URL del backend (desde `.env.local`):

```env
API_URL=https://backend-7eop.onrender.com
```

**Importante:** Para usar la API desde el cliente (páginas con `'use client'`), define en `.env.local` también:

```env
NEXT_PUBLIC_API_URL=https://backend-7eop.onrender.com
```

Así podrás usar `process.env.NEXT_PUBLIC_API_URL` en el navegador. La variable `API_URL` sin prefijo solo está disponible en el servidor (API routes, Server Components, etc.).

---

## Cómo implementar las llamadas en la aplicación

### 1. Cliente HTTP reutilizable (recomendado)

Crea un módulo para no repetir la base URL y el manejo de errores:

**Archivo sugerido:** `lib/api.js` (o `lib/apiClient.js`)

```javascript
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';
};

export const apiClient = {
  async request(endpoint, options = {}) {
    const baseUrl = getBaseUrl().replace(/\/$/, '');
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw { status: res.status, ...data };
    }
    return data;
  },
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
```

Para enviar el token en rutas protegidas:

```javascript
// Ejemplo: incluir token en headers
const token = localStorage.getItem('token'); // o desde tu store de auth
apiClient.request('/api/me', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Endpoints típicos y cómo usarlos

A continuación se documentan endpoints habituales en un ATS. **Ajusta paths y cuerpos a los que expone tu backend** (por ejemplo en Swagger/OpenAPI en el navegador).

---

### Autenticación

#### Login (iniciar sesión)

| Método | Path típico   | Uso en la app        |
|--------|----------------|----------------------|
| `POST` | `/api/auth/login` o `/auth/login` | `app/auth/iniciar-sesion/page.jsx`, `app/iniciar-sesion/page.jsx` |

**Request (ejemplo):**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "tu_password"
}
```

**Response esperada (ejemplo):**

```json
{
  "token": "eyJhbG...",
  "user": { "id": 1, "email": "usuario@ejemplo.com", "name": "..." },
  "refreshToken": "..."
}
```

**Implementación en la página de login:**

```javascript
// En handleSubmit de la página de iniciar sesión
const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage(null);
  if (!validateForm()) return;
  setLoading(true);
  try {
    const data = await apiClient.post('/api/auth/login', {
      email: formData.email,
      password: formData.password,
    });
    // Guardar token y redirigir
    if (typeof window !== 'undefined' && data.token) {
      localStorage.setItem('token', data.token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    }
    setMessage({ type: 'success', text: 'Sesión iniciada correctamente' });
    // router.push('/dashboard') o la ruta que corresponda
  } catch (err) {
    const message = err.message || err.detail || 'Credenciales inválidas. Verifica tu email y contraseña.';
    setMessage({ type: 'error', text: message });
  } finally {
    setLoading(false);
  }
};
```

---

#### Registro (crear cuenta)

| Método | Path típico        | Uso en la app                          |
|--------|--------------------|----------------------------------------|
| `POST` | `/api/auth/register` o `/auth/register` | `app/crear-cuenta/page.jsx`, `app/auth/registrate/page.jsx` |

**Request (ejemplo):**

```json
{
  "email": "nuevo@ejemplo.com",
  "password": "password_seguro",
  "name": "Nombre",
  "lastName": "Apellido"
}
```

Si tu backend pide más campos (teléfono, aceptar términos, etc.), añádelos al body.

**Response esperada (ejemplo):**

```json
{
  "id": 123,
  "email": "nuevo@ejemplo.com",
  "message": "Usuario registrado correctamente"
}
```

**Implementación en Crear Cuenta:**

```javascript
// En handleSubmit de crear-cuenta/page.jsx (o auth/registrate)
const handleSubmit = async (e) => {
  e.preventDefault();
  if (formData.password !== formData.confirmPassword) {
    setErrors((prev) => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }));
    return;
  }
  if (!formData.acceptTerms) {
    setErrors((prev) => ({ ...prev, acceptTerms: 'Debes aceptar los términos' }));
    return;
  }
  setLoading(true);
  try {
    await apiClient.post('/api/auth/register', {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      lastName: formData.lastName,
      // Incluir los campos que tu API requiera
    });
    setMessage({ type: 'success', text: 'Cuenta creada. Ya puedes iniciar sesión.' });
    // router.push('/iniciar-sesion');
  } catch (err) {
    const message = err.message || err.detail || 'Error al crear la cuenta. Intenta de nuevo.';
    setMessage({ type: 'error', text: message });
  } finally {
    setLoading(false);
  }
};
```

---

#### Refresh token (renovar sesión)

| Método | Path típico            | Uso en la app                    |
|--------|------------------------|----------------------------------|
| `POST` | `/api/auth/refresh`    | Interceptor o hook de auth       |

**Request (ejemplo):**

```json
{ "refreshToken": "..." }
```

**Implementación:** llamar desde un middleware o hook cuando `401` indique token expirado y tengas `refreshToken`; luego guardar el nuevo `token` y reintentar la petición.

---

#### Recuperar contraseña / Forgot password

| Método | Path típico              | Uso en la app                |
|--------|--------------------------|------------------------------|
| `POST` | `/api/auth/forgot-password` | Página “¿Olvidaste tu contraseña?” |

**Request (ejemplo):**

```json
{ "email": "usuario@ejemplo.com" }
```

**Implementación:** en la página de “olvidé contraseña”, enviar el email y mostrar mensaje de éxito o error según la respuesta del backend.

---

### Usuario

#### Perfil del usuario autenticado

| Método | Path típico | Uso en la app     |
|--------|-------------|-------------------|
| `GET`  | `/api/me` o `/api/user/me` | Layout, dashboard, navbar |

**Headers:** `Authorization: Bearer <token>`

**Implementación:** al cargar la app o el layout, llamar a este endpoint para obtener el usuario actual y mostrarlo o redirigir si no hay sesión.

---

#### Actualizar perfil

| Método | Path típico       | Uso en la app   |
|--------|-------------------|-----------------|
| `PUT` o `PATCH` | `/api/me` o `/api/user/me` | Página de perfil / configuración |

**Request:** body con los campos editables (nombre, teléfono, etc.).

---

### Ofertas / Vacantes (Jobs)

| Método | Path típico     | Descripción          |
|--------|-----------------|----------------------|
| `GET`  | `/api/jobs`     | Listar ofertas       |
| `GET`  | `/api/jobs/:id` | Detalle de una oferta |
| `POST` | `/api/jobs`     | Crear oferta (admin/reclutador) |
| `PUT`/`PATCH` | `/api/jobs/:id` | Actualizar oferta |
| `DELETE` | `/api/jobs/:id` | Eliminar oferta   |

**Implementación (listar):** en la página de listado de vacantes, `apiClient.get('/api/jobs')` y mapear la respuesta a tu estado/UI. Para detalle, `apiClient.get(\`/api/jobs/${id}\`)`.

---

### Candidatos / Postulaciones

| Método | Path típico           | Descripción              |
|--------|------------------------|--------------------------|
| `GET`  | `/api/candidates`     | Listar candidatos        |
| `GET`  | `/api/candidates/:id`  | Detalle candidato        |
| `POST` | `/api/candidates` o `/api/applications` | Postularse o registrar candidato |
| `PATCH`| `/api/candidates/:id`  | Cambiar estado (ej. etapas) |

Ajusta paths si tu backend usa `applications`, `applicants`, etc.

---

### Otros endpoints posibles

- **Health:** `GET /health` o `GET /` — para comprobar que el backend responde.
- **Documentos/CVs:** `POST /api/candidates/:id/documents` — subida de archivos (usar `FormData` en lugar de JSON).
- **Estadísticas/Dashboard:** `GET /api/dashboard/stats` — métricas para el panel.

---

## Resumen de integración por página

| Página / flujo           | Endpoint(s) a usar                    | Acción principal                          |
|--------------------------|----------------------------------------|-------------------------------------------|
| Iniciar sesión           | `POST /api/auth/login`                | Enviar email/password, guardar token, redirigir |
| Crear cuenta / Regístrate | `POST /api/auth/register`            | Enviar datos del formulario, mostrar éxito/error |
| Olvidé contraseña        | `POST /api/auth/forgot-password`       | Enviar email                              |
| Layout / App             | `GET /api/me`                         | Obtener usuario actual, proteger rutas    |
| Listado vacantes         | `GET /api/jobs`                       | Listar ofertas                            |
| Detalle vacante          | `GET /api/jobs/:id`                   | Mostrar una oferta                        |
| Postularse               | `POST /api/candidates` o `/applications` | Enviar datos y/o CV                    |

---

## Cómo completar esta documentación con tu backend real

1. Abre en el navegador la URL del backend (la de tu `.env.local`).
2. Si ves Swagger/OpenAPI (por ejemplo en `/docs`, `/swagger`, `/api-docs`), copia la lista de endpoints, métodos y cuerpos de request/response.
3. Sustituye en este documento los paths de ejemplo (`/api/auth/login`, `/api/jobs`, etc.) por los que use tu API.
4. Ajusta los ejemplos de `apiClient.post('/api/...')` con los paths y campos reales.

Si compartes la URL exacta de la documentación (o un pantallazo de los endpoints), se puede adaptar este mismo documento con los paths y ejemplos definitivos.
