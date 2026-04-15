# Especificación: país aplicable a la vacante (Portal RRHH)

## Objetivo

Permitir definir y visualizar **a qué país aplica** cada vacante en el portal de RRHH: al crear, al listar, al ver detalle y al editar.

## Alcance (frontend)

| # | Requisito |
|---|-----------|
| 1 | En el **modal de crear vacante**, incluir un **select** para elegir el país al que aplica la vacante. |
| 2 | En la **lista** `/portal-rrhh/vacantes`, cada **ítem de vacante** debe mostrar el país aplicable. |
| 3 | En la **vista detalle** `/portal-rrhh/vacantes/<id>`, mostrar el país aplicable de la vacante. |
| 4 | En el **modal (o flujo) de editar vacante**, el mismo **select** para modificar el país aplicable. |

## Puntos de integración en el código (referencia)

- **Crear vacante:** `components/rrhh/NuevaVacanteModal.tsx` — hoy el `payload` incluye `title`, `description`, `companyId`, `requirements`, `weights`; habrá que añadir el campo acordado con el API.
- **Listado:** `app/portal-rrhh/vacantes/page.tsx` — `mapVacancyFromApi` mapea ítems del API; extender el modelo de ítem y la UI de cada card/fila.
- **Detalle y edición:** `app/portal-rrhh/vacantes/[id]/page.tsx` — carga de vacante, `hydrateEditFormFromVacancy`, `handleSaveVacancy` y UI de cabecera/resumen deben incluir país en lectura y en el guardado.

## UX del select de país

- **Etiqueta sugerida:** «País» o «País al que aplica la vacante».
- **Componente:** select accesible (`label` + `htmlFor`, o patrón equivalente al resto del portal RRHH).
- **Opciones:** reutilizar o alinear con `getCountrySelectOptions()` en `lib/profile-form-options.ts` (nombres en español + bandera), **salvo** que el backend exija otro formato de valor (ver contrato API).
- **Validación:** definir si el país es obligatorio al crear/editar. Recomendación: **obligatorio** para nuevas vacantes si el producto lo requiere; si hay vacantes legacy sin país, el listado/detalle puede mostrar «—» o un valor por defecto acordado.

## Contrato API (a definir con backend)

Antes de implementar, confirmar en el servicio de vacantes:

- **Nombre del campo** en JSON (ejemplos: `country`, `countryCode`, `applicableCountryCode`).
- **Formato del valor:** coherente con el resto del sistema (p. ej. ISO 3166-1 alpha-2 `CL`, `MX`, o el mismo criterio que usa el perfil candidato si se reutiliza lógica).

Si el backend aún no expone el campo:

1. Añadir el campo en el backend y migraciones si aplica.
2. Documentar el valor por defecto para vacantes existentes (null + UI «Sin especificar», o default de empresa).

## Criterios de aceptación

1. Al abrir «Nueva vacante», el usuario puede elegir país en un desplegable; al guardar, el request incluye el campo acordado y la vacante se crea correctamente.
2. En `/portal-rrhh/vacantes`, cada vacante muestra de forma visible el país (misma jerarquía visual que departamento/ubicación según diseño del layout actual).
3. En `/portal-rrhh/vacantes/<id>`, el país se muestra en la información de la vacante (no solo en el formulario de edición).
4. Al editar la vacante, el select muestra el país actual y permite cambiarlo; al guardar, el API persiste el cambio y la lista/detalle reflejan el nuevo valor tras refrescar o invalidar datos.

## Fuera de alcance (opcional / posterior)

- Filtrar vacantes por país en el listado.
- Restricciones por país en postulaciones o matching.

## Checklist de implementación (dev)

- [ ] Contrato API acordado (campo + formato).
- [ ] `NuevaVacanteModal`: estado, validación, payload.
- [ ] Listado: `mapVacancyFromApi` + UI del ítem.
- [ ] Detalle: lectura + visualización.
- [ ] Edición: estado inicial desde `vacancy`, payload en `handleSaveVacancy`.
- [ ] Pruebas manuales o E2E en flujos crear / listar / detalle / editar.
