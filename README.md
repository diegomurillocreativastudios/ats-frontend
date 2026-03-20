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

El proyecto utiliza **Vitest** para pruebas unitarias y **Playwright** para pruebas de integración/E2E.

### 1. Configuración inicial (Solo una vez)
Después de instalar las dependencias, debés instalar los binarios de los navegadores para Playwright:
```bash
npx playwright install chromium
```

### 2. Ejecutar Pruebas Unitarias (Vitest)
```bash
npm run test
```

### 3. Ejecutar Pruebas E2E (Playwright)

#### **Opción A: Ciclo Completo (RECOMENDADO)**
Este comando automatiza todo: limpia la base de datos de pruebas, levanta el backend, el frontend, corre los tests y apaga todo al finalizar.
```bash
npm run test:e2e:full
```

#### **Opción B: Manual**
**Requisito**: Tanto el backend (`dotnet run`) como el frontend (`npm run dev`) deben estar corriendo en terminales separadas.
```bash
npm run test:e2e
```

Para abrir el reporte visual después de una falla:
```bash
npx playwright show-report
```

---

## Notas

* Las pantallas de autenticación están implementadas **pixel-perfect** según `design.pen`,
  incluyendo variantes **desktop / tablet / mobile**.
* La marca visible en UI es **“ATS App”**.

---