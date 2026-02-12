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

## Notas

* Las pantallas de autenticación están implementadas **pixel-perfect** según `design.pen`,
  incluyendo variantes **desktop / tablet / mobile**.
* La marca visible en UI es **“ATS App”**.

---