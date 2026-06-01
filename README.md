# ATS App

ATS App es una aplicación web (SaaS) para gestionar procesos de reclutamiento tipo **ATS (Applicant Tracking System)**.
Incluye flujos de autenticación (Iniciar sesión / Crear cuenta) y servirá como base para módulos de vacantes,
candidatos, entrevistas, evaluaciones, comunicaciones y contratación.

## Stack
- **Next.js (App Router)**
- **React**
- **TailwindCSS**
- (El resto de módulos/servicios se irán integrando según avance el proyecto)

---

## Requisitos
- **Node.js** recomendado: **18+** (ideal 20+)
- **npm** (o tu gestor favorito: pnpm/yarn, si el repo ya lo usa)

> Tip: si ya existe un `.nvmrc`, usá esa versión de Node para evitar problemas.

---

## Clonar el proyecto
```bash
git clone <URL_DEL_REPO>
cd <NOMBRE_DEL_REPO>
````

---

## Instalar dependencias

Con **npm**:

```bash
npm install
```

Si el proyecto usa **pnpm**:

```bash
pnpm install
```

Si usa **yarn**:

```bash
yarn
```

---

## Variables de entorno

Si el proyecto requiere variables, creá el archivo:

```bash
cp .env.example .env.local
```

Luego completá los valores en `.env.local`.

> Si no existe `.env.example`, podés crear `.env.local` manualmente cuando sea necesario.

---

## Correr la app en local (modo desarrollo)

```bash
npm run dev
```

La app normalmente corre en:

* `http://localhost:3000`

---

## Build y ejecución en producción (local)

```bash
npm run build
npm run start
```

---

## Otros comandos útiles

Lint:

```bash
npm run lint
```

---

## Pruebas Automatizadas

El proyecto utiliza **Vitest** para pruebas unitarias / componentes y **Playwright** para E2E (flujos de usuario).

### 1. Configuración inicial (solo una vez)

```bash
npx playwright install chromium
```

### 2. Pruebas unitarias (Vitest)

```bash
npm run test
```

Modo watch: `npm run test:watch`

### 3. Pruebas E2E (Playwright)

Por defecto, `npm run test:e2e` **levanta el frontend** con `npm run dev` si no hay nada en el puerto (ver `playwright.config.ts`). Los tests de login y plantillas **requieren el API** configurado en `.env.local` (`NEXT_PUBLIC_API_URL`) y backend accesible.

| Comando | Descripción |
|--------|-------------|
| `npm run test:e2e` | Ejecuta todos los E2E (Chromium). |
| `npm run test:e2e:ui` | Interfaz interactiva de Playwright (ideal para QA). |
| `npm run test:e2e:headed` | Navegador visible. |
| `npm run test:e2e:report` | Abre el último reporte HTML. |

**Ya tenés el front en marcha** (por ejemplo `npm run dev` en otra terminal):

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e
```

**Otra URL base** (staging, etc.):

```bash
PLAYWRIGHT_BASE_URL=https://staging.ejemplo.com npm run test:e2e
```

#### Ciclo completo front + API + base de datos (monorepo con engine)

- **Windows:** `npm run test:e2e:full` (PowerShell, ver `tests/e2e/run-e2e-full.ps1`).
- **macOS / Linux:** `npm run test:e2e:full:unix` (bash, ver `tests/e2e/run-e2e-full.sh`).

Detalle de escenarios y prioridades: `TESTING_PLAN.md`.

---

## Notas

* Las pantallas de autenticación están implementadas **pixel-perfect** según `design.pen`,
  incluyendo variantes **desktop / tablet / mobile**.
* La marca visible en UI es **“ATS App”**.

---