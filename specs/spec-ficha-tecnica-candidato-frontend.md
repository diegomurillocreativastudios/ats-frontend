# Especificación (Frontend): Ficha técnica del candidato

## Referencia base

Este documento depende del contrato y comportamiento definidos en:

- **`spec-ficha-tecnica-candidato-backend.md`**

No duplica el mapeo de entidades; solo describe **experiencia de usuario**, **integración con la API** y **criterios de aceptación** del lado cliente.

---

## Objetivos (MVP) — frontend

1. Permitir al recruiter **ver** la ficha técnica en contexto **vacante + candidato**.
2. Permitir **descargar** la versión HTML (y PDF cuando el backend lo implemente), respetando autenticación.
3. Mostrar estados de **carga** y **error** claros (especialmente `404` cuando no hay postulación).

---

## No objetivos (MVP) — frontend

- Editor de plantillas o personalización por empresa.
- Vista del candidato sin vacante seleccionada (la ficha está definida como **par** vacante–candidato).
- Impresión avanzada/CSS distinta del preview si no es requisito de negocio.

---

## Endpoints a consumir

Definidos en el spec backend (prefijo `api/recruiter`, roles Recruiter/Admin):

| Uso | Método y ruta |
|-----|----------------|
| Preview en pantalla (recomendado) | `GET .../technical-sheet` → JSON |
| Descarga HTML | `GET .../technical-sheet.html` (opcional `?download=1`) |
| Descarga PDF | `GET .../technical-sheet.pdf` cuando exista |

Parámetros de ruta: `vacancyId`, `candidateProfileId`.

---

## Dónde ubicar la funcionalidad (UX)

1. **Detalle de candidato en el contexto de una vacante**  
   Donde ya se muestran etapa, score y entrevistas: acciones **“Ver ficha técnica”** (primaria o secundaria según diseño) y **“Descargar”**.

2. **Lista / tabla de aplicantes de una vacante**  
   Acción por fila (menú, icono documento o similar) que abre la misma vista o el mismo modal, sin perder el contexto del pipeline.

3. **Opcional**  
   Ruta dedicada del tipo `/vacancies/:vacancyId/candidates/:candidateId/technical-sheet` que hidrate desde JSON y reutilice layout del producto (mejor para **tema claro/oscuro** y **i18n**).

---

## Flujos recomendados

### Preview

1. Llamar al endpoint **JSON** (`technical-sheet`).
2. Renderizar con **componentes propios** del design system (secciones: datos personales, vacante, postulación, match, entrevistas).

Ventaja: textos de sección pasan por **i18n**, compatibilidad con temas y accesibilidad del resto del ATS.

### Descarga

1. **HTML:** `fetch` con credenciales/token igual que otras descargas recruiter → blob → objeto URL → disparar descarga con nombre de archivo coherente (`ficha-{vacancySlug}-{candidateId}.html` o convención del producto).

2. **PDF:** mismo patrón cuando el backend responda `200` con `application/pdf`; si recibe **501** o **404**, mostrar mensaje acorde (“PDF no disponible aún”).

Si la app usa **Bearer**, incluir `Authorization`; si usa **cookies httpOnly**, seguir el mismo patrón que otras descargas binarias para no romper CORS/credenciales.

---

## Estados de interfaz

| Estado | Comportamiento |
|--------|----------------|
| Loading | Skeleton o spinner en modal/página; deshabilitar doble submit. |
| Éxito JSON | Render de secciones; opción “Descargar”. |
| **404** | Mensaje explícito: p. ej. “Este candidato no está postulado a esta vacante” (ajustar copy con UX). |
| **401/403** | Redirigir login o mensaje de permisos según patrón actual. |
| PDF lento | Spinner prolongado o barra de progreso indeterminada. |

---

## Internacionalización

- Si la preview es **renderizada en frontend desde JSON**, todas las etiquetas de sección (**DATOS PERSONALES**, **ENTREVISTAS**, etc.) deben usar las **claves i18n** existentes.
- Si en algún momento la preview fuera **solo HTML del backend**, coordinar con backend idioma (`Accept-Language` o query) — ver backlog en spec backend.

---

## Evolución (frontend)

- Botón **“Enviar por correo”** cuando exista API de notificaciones.
- Vista comparativa entre dos candidatos misma vacante (fuera de alcance inicial).

---

## Checklist — frontend

- [ ] Botón / entrada “Ficha técnica” en vista vacante–candidato aplicable.
- [ ] Integración `GET` JSON + UI por secciones.
- [ ] Descarga HTML (y PDF cuando backend esté listo) con manejo de errores.
- [ ] Estados loading / empty / error / permisos.
- [ ] i18n de títulos de sección y mensajes de error.
- [ ] Accesibilidad: foco en modal, `aria-busy` durante carga si aplica.
