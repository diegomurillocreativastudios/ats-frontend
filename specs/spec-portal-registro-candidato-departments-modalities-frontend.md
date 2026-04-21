# Especificación: Portal de registro de candidato con departamentos y modalidades (Frontend)

## Referencia base

Este documento extiende y complementa:

- [`spec-portal-registro-candidato.md`](./spec-portal-registro-candidato.md)

La intención es aterrizar únicamente el alcance **frontend** necesario para que el portal de oportunidades soporte correctamente los nuevos catálogos de:

- departamentos,
- modalidades.

## Contexto

El spec del portal ya contempla filtros por departamento y modalidad en `/oportunidades`, además de la visualización de estos datos en cards y detalle de vacante. Sin embargo, para evitar hardcodes y asegurar consistencia con backend, estos valores deben venir desde catálogo.

Este spec define cómo debe integrarlo el frontend del portal candidato.

## Objetivos

- Volver dinámicos los filtros de departamento y modalidad en `/oportunidades`.
- Mostrar departamento y modalidad reales en cards y detalle de vacante.
- Mantener persistencia de filtros en URL.
- Integrar estos datos en una experiencia responsiva, clara y consistente con el spec base.

## No objetivos

- CRUD admin de catálogos.
- Formulario recruiter de vacantes.
- Lógica de persistencia backend.
- Recomendaciones o ranking por departamento/modalidad.

## Pantallas impactadas

### 1) `/oportunidades`

Impactos:

- `FilterPanel`
- `VacanteCard`
- `VacanteGrid` / `VacanteList`
- `SearchBar` si comparte estado de filtros
- `Pagination`

### 2) `/oportunidades/<vacanteId>`

Impactos:

- `VacanteHeader`
- `VacanteMetadata`
- `CompanySidebar` o bloque equivalente de detalles

## Integración de filtros dinámicos

## Fuente de datos recomendada

La recomendación principal es consumir filtros disponibles desde el mismo endpoint del listado:

- `GET /api/vacancies`

en una estructura como:

```json
{
  "data": [],
  "availableFilters": {
    "departments": [
      {
        "id": "uuid",
        "code": "development",
        "displayName": "Development",
        "count": 12
      }
    ],
    "modalities": [
      {
        "id": "uuid",
        "code": "remote",
        "displayName": "Remoto",
        "count": 20
      }
    ]
  }
}
```

Alternativa válida:

- endpoints públicos dedicados de catálogo si el backend decide separarlos.

## Comportamiento del `FilterPanel`

- Renderizar departamentos desde `availableFilters.departments`.
- Renderizar modalidades desde `availableFilters.modalities`.
- No usar listas hardcodeadas en cliente.
- Mostrar contador por opción si viene en payload.
- Permitir limpiar filtros individuales o todos.

## Query params sugeridos

Opción recomendada:

- `departmentId`
- `modalityId`

Opcionalmente, si el producto quiere URLs más legibles:

- `department`
- `modality`

Ejemplo:

```text
/oportunidades?departmentId=<uuid>&modalityId=<uuid>
```

## Cambios de UI en listado

### `VacanteCard`

Debe mostrar:

- nombre de departamento,
- modalidad,
- país si existe,
- resto de datos ya definidos en el spec base.

Ejemplo:

```text
Senior React Developer
TechCorp
Development | Remoto | SV
```

### `VacanteList` / `VacanteGrid`

- Mantener la información visible sin saturar la tarjeta.
- Usar badges o texto de metadata según diseño final.
- Priorizar legibilidad en mobile.

## Cambios de UI en detalle

### Header / metadata

Agregar claramente:

- `Departamento`
- `Modalidad`

Ejemplo:

```text
[Development] [Remoto] [SV]
```

### Sidebar o sección de detalles

Debe incluir filas o labels explícitos:

- Departamento: `Development`
- Modalidad: `Remoto`

## Tipos frontend sugeridos

```typescript
interface OpportunityFilterOption {
  id: string;
  code: string;
  displayName: string;
  count?: number;
}

interface OpportunityListFilters {
  departmentId?: string[];
  modalityId?: string[];
  search?: string;
  page?: number;
}

interface OpportunityVacancySummary {
  id: string;
  title: string;
  company: {
    id: string;
    name: string;
  };
  countryCode?: string;
  department?: {
    id: string;
    code: string;
    displayName: string;
  };
  modality?: {
    id: string;
    code: string;
    displayName: string;
  };
}
```

## Estados de UX

### Loading

- skeleton del listado,
- skeleton del panel de filtros,
- transición suave al cambiar filtros.

### Empty state

Cuando no haya resultados:

- mantener visibles los filtros activos,
- mostrar CTA para limpiar filtros,
- sugerir ver todas las vacantes.

### Error state

- error al cargar listado,
- error al cargar filtros si vienen separados,
- fallback razonable si una vacante no tiene departamento/modalidad.

Fallback legacy:

- mostrar `No especificado`.

## Responsive

- En mobile, `FilterPanel` debe seguir siendo colapsable.
- Los filtros de departamento y modalidad deben ser fáciles de tocar.
- En cards mobile, mostrar metadata resumida sin romper el layout.

## Analytics sugeridos

Extender eventos del spec base con:

- `department_filter_applied`
- `modality_filter_applied`
- `vacancy_department_viewed`
- `vacancy_modality_viewed`

## Flujos principales

### Filtrar por departamento

```text
1. Usuario entra a /oportunidades
2. Frontend carga vacantes y filtros
3. Usuario selecciona un departamento
4. URL se actualiza
5. Se recarga el listado filtrado
6. Los chips muestran el filtro activo
```

### Filtrar por modalidad

```text
1. Usuario selecciona "Remoto"
2. Se actualiza query param
3. Se consulta nuevamente el listado
4. El resultado muestra solo vacantes remotas
```

### Ver detalle

```text
1. Usuario abre una vacante
2. El detalle muestra departamento y modalidad
3. El usuario entiende mejor el contexto del puesto antes de aplicar
```

## Criterios de aceptación

- [ ] `/oportunidades` usa filtros dinámicos para departamentos y modalidades.
- [ ] Las URLs preservan filtros de departamento y modalidad.
- [ ] `VacanteCard` muestra ambos datos.
- [ ] El detalle de vacante muestra ambos datos.
- [ ] El portal no depende de enums o listas hardcodeadas para estos valores.
- [ ] Las vacantes legacy sin clasificación muestran fallback seguro.

---

*Documento de planificación frontend. Debe implementarse en coherencia con `spec-portal-registro-candidato.md` y con el contrato backend final del portal.*
