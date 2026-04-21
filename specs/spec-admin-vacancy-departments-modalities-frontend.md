# Especificación: Catálogos de departamentos y modalidades para vacantes (Frontend Admin)

## Contexto

El panel administrativo necesita que un usuario con rol `Admin` pueda gestionar los catálogos globales de:

- departamentos de vacantes,
- modalidades de vacantes.

Este spec cubre la implementación **frontend** de dichas pantallas administrativas, asumiendo que el backend expondrá los endpoints descritos en `spec-admin-vacancy-departments-modalities-backend.md`.

## Objetivos

- Permitir a `Admin` listar, crear, editar, activar/desactivar y eliminar departamentos.
- Permitir a `Admin` listar, crear, editar, activar/desactivar y eliminar modalidades.
- Mostrar feedback claro de éxito, error, estados vacíos y conflictos de uso.
- Mantener una UX simple y consistente con otros catálogos del ATS.

## No objetivos

- Formulario de vacante recruiter.
- Portal candidato.
- Gestión por empresa o tenant.
- Jerarquías, agrupaciones o drag and drop avanzado.

## Rutas sugeridas

```text
/admin/catalogos/departamentos
/admin/catalogos/departamentos/nuevo
/admin/catalogos/departamentos/<id>/editar
/admin/catalogos/modalidades
/admin/catalogos/modalidades/nuevo
/admin/catalogos/modalidades/<id>/editar
```

Si el proyecto prefiere modal en lugar de rutas hijas, el alcance funcional es el mismo.

## Pantallas

### 1) Listado de departamentos

Componentes sugeridos:

- `DepartmentCatalogPage`
- `DepartmentTable`
- `DepartmentToolbar`
- `DepartmentStatusBadge`
- `DepartmentDeleteDialog`

Columnas sugeridas:

- Nombre
- Código
- Descripción
- Orden
- Estado
- Vacantes asociadas
- Acciones

Acciones por fila:

- Editar
- Activar / desactivar
- Eliminar

CTA principal:

- `Crear departamento`

### 2) Formulario de departamento

Campos:

- `displayName`
- `code`
- `description`
- `sortOrder`
- `isActive`

Validaciones UI:

- nombre requerido,
- código requerido,
- código en slug válido,
- orden numérico,
- evitar submit duplicado.

### 3) Listado de modalidades

Componentes sugeridos:

- `ModalityCatalogPage`
- `ModalityTable`
- `ModalityToolbar`
- `ModalityStatusBadge`
- `ModalityDeleteDialog`

Columnas sugeridas:

- Nombre
- Código
- Descripción
- Orden
- Estado
- Vacantes asociadas
- Acciones

CTA principal:

- `Crear modalidad`

### 4) Formulario de modalidad

Campos:

- `displayName`
- `code`
- `description`
- `sortOrder`
- `isActive`

## Integración API

### Departamentos

- `GET /api/admin/vacancy-departments`
- `GET /api/admin/vacancy-departments/{id}`
- `POST /api/admin/vacancy-departments`
- `PUT/PATCH /api/admin/vacancy-departments/{id}`
- `DELETE /api/admin/vacancy-departments/{id}`

### Modalidades

- `GET /api/admin/vacancy-modalities`
- `GET /api/admin/vacancy-modalities/{id}`
- `POST /api/admin/vacancy-modalities`
- `PUT/PATCH /api/admin/vacancy-modalities/{id}`
- `DELETE /api/admin/vacancy-modalities/{id}`

## Tipos frontend sugeridos

```typescript
interface VacancyDepartmentAdminItem {
  id: string;
  code: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  vacanciesCount?: number;
}

interface VacancyModalityAdminItem {
  id: string;
  code: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  vacanciesCount?: number;
}

interface VacancyCatalogFormValues {
  displayName: string;
  code: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}
```

## Estados de UX

### Loading

- skeleton para tabla,
- disabled state en botones primarios,
- spinner en submit.

### Empty state

#### Departamentos

- mensaje: `Aún no hay departamentos creados`
- CTA: `Crear departamento`

#### Modalidades

- mensaje: `Aún no hay modalidades creadas`
- CTA: `Crear modalidad`

### Error state

- error de carga inicial,
- error de guardado,
- error de borrado,
- error por conflicto (`409`) si el registro está en uso.

Mensajes sugeridos:

- `No se pudo cargar el catálogo.`
- `No se pudo guardar el registro.`
- `No se puede eliminar porque está asociado a vacantes existentes.`

### Success feedback

- toast al crear,
- toast al actualizar,
- toast al activar/desactivar,
- toast al eliminar.

## Comportamientos clave

- El código debe autogenerarse opcionalmente a partir del nombre, con posibilidad de edición manual.
- El listado debe reflejar orden por `sortOrder` y luego `displayName`.
- El toggle activo/inactivo debe requerir confirmación si el catálogo ya tiene vacantes asociadas.
- Si el backend devuelve `409`, el frontend debe sugerir desactivar en vez de eliminar.

## Permisos frontend

- La navegación a estas pantallas solo debe estar disponible para `Admin`.
- Si un usuario sin permiso accede directamente:
  - redirigir,
  - o mostrar `403` según convención del proyecto.

## Flujos principales

### Crear departamento

```text
1. Admin entra al listado
2. Hace click en "Crear departamento"
3. Completa formulario
4. Guarda
5. Tabla se refresca y aparece el nuevo registro
```

### Editar modalidad

```text
1. Admin entra al listado de modalidades
2. Selecciona editar
3. Actualiza nombre, orden o estado
4. Guarda
5. Tabla se refresca con cambios
```

### Eliminar registro en uso

```text
1. Admin intenta eliminar un catálogo usado por vacantes
2. Backend responde 409
3. Frontend muestra mensaje claro
4. Se ofrece alternativa de desactivar
```

## Pruebas frontend

- Render de tabla con datos.
- Empty state cuando no hay elementos.
- Submit de create/edit.
- Manejo visual de `409`.
- Visibilidad restringida por rol.
- Recarga de lista luego de operaciones exitosas.

## Criterios de aceptación

- [ ] Existe UI admin para departamentos.
- [ ] Existe UI admin para modalidades.
- [ ] El usuario `Admin` puede crear, editar y desactivar ambos catálogos.
- [ ] El usuario recibe feedback claro en éxito, error y conflicto.
- [ ] Los catálogos en uso no se eliminan silenciosamente.
- [ ] La navegación está protegida por rol.

---

*Documento de planificación frontend. Las rutas y nombres finales de componentes deben alinearse con la estructura real del proyecto al implementar.*
