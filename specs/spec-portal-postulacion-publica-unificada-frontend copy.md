# Especificación: Postulación pública unificada y visualización de origen de postulación (Frontend)

## Referencia base

Este documento depende de:

- `spec-portal-postulacion-publica-unificada-backend.md`

Su alcance es únicamente el comportamiento **frontend** necesario para consumir el nuevo flujo público de postulación y reflejar el nuevo flag `ApplicationSource`.

## Contexto

Backend ahora soporta:

- `POST /api/vacantes/{vacanteId}/apply` como endpoint público de postulación,
- request `multipart/form-data`,
- respuesta mínima `200 OK` con:

```json
{
  "message": "Te has postulado a la vacante exitosamente"
}
```

- nuevo campo persistido `ApplicationSource` en las postulaciones:
  - `0 = Recruiter`
  - `1 = Personal`

Ese valor ya puede aparecer en payloads que exponen información de postulaciones.

## Objetivos

- Permitir que el candidato se postule desde el portal público sin autenticarse.
- Enviar todos los datos del formulario y el CV en una sola llamada.
- Mostrar feedback claro de éxito/error al usuario.
- Reflejar visualmente el origen de la postulación cuando el frontend muestre información de aplicaciones.

## No objetivos

- Login automático después de postularse.
- Dashboard autenticado completo del candidato.
- Edición avanzada del perfil del candidato desde el formulario público.
- Reglas de ranking o matching mostradas en UI.

## Flujo frontend esperado

```text
Detalle de vacante pública
-> candidato completa formulario
-> frontend arma multipart/form-data
-> POST /api/vacantes/{vacanteId}/apply
-> frontend muestra mensaje de éxito o error
```

## Pantallas impactadas

### 1. Detalle público de vacante

Debe existir una CTA visible del tipo:

- `Postularme`

Al activarla:

- abrir modal, drawer o sección inline con el formulario,
- mantener visible el contexto de la vacante,
- impedir submit duplicado mientras la petición está en curso.

### 2. Formulario público de postulación

Campos mínimos a renderizar:

- `firstName`
- `lastName`
- `email`
- `phone`
- `linkedinUrl`
- `websiteUrl`
- `source`
- `notes`
- `cvFile`

Campos opcionales, solo si producto decide exponerlos:

- `nationalId`
- `country`

## Contrato frontend del submit

El frontend debe enviar `multipart/form-data` hacia:

- `POST /api/vacantes/{vacanteId}/apply`

### Ejemplo conceptual

```ts
const formData = new FormData();
formData.append("firstName", values.firstName);
formData.append("lastName", values.lastName);
formData.append("email", values.email);
formData.append("phone", values.phone ?? "");
formData.append("linkedinUrl", values.linkedinUrl ?? "");
formData.append("websiteUrl", values.websiteUrl ?? "");
formData.append("source", values.source ?? "");
formData.append("notes", values.notes ?? "");
formData.append("cvFile", values.cvFile);

await fetch(`/api/vacantes/${vacancyId}/apply`, {
  method: "POST",
  body: formData
});
```

## Validaciones de frontend recomendadas

Antes del submit:

- `firstName` requerido,
- `lastName` requerido,
- `email` requerido y con formato válido,
- `cvFile` requerido,
- validar extensión permitida: **solo `.pdf`** (alineado con el backend público).

Estas validaciones son de UX y **no reemplazan** la validación backend.

## Estados de UI requeridos

### Idle

- botón submit habilitado,
- campos editables,
- helper text en el upload indicando que solo se admite **PDF**.

### Loading

- deshabilitar submit,
- evitar doble click,
- mostrar estado tipo:
  - `Enviando postulación...`

### Success

Cuando backend responda `200 OK`, mostrar:

- `Te has postulado a la vacante exitosamente`

Comportamiento recomendado:

- limpiar formulario,
- cerrar modal si producto lo prefiere,
- o mantener el success state visible con CTA secundaria como `Volver a vacantes`.

### Error

#### `400 Bad Request`

Mostrar errores por campo si vienen en `errors`.

#### `404 Not Found`

Mostrar mensaje:

- `La vacante ya no está disponible.`

#### `409 Conflict`

Mostrar mensaje:

- `Ya te has postulado a esta vacante.`

#### `415 Unsupported Media Type`

Mostrar mensaje acorde al backend, por ejemplo:

- `El archivo debe estar en formato PDF.`

(o reutilizar literalmente el `message` del backend: `Unsupported CV file format. Allowed format: PDF.` según política de i18n del producto).

#### Fallback genérico

- `No pudimos procesar tu postulación en este momento. Intenta nuevamente.`

## Reglas de UX

- No exigir cuenta ni login antes de postular.
- No redirigir a pantalla de autenticación si el endpoint responde errores funcionales.
- Mantener copy simple y candidato-friendly.
- Si el submit falla, conservar los valores ya escritos para no frustrar al usuario.

## Nuevo campo `ApplicationSource`

Frontend debe contemplar el nuevo campo numérico:

- `0 = Recruiter`
- `1 = Personal`

## Superficies donde debe reflejarse

### 1. Información de postulación en vistas recruiter

Si una pantalla recruiter consume `ApplicationDto` o payloads equivalentes, debe mostrar el origen de la postulación.

Representación sugerida:

- badge o label:
  - `Recruiter` para `0`
  - `Personal` para `1`

### 2. Dashboard o lista de postulaciones del candidato

Si el frontend candidato consume filas de aplicaciones y backend devuelve `ApplicationSource`, puede mostrarse:

- como badge discreto,
- o como texto secundario dentro del card de postulación.

Recomendación:

- mostrar `Personal` solo cuando el valor sea `1`,
- ocultar el badge cuando sea `0` si producto quiere una UI más limpia,
- o mostrar ambos estados explícitamente si recruiter necesita claridad operativa.

## Mapeo frontend sugerido

```ts
function mapApplicationSourceLabel(source: number): string {
  if (source === 1) return "Personal";
  return "Recruiter";
}
```

## Impacto en modelos frontend

Los tipos/interfaces de frontend que representen postulaciones deben incorporar:

- `applicationSource: number`

Ejemplos típicos:

- `ApplicationDto`
- `CandidatePortalApplicationRowDto`
- `CandidateMatchDto`

## Criterios de render para `ApplicationSource`

- Si el campo no viene por compatibilidad temporal, asumir `0`.
- Si viene `1`, mostrar claramente que la postulación fue hecha por el propio candidato.
- No bloquear UI si el valor es desconocido; fallback sugerido:
  - `Origen desconocido`

## Casos de uso frontend

### Caso 1: candidato se postula públicamente

```text
1. Usuario abre vacante pública
2. Completa formulario
3. Adjunta CV
4. Frontend hace POST multipart
5. Frontend muestra "Te has postulado a la vacante exitosamente"
```

### Caso 2: recruiter revisa postulaciones

```text
1. Recruiter entra al detalle de vacante
2. Frontend consume listado de applications
3. Cada fila puede mostrar ApplicationSource
4. Si source = 1, UI marca "Personal"
```

### Caso 3: candidato ve sus postulaciones

```text
1. Candidato autenticado entra a dashboard
2. Frontend consume aplicaciones
3. Si applicationSource = 1, puede mostrar badge "Personal"
```

## Pruebas frontend sugeridas

### Unit/UI tests

- El formulario no permite submit sin nombre, apellido, email o CV.
- El formulario rechaza extensiones no permitidas a nivel UI.
- El botón submit entra en loading mientras la request está pendiente.
- Un `200` muestra el mensaje de éxito esperado.
- Un `409` muestra mensaje de duplicado.
- Un `415` muestra mensaje de formato inválido.
- El badge de origen muestra `Personal` cuando `applicationSource = 1`.
- El badge de origen muestra `Recruiter` cuando `applicationSource = 0`.

### Integration / E2E

- Desde una vacante pública se puede completar y enviar la postulación.
- Tras éxito, el usuario ve el mensaje final correcto.
- En vistas recruiter, una postulación creada desde el endpoint público se renderiza como `Personal`.

## Criterios de aceptación

- [ ] Existe UI para postularse desde la vacante pública.
- [ ] El frontend envía `multipart/form-data` al nuevo endpoint público.
- [ ] El selector de CV solo permite **PDF** (`.pdf`) y el copy de ayuda lo indica.
- [ ] El frontend muestra `Te has postulado a la vacante exitosamente` al recibir `200`.
- [ ] El frontend maneja correctamente `400`, `404`, `409` y `415` (incluido mensaje para formato no PDF).
- [ ] El frontend evita doble submit mientras la petición está en curso.
- [ ] Los modelos frontend de postulación contemplan `ApplicationSource`.
- [ ] Las pantallas que muestran información de postulación pueden reflejar `0 = Recruiter` y `1 = Personal`.

---

*Documento de planificación frontend. Debe implementarse en coordinación con `spec-portal-postulacion-publica-unificada-backend.md` y con los componentes reales del portal candidato/recruiter.*
