# Especificación (Frontend): Ficha técnica del candidato

## Referencia base

Este documento depende del contrato y comportamiento definidos en el backend como parte **canónica**:

- **`specs/spec-ficha-tecnica-candidato-backend.md`** (repo backend)

No duplica el mapeo de entidades; describe **experiencia de usuario**, **integración con la API** y **criterios de aceptación** del lado cliente.

---

## Alineación con el backend (estado actual)

- **`GET .../technical-sheet`** → JSON usable por la preview. En backend puede exponer solo el **subconjunto de candidato** (equivalente a lo necesario para `TechnicalSheetCandidateDto`), no necesariamente el mismo agregado que **`technical-sheet.html`**. La preview del ATS está pensada para renderizar principalmente **datos del candidato** normalizados en ese payload.
- **`GET .../technical-sheet.pdf`** → Hoy puede responder **`501 Not Implemented`** con cuerpo JSON cuando la ficha existe pero el PDF binario no está generado; **`404`** si no hay ficha (mismo criterio que JSON/HTML). El cliente debe tolerar **`501`** y seguir ofreciendo descarga.
- **PDF binario**: cuando backend devuelva **`200`** + **`application/pdf`**, el cuerpo debe empezar por la firma **`%PDF`**. El frontend rechaza respuestas `200` que no sean PDF válido y cae al fallback.

---

## Paridad PDF ↔ JSON ↔ HTML (decisión de negocio)

Backend puede armar HTML desde un **`TechnicalSheetDto`** completo y JSON desde un subset de candidato. **Negocio debe aclarar** si el PDF generado en servidor debe:

- coincidir con el **subset** que consume la preview (coherencia con lo que ve el recruiter en pantalla), o
- coincidir con el **agregado** del HTML u otro informe.

Hasta que exista PDF en servidor, el frontend puede generar PDF **desde el DOM de la preview** (misma información que el JSON ya cargado).

---

## Objetivos (MVP) — frontend

1. Permitir al recruiter **ver** la ficha técnica en contexto **vacante + candidato**.
2. Permitir **descargar PDF**: primero intento **`GET .../technical-sheet.pdf`** autenticado; si no hay PDF válido (**501**, **404**, error o cuerpo sin `%PDF`), **generación en cliente** a partir de la vista previa ya renderizada.
3. Mostrar estados de **carga** y **error** claros (especialmente **404** cuando no hay postulación).

---

## No objetivos (MVP) — frontend

- Editor de plantillas o personalización por empresa.
- Vista del candidato sin vacante seleccionada (la ficha está definida como **par** vacante–candidato).
- Botón de descarga HTML expuesto en UI (el contrato HTML puede seguir existiendo en backend para otros usos).

---

## Endpoints a consumir

Definidos en detalle en el spec backend (prefijo `api/recruiter`, roles Recruiter/Admin):

| Uso | Método y ruta |
|-----|----------------|
| Preview en pantalla | `GET .../technical-sheet` → JSON |
| Descarga PDF (servidor) | `GET .../technical-sheet.pdf` → `200` + PDF, o `501` / `404` según backend |
| Descarga HTML (opcional backend) | `GET .../technical-sheet.html` (p. ej. `?download=1`) — no expuesto en la UI actual |

Parámetros de ruta: `vacancyId`, `candidateProfileId`.

Implementación de rutas en cliente: `lib/api/technical-sheet.ts` (`buildTechnicalSheetBasePath`, `fetchTechnicalSheetJson`, `tryDownloadTechnicalSheetPdf`).

---

## Dónde ubicar la funcionalidad (UX)

1. **Detalle de candidato en el contexto de una vacante** — acción **“Ver ficha técnica”** y pie con **“Descargar PDF”**.
2. **Lista / tabla de aplicantes de una vacante** — misma experiencia en modal o página dedicada.
3. **Ruta dedicada** en app (p. ej. `/portal-rrhh/vacantes/[id]/candidatos/[candidateProfileId]/technical-sheet`) que reutiliza el mismo panel.

---

## Flujos recomendados

### Preview

1. `GET .../technical-sheet` → JSON.
2. Render con componentes propios (`TechnicalSheetPreview` y mensajes en `lib/messages/technical-sheet.ts`).

### Descarga PDF

1. `fetch` autenticado (Bearer, mismo patrón que otras descargas binarias) a `.../technical-sheet.pdf`.
2. Si **`200`** y blob válido (`%PDF`): descarga con nombre tipo `ficha-{vacancySlug}-{candidateProfileId}.pdf`.
3. Si **`501`**, **`404`** u otro fallo / cuerpo inválido: **exportar PDF desde el nodo DOM** de la preview (`html2canvas` + `jspdf`), código en `lib/technical-sheet/export-technical-sheet-pdf.ts`, orquestado desde `TechnicalSheetPanel`.

---

## Estados de interfaz

| Estado | Comportamiento |
|--------|----------------|
| Loading | Spinner en modal/página; deshabilitar doble submit (`aria-busy` donde aplique). |
| Éxito JSON | Render de la ficha; botón PDF habilitado cuando hay payload. |
| **404** (JSON o PDF) | Mensaje explícito de postulación inexistente / sin datos de ficha. |
| **401/403** | Mismo patrón global de sesión y permisos. |
| PDF en curso | Spinner en el botón hasta servidor o export cliente termine. |

---

## Internacionalización

- Textos de la ficha en pantalla deben seguir las claves de `technical-sheet` (o i18n global cuando exista).
- PDF generado en cliente refleja la UI actual (idioma ya renderizado).

---

## Evolución (frontend)

- Botón **“Enviar por correo”** cuando exista API de notificaciones.
- Vista comparativa entre dos candidatos en la misma vacante.
- Retirar fallback cliente cuando el PDF servidor sea estable y equivalente al alcance acordado por negocio.

---

## Checklist — frontend

- [x] Entrada “Ficha técnica” en contexto vacante–candidato (modal / página).
- [x] Integración `GET` JSON + preview (`TechnicalSheetPreview`).
- [x] Descarga PDF: intento servidor + fallback cliente + validación `%PDF`.
- [x] Estados loading / error / permisos / 404.
- [x] Mensajes centralizados (`lib/messages/technical-sheet.ts`).
- [x] Accesibilidad básica: foco en modal, `aria-busy` en panel cuando aplica.
