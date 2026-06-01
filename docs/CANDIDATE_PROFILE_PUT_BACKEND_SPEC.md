# Especificación backend: `PUT /api/candidate/profile` (campos extendidos)

Documento para **equipo backend** (o prompt para implementación): qué debe aceptar y persistir el endpoint de actualización del perfil de candidato, alineado con lo que envía el **frontend ATS** (`ats-frontend`).

**Autenticación:** `Authorization: Bearer <JWT>`. El candidato se resuelve solo por el usuario del token (sin ID de perfil en la URL).

**Content-Type:** `application/json`

**Rutas equivalentes (si ya existen):** `PUT` y/o `POST` `/api/candidate/profile` con el mismo cuerpo.

---

## 1) Comportamiento esperado

1. **Campos obligatorios en cada guardado** (igual que contrato previo): `headline`, `summary`, `resumeMarkdown`, `nationalId` — siempre enviados con valor no vacío por el cliente.
2. **Campos opcionales:** el frontend **omite** las propiedades que no aplican o van vacías (actualización parcial). Si el backend usa regla “omitir o `null` mantiene el valor anterior”, debe respetar ambas.
3. **Campos nuevos (este documento):** el backend debe **deserializar, validar y persistir** en el agregado `CandidateProfile` (o equivalente) y **devolverlos en `GET /api/candidate/profile`** para que la UI refleje el guardado sin depender solo de `/api/candidate/me`.
4. **Arrays/objetos anidados:** el formato enviado coincide con el modelo de **CV normalizado** ya usado en el resto del sistema (claves **PascalCase** en objetos de lista), para compatibilidad con datos importados de documentos.

---

## 2) Cuerpo JSON — obligatorios

| Campo | Tipo | Notas |
|--------|------|--------|
| `headline` | `string` | Titular profesional |
| `summary` | `string` | Resumen |
| `resumeMarkdown` | `string` | CV en texto (markdown) |
| `nationalId` | `string` | Documento de identidad (validación de negocio existente) |

---

## 3) Cuerpo JSON — opcionales escalares (perfil)

| Campo | Tipo | Notas |
|--------|------|--------|
| `firstName` | `string` \| `null` | |
| `lastName` | `string` \| `null` | |
| `country` | `string` \| `null` | |
| `birthDate` | `string` (ISO 8601) \| `null` | El front envía ISO (p. ej. fecha local convertida a UTC) |
| `birthCity` | `string` \| `null` | |
| `maritalStatus` | `string` \| `null` | |
| `gender` | `string` \| `null` | |
| `minSalary` | `number` \| `null` | Salario mínimo a nivel perfil |
| `availability` | `string` \| `null` | Disponibilidad a nivel perfil |
| `hasDisability` | `boolean` \| `null` | Discapacidad a nivel perfil |

---

## 4) Cuerpo JSON — contacto (opcional)

| Campo | Tipo | Notas |
|--------|------|--------|
| `email` | `string` \| `null` | Debe ser coherente con reglas de cuenta (único, verificación, etc.) |
| `phoneNumber` | `string` \| `null` | Formato según reglas de negocio del dominio |

**Nota:** Si el correo/teléfono solo deben cambiarse vía otro endpoint (cuenta/usuario), el backend puede **rechazar** estos campos con **400** y documentar la alternativa; el front puede adaptarse. Lo ideal es persistir en perfil o delegar explícitamente.

---

## 5) `jobPreferences` (opcional)

**Tipo:** `object` (JSON), no string serializado obligatorio.

El front envía un único objeto con **solo las claves que tienen valor**, por ejemplo:

| Clave | Tipo | Notas |
|--------|------|--------|
| `DesiredRole` | `string` | |
| `EducationLevel` | `string` | |
| `DesiredCity` | `string` | |
| `Availability` | `string` | Disponibilidad dentro del bloque preferencias (distinta de `availability` de perfil si el modelo lo separa) |
| `MinSalary` | `number` | Salario mínimo dentro de preferencias |
| `Sectors` | `string[]` | Lista de sectores |
| `Disability` | `boolean` | Preferencia laboral (discapacidad declarada en este bloque) |

El backend debe persistirlo como JSON (columna JSON, o desnormalizado) y devolverlo en GET.

---

## 6) `videoLink` (opcional)

| Campo | Tipo |
|--------|------|
| `videoLink` | `string` \| `null` |

URL del video (presentación, portfolio, etc.).

---

## 7) Arrays de objetos — forma enviada por el front

Todas las claves de cada elemento usan **PascalCase** (alineado al modelo de CV normalizado).

### `workExperience` — `array` de objetos

```json
{
  "Company": "string",
  "Role": "string",
  "StartDate": "string",
  "EndDate": "string",
  "Description": "string"
}
```

### `education` — `array` de objetos

```json
{
  "Institution": "string",
  "Degree": "string",
  "StartDate": "string",
  "EndDate": "string"
}
```

### `languages` — `array` de objetos

```json
{
  "Language": "string",
  "Level": "string"
}
```

### `socialLinks` — `array` de objetos

```json
{
  "Platform": "string",
  "Url": "string"
}
```

### `references` — `array` de objetos

```json
{
  "Name": "string",
  "Position": "string",
  "Company": "string",
  "Contact": "string"
}
```

---

## 8) `skills` (opcional)

**Tipo:** `string[]` — lista de habilidades (una entrada = una habilidad).

---

## 9) `recognitions` (opcional)

**Tipo:** `string[]` — un elemento por reconocimiento (texto libre).

---

## 10) Ejemplo de cuerpo `PUT` (ilustrativo)

```json
{
  "headline": "Desarrollador full stack",
  "summary": "Resumen breve...",
  "resumeMarkdown": "# CV\n...",
  "nationalId": "12345678-9",
  "firstName": "María",
  "lastName": "Pérez",
  "country": "El Salvador",
  "birthDate": "1990-05-15T12:00:00.000Z",
  "birthCity": "San Salvador",
  "maritalStatus": "Soltera",
  "gender": "Femenino",
  "minSalary": 1500,
  "availability": "Inmediata",
  "hasDisability": false,
  "email": "maria@example.com",
  "phoneNumber": "+50300000000",
  "videoLink": "https://example.com/video",
  "jobPreferences": {
    "DesiredRole": "Senior developer",
    "EducationLevel": "Universitaria",
    "DesiredCity": "San Salvador",
    "Availability": "Full time",
    "MinSalary": 1800,
    "Sectors": ["Tecnología", "Fintech"],
    "Disability": false
  },
  "workExperience": [
    {
      "Company": "ACME",
      "Role": "Developer",
      "StartDate": "2020-01",
      "EndDate": "2023-12",
      "Description": "Detalles..."
    }
  ],
  "education": [
    {
      "Institution": "Universidad X",
      "Degree": "Ingeniería",
      "StartDate": "2015",
      "EndDate": "2019"
    }
  ],
  "languages": [{ "Language": "Inglés", "Level": "B2" }],
  "skills": ["TypeScript", "React", ".NET"],
  "socialLinks": [{ "Platform": "LinkedIn", "Url": "https://linkedin.com/in/..." }],
  "references": [
    {
      "Name": "Juan R.",
      "Position": "Gerente",
      "Company": "ACME",
      "Contact": "+503..."
    }
  ],
  "recognitions": ["Certificación AWS", "Mejor proyecto 2023"]
}
```

---

## 11) Respuesta `200` — `GET` / `PUT`

La respuesta debe ser el **perfil actualizado** (`CandidateProfile`) incluyendo **todos** los campos anteriores que el backend persista, más `id` y cualquier metadato habitual (`createdAt`, etc.), para que el front pueda hacer **round-trip** sin depender de `/api/candidate/me` para esos datos.

---

## 12) Errores (referencia)

- **400** — Validación (incl. `nationalId` inválido).
- **403** — Cuenta baneada o sin permiso.
- **409** — `nationalId` ya usado por otro perfil (mensaje existente).

---

## 13) Prompt corto (copiar y pegar)

```
Necesito extender el endpoint PUT (y POST si aplica) /api/candidate/profile del ATS para que acepte y persista, además de headline, summary, resumeMarkdown y nationalId, los siguientes campos opcionales en JSON: email, phoneNumber, firstName, lastName, country, birthDate (ISO 8601), birthCity, maritalStatus, gender, minSalary, availability, hasDisability, videoLink, jobPreferences (objeto con DesiredRole, EducationLevel, DesiredCity, Availability, MinSalary, Sectors[], Disability), workExperience (array de { Company, Role, StartDate, EndDate, Description }), education (array de { Institution, Degree, StartDate, EndDate }), languages (array de { Language, Level }), skills (string[]), socialLinks (array de { Platform, Url }), references (array de { Name, Position, Company, Contact }), recognitions (string[]). Los objetos en arrays usan PascalCase como el CV normalizado. Actualización parcial: omitir propiedades opcionales vacías mantiene el valor anterior. GET /api/candidate/profile debe devolver el mismo modelo persistido para round-trip con el front.
```

---

## Referencia de implementación en frontend

- Tipos y armado del body: `lib/candidate-profile.ts`, `lib/candidate-profile-structured.ts`, `lib/candidate-profile-hydrate.ts`
- UI: `components/candidato/candidate-profile-edit-form.tsx`
