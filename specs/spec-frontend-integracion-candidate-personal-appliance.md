# Spec: Integracion frontend con `POST /api/candidate/personal-appliance`

## Objetivo

Actualizar el flujo de "Enviar postulacion" en `app/oportunidades/[vacanteId]/aplicar/page.tsx` (a traves de sus componentes asociados) para consumir el nuevo endpoint:

- `POST /api/candidate/personal-appliance`

con contrato:

- `multipart/form-data`
  - `vacancyId`
  - `cvFile` (`.pdf` o `.docx`)
  - `candidate` (JSON string)
- `200 OK` con body string plano:
  - `Application pipeline executed successfully.`

## Contexto actual detectado

El flujo vigente usa:

- `PublicVacancyApplyPage` -> `PublicVacancyApplicationForm`
- helper `submitPublicVacancyApplication(...)` en `lib/public-vacancy-apply.ts`
- endpoint anterior:
  - `POST /api/vacantes/{vacancyId}/apply`
- validacion de CV solo PDF
- copy de UI: "No necesitas crear cuenta para postularte."

## Hallazgos de impacto (importantes)

1. **Cambio de endpoint y shape del payload**
   - Ya no se envia cada campo de candidato como `FormData` plano.
   - Ahora se envia `candidate` serializado en JSON string.

2. **Cambio en respuesta exitosa**
   - El cliente API actual intenta parsear JSON siempre (`res.json()`).
   - Si backend responde texto plano, hoy caeria en `{}` y podria ocultar el mensaje real.

3. **Autenticacion**
   - El backend descrito valida "usuario candidato" y puede devolver `403` si `candidate.email` no coincide con token.
   - Eso implica dependencia de sesion/token para aplicar, lo cual contradice copy actual de UI publica.

4. **Formato de archivo**
   - Backend acepta `PDF/DOCX`.
   - UI actual solo acepta PDF (validacion y `accept` del input).

## Alcance de implementacion propuesto

### 1) Capa API base (`lib/api.ts`)

Agregar soporte robusto para respuestas no-JSON:

- intentar parsear body segun `content-type`:
  - `application/json` -> `res.json()`
  - otro tipo -> `res.text()`
- mantener `err.body` para errores JSON o texto.
- no romper consumidores actuales.

**Resultado esperado:** poder manejar correctamente el `200` string del nuevo endpoint.

### 2) Contrato de apply (`lib/public-vacancy-apply.ts`)

Refactor del submit para nuevo endpoint:

- actualizar tipos de valores:
  - preservar datos de formulario
  - mapear `phone` -> `phoneNumber` dentro de `candidate`
- construir `FormData` con:
  - `vacancyId`
  - `cvFile`
  - `candidate` = `JSON.stringify({...})`
- cambiar URL a:
  - `/api/candidate/personal-appliance`
- aceptar respuesta string y devolver mensaje final consistente.

### 3) Formulario UI (`components/public/PublicVacancyApplicationForm.tsx`)

Cambios de UX/validacion:

- permitir `PDF` y `DOCX`:
  - actualizar `accept`
  - actualizar helper de validacion (`isPdfFile` -> `isAllowedCvFile`)
  - actualizar textos ("PDF o DOCX")
- mantener validaciones de campos requeridos.
- mapear errores del backend nuevo:
  - `400`: errores de validacion / JSON invalido
  - `403`: email del form no coincide con usuario autenticado
  - `404`: vacante no existe
  - `422`: fallo de extraccion/embedding o vacante sin embedding
- ajustar `getPublicApplyErrorMessage(...)` para estos codigos.

### 4) Copy contextual en pagina de apply (`components/public/PublicVacancyApplyPage.tsx`)

Debido al posible requisito de autenticacion:

- reemplazar copy "No necesitas crear cuenta para postularte" por texto neutral, por ejemplo:
  - "Usa el mismo correo asociado a tu cuenta de candidato."

> Nota: este cambio depende de confirmacion de producto/negocio. Si desean mantener postulacion sin login, backend y frontend quedan inconsistentes con el contrato descrito.

### 5) Manejo de progreso y submit

Se conserva el flujo de progreso actual (pasos 1-5).  
Solo se ajusta la llamada y mensajes de error/success.

## Archivos a modificar (plan)

- `lib/api.ts`
- `lib/public-vacancy-apply.ts`
- `components/public/PublicVacancyApplicationForm.tsx`
- `components/public/PublicVacancyApplyPage.tsx` (copy/UX, segun confirmacion)

## Riesgos y mitigaciones

1. **Riesgo:** ruptura de otros consumidores por cambio en parsing de `apiClient`.
   - **Mitigacion:** mantener compatibilidad con JSON como default y agregar fallback seguro a texto.

2. **Riesgo:** confusion de usuario por `403` cuando no hay sesion candidata.
   - **Mitigacion:** mensaje explicito y copy preventivo en pagina.

3. **Riesgo:** desalineacion de formatos CV entre UI y backend.
   - **Mitigacion:** habilitar `DOCX` en validacion y `accept`.

## Criterios de aceptacion

- Al hacer click en "Enviar postulacion", se invoca `POST /api/candidate/personal-appliance`.
- Request llega como `multipart/form-data` con `vacancyId`, `cvFile`, `candidate`.
- `candidate` viaja como JSON string valido.
- UI acepta CV en `.pdf` y `.docx`.
- `200` muestra estado de exito sin romper por parseo.
- `400/403/404/422` muestran mensajes claros al usuario.
- No hay doble submit durante loading.

## Plan de ejecucion (cuando apruebes)

1. Ajustar `apiClient` para body JSON/text.
2. Migrar `submitPublicVacancyApplication` al nuevo endpoint/shape.
3. Actualizar validacion y mensajes del formulario.
4. Ajustar copy contextual de apply (si confirmas).
5. Verificar con lint en archivos tocados.
6. Prueba manual guiada del flujo con caso success + errores clave.

## Preguntas de confirmacion antes de implementar

1. Confirmas que **si** debe requerir usuario autenticado candidato para postular?
2. Confirmas habilitar `DOCX` en UI (ademas de PDF)?
3. Deseas que ajuste el copy para no prometer "sin cuenta/sin login"?
4. Para `403`, prefieres mensaje:
   - "El correo ingresado debe coincidir con tu cuenta de candidato."
   o uno mas corto?
