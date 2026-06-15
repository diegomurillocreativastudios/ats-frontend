# Alcance de Internacionalización (i18n) del Frontend

> **Etapa 0 — Auditoría y definición de alcance.**
> Este documento **no implementa** `next-intl`, **no migra** componentes ni **modifica** comportamiento funcional.
> Su único objetivo es **auditar, definir y documentar** el alcance de internacionalización del frontend para las próximas etapas.

---

## 1. Propósito de la feature

La plataforma ATS está actualmente desarrollada **100% en español** (UI estática). Será presentada a la **Unión Europea**, por lo que se requiere soportar múltiples idiomas en la **interfaz de usuario**.

El objetivo de la feature completa (a ejecutarse en etapas posteriores) es permitir que el usuario **cambie el idioma de la interfaz** sin alterar en absoluto la información de negocio, los datos dinámicos ni el contenido generado por IA.

Esta feature es **exclusivamente de frontend**. No incluye cambios de backend, base de datos, APIs ni en el pipeline de IA (Vertex AI).

---

## 2. Idiomas soportados

| Código | Idioma   | Rol                      |
| ------ | -------- | ------------------------ |
| `es`   | Español  | **Idioma por defecto**   |
| `en`   | Inglés   | Soportado                |
| `it`   | Italiano | Soportado                |
| `de`   | Alemán   | Soportado                |
| `fr`   | Francés  | Soportado                |

### Idioma default

- **`es` (Español)** es el idioma por defecto.
- Si no hay preferencia de idioma detectada/seleccionada, la plataforma debe mostrarse en español.
- El idioma default también actúa como **fallback**: si una clave de traducción falta en otro idioma, se debe usar el texto en español.

---

## 3. Alcance incluido (traducible)

Se traduce únicamente la **UI y la data estática/controlada por el frontend**, es decir, texto que vive en el código del frontend y no proviene de la base de datos ni de la IA:

- **Layout global** y metadata de UI (`app/layout.tsx`, títulos de documento en `lib/pageTitles.ts`).
- **Sidebars / navegación**: `RRHHSidebar`, `CandidateSidebar`, `AdminSidebar`, navbar pública (`PublicOpportunitiesNavbar`).
- **Topbars y menú de usuario**: `RRHHTopbar`, `CandidateTopbar`, `AdminTopbar` (etiquetas como "Cerrar sesión", "Mi perfil", roles por defecto como "Administrador", "Usuario").
- **Login / Auth**: pantallas de `app/auth/*`, `components/auth/*` (labels, placeholders, botones, mensajes).
- **Dashboards**: `RRHHDashboardStats`, tarjetas de actividad/candidatos, `candidate-portal-home`, KPIs (etiquetas, no valores dinámicos).
- **Vacantes**: filtros, encabezados de listado, estados de UI, banners (`VacancyListFilters`, `VacancyReadOnlyBanner`, `VacancyListCard`, modales de vacante).
- **Candidatos**: encabezados de secciones de perfil, etiquetas de campos (`CandidateProfileSections`, navegación de secciones de perfil).
- **Detalle de candidato**: **etiquetas y títulos** de secciones (p. ej. "Entrevista", "Fortalezas", "Aspectos a considerar", "Comentarios").
- **Pantallas de resultados IA**: **solo los títulos/etiquetas** de las secciones (p. ej. "Análisis IA", "Razones positivas", "Razones negativas", "Recomendación", "Asistido por IA"). **El contenido generado por IA queda excluido — ver sección 5.**
- **Formularios**: labels, placeholders, textos de ayuda, opciones estáticas de selects controladas por el frontend (`lib/profile-form-options.ts`).
- **Validaciones de frontend**: mensajes de error de validación generados en cliente ("Campo requerido", "Email no válido", límites de caracteres, etc.).
- **Modales**: `Modal`, `DeleteConfirmModal`, `EstadosModal`, `EtapaModal`, `PlantillaModal`, `NuevaVacanteModal`, `FinishVacancyProcessModal`, `ApplyEmailConfirmationModal`, `ApplyPrivacyNoticeDialog`, etc.
- **Toasts / Snackbars**: `components/common/toast.tsx`, `Snackbar`, `candidate-portal-snackbar` (los **mensajes estáticos** del frontend; no los mensajes de error que devuelve el backend literalmente).
- **Empty states**: textos de "Sin datos", "No hay candidatos", "Sin resultados", etc.
- **Tablas**: encabezados de columna, paginación, filtros, acciones.
- **Botones**: `components/ui/Button.tsx`, `components/auth/Button.tsx` y todos los CTAs estáticos.
- **Tooltips / aria-labels**: textos de accesibilidad estáticos (`aria-label`, `title`, `sr-only`).
- **Settings / Admin**: `portal-admin/*` (usuarios, empresas, catálogos, departamentos, modalidades, tipos de documento, plantillas, configuración).
- **Stepper / progreso de IA (labels de UI)**: etiquetas de pasos en `lib/ai-ingest-progress-status.ts` y `lib/vacancy-preliminary-match-progress-status.ts` (son texto de UI fijo, no salida de IA).

### Ejemplos de contenido **traducible**

| Español (actual)        | Inglés (`en`)        |
| ----------------------- | -------------------- |
| `Análisis IA`           | `AI Analysis`        |
| `Razones positivas`     | `Positive Reasons`   |
| `Razones negativas`     | `Negative Reasons`   |
| `Recomendación`         | `Recommendation`     |
| `Fortalezas`            | `Strengths`          |
| `Aspectos a considerar` | `Considerations`     |
| `Candidatos`            | `Candidates`         |
| `Vacantes`              | `Vacancies`          |
| `Entrevistas`           | `Interviews`         |
| `Reportes`              | `Reports`            |
| `Cerrar sesión`         | `Sign out`           |
| `Campo requerido`       | `Required field`     |
| `Asistido por IA`       | `AI-assisted`        |

---

## 4. Alcance excluido (NO traducible)

No se traduce, transforma, reprocesa ni altera **ningún dato dinámico ni de negocio**. En particular:

- **Contenido generado por IA** (ver sección 5 — regla crítica).
- **Texto extraído de archivos subidos** (CV/documentos parseados por la IA).
- **Contenido ingresado por usuarios** (nombres, comentarios, descripciones, notas, datos de perfil escritos por el usuario).
- **Información dinámica de base de datos** (nombres de vacantes, descripciones de empresas, nombres de candidatos, valores de catálogos creados por usuarios, plantillas creadas por usuarios, etc.).
- **Nombres propios** (personas, empresas, ciudades, países como valor de dato).
- **Tecnologías y marcas**: React, Next.js, TypeScript, PostgreSQL, Docker, AWS, Vertex AI, .NET, etc.
- **Valores numéricos / métricas dinámicas**: scores de match, KPIs calculados, montos salariales (la *etiqueta* sí se traduce; el *valor* no).
- **Mensajes de error provenientes del backend** que llegan como string literal en la respuesta de la API (se muestran tal cual; ver "Consideraciones").
- **Códigos/identificadores**: UUIDs, slugs, claves técnicas.

> **Nota sobre formato vs. traducción:** fechas, números y monedas **no se traducen**, pero en etapas futuras *podrían* formatearse según el locale (p. ej. `1.234,56 €` vs `1,234.56`). Esto es **formato/localización**, distinto de traducción de contenido, y se decidirá explícitamente en una etapa posterior. **No** forma parte del alcance de la traducción de texto generado por IA.

### Ejemplos de contenido **NO traducible**

Resúmenes, razones y recomendaciones generadas por IA se mantienen **exactamente como fueron recibidas**, sin importar el idioma de la interfaz:

```txt
El candidato tiene experiencia sólida en React y Next.js.
```

Aunque la interfaz esté en inglés, el contenido anterior **no** debe convertirse en
`The candidate has solid experience in React and Next.js.` — se muestra tal cual fue generado por la IA.

Otros ejemplos que se muestran sin alterar:

```txt
Juan Pérez                      (nombre propio del candidato)
Acme Corp S.A. de C.V.          (nombre de empresa / dato de BD)
PostgreSQL, Docker, AWS         (tecnologías)
"Tengo 5 años liderando equipos" (texto ingresado por el usuario)
```

---

## 5. Regla crítica: contenido generado por IA NO se traduce

> **El selector de idioma NO debe traducir, transformar, reprocesar ni alterar la data generada por IA.**

El cambio de idioma afecta **únicamente** las etiquetas/títulos de UI que envuelven al contenido. El **payload de IA** se renderiza siempre verbatim.

Esto incluye explícitamente:

- Resultados generados por IA.
- Resúmenes generados por **Vertex AI**.
- Razones positivas generadas por IA (`qualitativeReasoningPositive` / `qualitative_reasoning_positive`).
- Razones negativas generadas por IA (`qualitativeReasoningNegative` / `qualitative_reasoning_negative`).
- Recomendaciones generadas por IA.
- Texto extraído de archivos subidos.
- Contenido ingresado por usuarios e información dinámica de base de datos.
- Nombres propios y tecnologías.

### Patrón canónico (etiqueta traducible + contenido verbatim)

Ejemplo real ya presente en `components/rrhh/vacancy-resultados/vacancy-resultados-candidates-block.tsx`:

```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
  Fortalezas            {/* ← TRADUCIBLE (etiqueta de UI) */}
</p>
<p className="mt-1 whitespace-pre-wrap leading-relaxed">
  {detail.match.qualitativeReasoningPositive}  {/* ← NO TRADUCIBLE (IA verbatim) */}
</p>
```

**Regla práctica para etapas futuras:** todo string *literal en JSX/TS del frontend* es candidato a traducción; todo valor que provenga de `props`, estado cargado por fetch, respuesta de API o base de datos **no** se traduce.

---

## 6. Módulos frontend identificados para futuras etapas

Inventario de alto nivel (Next.js App Router, ~70 rutas `page`/`layout`, ~208 archivos `.ts`/`.tsx` en `app/` + `components/`). No se ha encontrado ninguna librería i18n instalada (`next-intl`, `react-intl`, `formatjs`): el proyecto parte de cero en i18n.

### 6.1 Portales / áreas

| Módulo                 | Ruta base                  | Tipo de usuario        | Prioridad sugerida |
| ---------------------- | -------------------------- | ---------------------- | ------------------ |
| Autenticación          | `app/auth/*`               | Público / todos        | Alta               |
| Recuperar/restablecer  | `app/recuperar-contrasena`, `app/restablecer-contrasena` | Público | Alta |
| Selección de portal    | `app/seleccion-portal`     | Autenticado            | Alta               |
| Mi perfil (cuenta)     | `app/mi-perfil`            | Autenticado            | Media              |
| Portal RRHH            | `app/portal-rrhh/*`        | Reclutador / RRHH      | Alta               |
| Portal Candidato       | `app/portal-candidato/*`   | Candidato              | Alta               |
| Portal Admin           | `app/portal-admin/*`       | Administrador          | Media              |
| Oportunidades (público)| `app/portal-oportunidades/*` | Público (aplicantes) | Alta               |

### 6.2 Submódulos clave por portal

- **Portal RRHH**: `candidatos`, `vacantes` (+ `resultados`, `technical-sheet`), `entrevistas` / `interviews`, `etapas`, `plantillas`, `reportes` (múltiples sub-reportes), `configuracion` (+ `calendario`).
- **Portal Candidato**: home, `documentos`, `entrevistas`, perfil propio.
- **Portal Admin**: `usuarios`, `empresas`, `catalogos`, `departamentos`, `modalidades`, `tipos-de-documento`, `etapas`, `plantillas`, `entrevistas`, `configuracion`.
- **Oportunidades público**: listado de vacantes, detalle de vacante, flujo de aplicación (`aplicar`), navbar pública, tips, diálogos de privacidad/confirmación.

### 6.3 Componentes transversales (UI compartida)

- Navegación: `RRHHSidebar`, `CandidateSidebar`, `AdminSidebar`, `*Topbar`, `PublicOpportunitiesNavbar`.
- Primitivos UI: `components/ui/*` (`Button`, `Input`, `Modal`, `Snackbar`, `StarRating`, `date-picker`, `PortalPageHeader`), `components/auth/*`, `components/common/*` (`toast`, `loading-spinner`, `download-pdf-button`).
- Disclosure IA: `components/rrhh/AiDisclosure.tsx` (badges/labels de UI traducibles; el contenido IA no).
- Modales de negocio: `DeleteConfirmModal`, `EstadosModal`, `EtapaModal`, `PlantillaModal`, `NuevaVacanteModal`, `FinishVacancyProcessModal`, etc.

### 6.4 Helpers/strings centralizables ya existentes (puntos de migración)

- `lib/pageTitles.ts` — títulos de documento por ruta (centraliza muchas etiquetas; buen primer candidato a i18n).
- `lib/candidate-portal-translations.ts` — ya mapea **códigos de estado del backend → etiquetas en español**. Patrón a generalizar para multi-idioma (mapas por locale), no para traducir contenido libre de IA.
- `lib/ai-ingest-progress-status.ts`, `lib/vacancy-preliminary-match-progress-status.ts`, `lib/ai-ingest-progress-status` — labels de pasos de progreso (UI estática traducible).
- `lib/profile-form-options.ts`, `lib/social-link-presets.ts`, `lib/application-source.ts` — opciones estáticas de formularios.
- `lib/messages/*` — plantillas de texto (revisar caso por caso: las plantillas de reporte/hoja técnica pueden contener contenido de negocio).

> **Fuera del alcance de UI i18n**: rutas API (`app/api/*`), generación de PDF (`lib/pdf/*`, `lib/technical-sheet/*`, `lib/reportes/*` en su lógica de datos), y cualquier salida que renderice contenido de BD/IA. Sus **etiquetas estáticas** podrían traducirse en una etapa posterior dedicada, pero **no** en la migración inicial de UI.

---

## 7. Riesgos y consideraciones

1. **Contaminación IA ↔ UI (riesgo principal).** El mayor riesgo es traducir accidentalmente contenido generado por IA o de BD. Mitigación: regla estricta "solo strings literales del frontend se traducen" + revisión de cada componente con contenido mixto (etiqueta + payload).
2. **Mensajes de error del backend.** Hoy se muestran literalmente (vía `getApiErrorMessage`). Decidir en etapa futura si se mapean a claves de traducción por **código** de error o se muestran tal cual. No traducir el string crudo en cliente.
3. **`lib/candidate-portal-translations.ts` ya hardcodea español.** Debe generalizarse a estructura por locale; cuidado con la función `getApplicationStatusStyle` que hace matching por substring en español/inglés (su lógica de estilo no debe romperse al introducir más idiomas).
4. **`<html lang="en">` está fijo en `app/layout.tsx`** mientras la UI está en español. Inconsistencia actual que la implementación deberá corregir (lang dinámico según locale).
5. **Estrategia de ruteo de locale.** Decidir entre prefijo de ruta (`/[locale]/...`), cookie/header, o detección por `Accept-Language`. Impacta `proxy.ts`, `pageTitles.ts` y todos los `Link`/`usePathname`. Requiere decisión arquitectónica antes de migrar.
6. **Pluralización, género y formato regional.** EN/IT/DE/FR tienen reglas de plural y formato numérico/fecha distintos; usar las utilidades de `next-intl`/ICU desde el inicio para evitar refactors.
7. **PDFs y reportes generados.** Contienen mezcla de etiquetas estáticas y datos. Quedan fuera de la migración inicial de UI; tratar en etapa separada.
8. **Volumen de strings.** ~208 archivos; la extracción será incremental por módulo. Riesgo de claves duplicadas/inconsistentes → definir convención de naming de claves temprano.
9. **Tests E2E (Playwright) acoplados a texto en español.** Cambiar idioma o claves puede romper selectores basados en texto; preferir `getByRole`/`getByTestId` y fijar el locale de test.
10. **Accesibilidad.** `aria-label`, `title` y `sr-only` también deben traducirse para mantener la a11y en todos los idiomas.

---

## 8. Recomendación inicial de estructura para futuras traducciones

> Recomendación, **no implementación**. Sujeta a validación en la etapa de diseño técnico.

### 8.1 Librería

- **`next-intl`** (alineado con Next.js 16 App Router + React Server Components). Soporta mensajes ICU (plural/género), formato de fecha/número por locale y carga de mensajes en RSC.

### 8.2 Estructura de archivos sugerida

```txt
/messages
  es.json        # idioma default + fallback
  en.json
  it.json
  de.json
  fr.json
/i18n
  routing.ts     # locales soportados, defaultLocale = "es"
  request.ts     # carga de mensajes por request
```

### 8.3 Convención de claves (namespacing por módulo)

```json
{
  "common": { "save": "Guardar", "cancel": "Cancelar", "signOut": "Cerrar sesión" },
  "nav": { "candidates": "Candidatos", "vacancies": "Vacantes", "interviews": "Entrevistas" },
  "ai": {
    "analysisTitle": "Análisis IA",
    "positiveReasons": "Razones positivas",
    "negativeReasons": "Razones negativas",
    "recommendation": "Recomendación",
    "assistedBadge": "Asistido por IA"
  },
  "validation": { "required": "Campo requerido", "invalidEmail": "Email no válido" }
}
```

Principios:
- Claves en `camelCase`, agrupadas por **módulo/dominio** (`nav.*`, `ai.*`, `auth.*`, `vacancies.*`, ...).
- `es.json` es la **fuente de verdad** y el fallback.
- **Nunca** colocar contenido de IA, de BD ni de usuario dentro de los archivos de mensajes.

### 8.4 Patrón de migración por componente

1. Identificar strings literales del frontend (excluir props/fetch/IA).
2. Extraer a la clave de su namespace.
3. Reemplazar el literal por `t('namespace.key')`.
4. Dejar el contenido dinámico/IA **intacto**.

---

## 9. Checklist para las siguientes etapas

### Etapa 1 — Setup base de i18n (sin migrar UI)
- [ ] Instalar y configurar `next-intl`.
- [ ] Definir `locales = [es, en, it, de, fr]` y `defaultLocale = "es"`.
- [ ] Decidir y documentar estrategia de ruteo de locale (prefijo vs. cookie/header).
- [ ] Crear `/messages/{es,en,it,de,fr}.json` (inicialmente solo `es` poblado, resto fallback).
- [ ] Hacer dinámico `<html lang>` según el locale activo.
- [ ] Asegurar que el build/typecheck/lint siguen verdes.

### Etapa 2 — Componentes transversales
- [ ] Migrar navegación (sidebars, topbars, navbar pública, menú de usuario).
- [ ] Migrar primitivos UI (`Button`, `Modal`, `Snackbar`, `Toast`, empty states).
- [ ] Migrar `lib/pageTitles.ts` a claves i18n.

### Etapa 3 — Auth y portales públicos
- [ ] Migrar `app/auth/*`, recuperar/restablecer contraseña.
- [ ] Migrar `portal-oportunidades/*` (listado, detalle, flujo de aplicación).

### Etapa 4 — Portales internos
- [ ] Migrar Portal RRHH (candidatos, vacantes, resultados, entrevistas, reportes, configuración).
- [ ] Migrar Portal Candidato (home, documentos, entrevistas, perfil).
- [ ] Migrar Portal Admin (todas las secciones de catálogos/usuarios/empresas).

### Etapa 5 — Validaciones, formato y QA
- [ ] Migrar mensajes de validación de frontend.
- [ ] Definir política de formato de fecha/número/moneda por locale (separado de traducción).
- [ ] Definir política para mensajes de error del backend (mapeo por código vs. literal).
- [ ] Actualizar tests E2E para usar `getByRole`/`getByTestId` y fijar locale.
- [ ] Completar traducciones reales de `en`, `it`, `de`, `fr`.

### Regla transversal a TODAS las etapas
- [ ] **Verificar que NINGÚN contenido generado por IA, de BD o de usuario sea traducido.** El cambio de idioma solo afecta etiquetas/títulos de UI.

---

## 10. Estado de esta etapa (Etapa 0)

- ✅ Auditada la estructura del frontend (App Router, portales, componentes, helpers de texto).
- ✅ Identificados los lugares con texto estático en español por módulo.
- ✅ Separado claramente contenido **traducible** (UI/estático) vs. **no traducible** (IA/BD/usuario).
- ✅ Documentada de forma explícita la regla de que la data generada por IA **no se traduce**.
- ✅ Identificados los módulos a migrar en próximas etapas.
- 🚫 **No** se implementó `next-intl`.
- 🚫 **No** se modificaron componentes funcionales ni el comportamiento del sistema.
- 🚫 **No** se modificaron APIs ni el pipeline de Vertex AI.
