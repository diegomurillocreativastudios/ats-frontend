# Especificación: UI de oportunidades públicas (Frontend)

## Referencias base

Este documento complementa y no reemplaza:

- [`spec-portal-registro-candidato.md`](./spec-portal-registro-candidato.md)
- [`spec-portal-registro-candidato-departments-modalities-frontend.md`](./spec-portal-registro-candidato-departments-modalities-frontend.md)

La intención aquí es definir la **estructura visual y jerarquía de contenido** para la pantalla pública de oportunidades, tomando como inspiración una landing de empleos con:

- hero editorial superior,
- bloque central de búsqueda y listado,
- cierre inferior con CTA institucional y footer.

La referencia visual se usa solo para **estructura y composición**, no para replicar branding, colores ni estilo visual externo al ATS.

## Contexto

El repositorio ya cuenta con una ruta pública funcional para explorar vacantes:

```text
/oportunidades
```

Actualmente esa pantalla:

- consume el listado público desde `GET /api/vacantes`,
- conserva filtros en query params,
- muestra cards, estados de carga, vacío y error,
- y utiliza una composición más cercana a un directorio funcional que a una landing editorial.

Este spec define cómo reorganizar la experiencia para que el listado tenga una narrativa visual más clara y más cercana a una página pública de atracción de talento, sin rehacer la lógica de datos ya existente.

## Objetivos

- Redefinir la estructura de `/oportunidades` en tres bloques claros: hero, exploración y cierre institucional.
- Dar más protagonismo al mensaje principal de la página antes del listado.
- Mantener la búsqueda y los filtros como herramientas centrales de descubrimiento.
- Reutilizar la lógica existente de query params, carga de datos y paginación.
- Mantener consistencia con el branding y tono visual actuales del ATS.

## No objetivos

- Rediseño del detalle de vacante en `/oportunidades/<vacanteId>`.
- Implementación de postulación dentro de esta iteración.
- Cambios en autenticación, registro o login.
- Cambios de contrato backend para `/api/vacantes`.
- Replantear el modelo de filtros o paginación del listado.

## Ruta y archivos impactados

Ruta principal:

```text
/oportunidades
```

Base actual del frontend:

- `app/oportunidades/page.tsx`
- `components/public/PublicVacanciesPage.tsx`
- `components/public/PublicOpportunitiesNavbar.tsx`
- `lib/api/public-vacancies.ts`

## Estructura propuesta de la pantalla

### 1) Hero superior

El primer bloque debe funcionar como encabezado editorial del portal público.

Contenido esperado:

- badge o label de contexto, por ejemplo `Portal de oportunidades`,
- titular fuerte y corto,
- texto de apoyo de 1 a 3 líneas,
- CTA principal orientado a explorar vacantes,
- CTA secundario opcional hacia autenticación si el producto lo considera útil,
- métricas o highlights resumidos si aportan contexto real.

Lineamientos:

- el hero debe abrir la página con intención de marca y claridad de propósito;
- la búsqueda no tiene que vivir obligatoriamente dentro del hero;
- el hero no debe competir visualmente con el listado, sino dirigir hacia él.

### 2) Bloque principal de exploración

Debe ser el núcleo funcional de la pantalla y agrupar:

- búsqueda por texto,
- filtros,
- resumen de resultados,
- chips de filtros activos,
- grid o lista de oportunidades,
- paginación.

#### 2.1 Buscador

Debe mantenerse como control principal de descubrimiento.

Comportamiento esperado:

- enviar búsqueda usando query params,
- resetear `page` al aplicar una nueva búsqueda,
- permitir conservar y restaurar estado desde URL.

#### 2.2 Filtros

Filtros obligatorios visibles en esta iteración:

- departamento,
- modalidad.

Compatibilidad a preservar:

- `departmentId`
- `departmentCode`
- `modalityId`
- `modalityCode`
- `search`
- `page`

Compatibilidad opcional a preservar aunque no sea visible en primer plano:

- `country`
- `countryCode`

La UI puede reorganizar la presentación de filtros, por ejemplo:

- sidebar en desktop y bloque colapsable en mobile,
- o toolbar superior si el diseño final lo justifica.

La recomendación inicial para mantener continuidad con la base actual es:

- filtros laterales en desktop,
- panel colapsable en mobile,
- chips visibles encima del listado cuando haya filtros activos.

#### 2.3 Encabezado de resultados

Debe incluir:

- título del módulo de resultados,
- total de oportunidades encontradas,
- resumen legible del estado actual del listado,
- chips para remover filtros individuales.

#### 2.4 Listado de oportunidades

Las cards deben priorizar lectura rápida.

Información mínima visible por card:

- título de vacante,
- empresa,
- ubicación o país si existe,
- departamento,
- modalidad,
- resumen corto,
- CTA de detalle.

Lineamientos de contenido:

- la jerarquía debe favorecer el título y la metadata clave;
- evitar saturación de badges o bloques secundarios;
- el CTA de detalle debe ser claro y consistente.

### 3) Cierre inferior

Después del listado debe existir un bloque de salida de página con intención institucional.

Debe contemplar:

- un CTA breve orientado a contacto, registro o continuidad de exploración,
- un footer público simplificado con branding ATS.

No se busca replicar un sitio corporativo completo, pero sí cerrar la experiencia con una pieza visual más intencional que un final abrupto del grid.

## Componentes sugeridos

Nombres orientativos para una implementación posterior:

- `PublicVacanciesPage`
- `PublicOpportunitiesHero`
- `PublicOpportunitiesStats`
- `PublicOpportunitiesFilters`
- `PublicOpportunitiesResultsHeader`
- `OpportunityCard`
- `PublicOpportunitiesFooterCta`
- `PublicOpportunitiesFooter`

Puede resolverse también sin extraer todos estos componentes si el equipo prefiere una composición más compacta, pero el spec asume separación conceptual de estas zonas.

## Integración de datos

## Fuente principal

- `GET /api/vacantes`

La pantalla debe seguir consumiendo el listado público desde la integración ya existente en:

- `lib/api/public-vacancies.ts`

El frontend debe seguir interpretando al menos:

```typescript
interface OpportunityListResponse {
  items: OpportunityVacancySummary[];
  availableFilters: {
    departments: OpportunityFilterOption[];
    modalities: OpportunityFilterOption[];
  };
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
```

## Comportamientos clave

- La navegación debe seguir siendo shareable vía URL.
- Aplicar búsqueda o filtros debe limpiar `page` cuando corresponda.
- Entrar directo con query params debe reconstruir la UI correctamente.
- La paginación debe conservar filtros activos.
- El enlace al detalle debe conservar el contexto actual para facilitar el regreso al listado.
- Si el diseño visual cambia de sidebar a toolbar en alguna vista, eso no debe alterar el contrato funcional de filtros.

## Copy y naming

Lineamiento recomendado:

- usar `Oportunidades` como nombre principal de la experiencia pública,
- permitir `vacante` o `vacantes` en labels secundarios donde ya exista coherencia con API o con copy heredado.

Ejemplos válidos:

- `Portal de oportunidades`
- `Oportunidades disponibles`
- `Buscar vacantes`
- `Ver detalle`

## Estados de UX

### Loading

- skeletons para hero stats si dependen de data,
- skeleton de filtros,
- skeleton de cards,
- transición estable al cambiar búsqueda, filtro o página.

### Empty state

Cuando no existan resultados:

- mantener visible el resumen del contexto,
- conservar chips de filtros activos,
- ofrecer CTA claro para limpiar filtros,
- evitar sensación de error o pantalla rota.

Mensaje orientativo:

- `No encontramos vacantes con esos filtros.`

### Error state

Debe existir un mensaje claro con acción de reintento.

Mensaje orientativo:

- `No se pudieron cargar las oportunidades.`

Acción sugerida:

- `Intentar de nuevo`

## Responsive

### Mobile

- hero apilado,
- filtros colapsables,
- cards con metadata resumida,
- CTA y footer compactos.

### Tablet

- transición progresiva entre layout apilado y layout con separación más clara entre filtros y resultados.

### Desktop

- hero con mejor respiración visual,
- módulo principal con lectura clara entre filtros y resultados,
- cierre inferior con mayor presencia institucional.

## Accesibilidad

- mantener foco visible en buscador, filtros, chips y paginación,
- asegurar labels claros en formularios y controles de filtrado,
- no depender solo del color para representar estados activos,
- preservar semántica de encabezados y landmarks de página.

## Flujos principales

### Explorar desde el hero

```text
1. Usuario entra a /oportunidades
2. Ve hero con propuesta de valor y CTA
3. Avanza al bloque de exploración
4. Interactúa con búsqueda o filtros
5. Revisa resultados y entra al detalle de una vacante
```

### Filtrar resultados

```text
1. Usuario abre la pantalla
2. Selecciona un departamento o modalidad
3. La URL se actualiza
4. El listado se refresca
5. Los chips reflejan filtros activos
6. El usuario puede remover uno o todos
```

### Recuperar contexto desde URL

```text
1. Usuario abre una URL con query params
2. El frontend reconstruye búsqueda, filtros y página
3. El listado respeta ese estado sin interacción adicional
```

## Criterios de aceptación

- [ ] `/oportunidades` queda documentada como una experiencia compuesta por hero, exploración y cierre inferior.
- [ ] El spec deja claro que la referencia visual aplica a estructura y jerarquía, no a branding externo.
- [ ] La búsqueda y los filtros de departamento/modalidad siguen siendo parte central del flujo.
- [ ] El spec preserva el uso de query params ya soportados por el frontend actual.
- [ ] El spec deja explícito que esta iteración no cubre detalle, postulación ni autenticación.
- [ ] Se documentan loading, empty, error y responsive.
- [ ] El cierre inferior con CTA/footer queda definido como parte del alcance visual.

## Nota final

Este documento sirve como guía de alineación antes de implementar el rediseño de `/oportunidades`. La expectativa es reutilizar al máximo la lógica actual del listado y concentrar los cambios en estructura visual, jerarquía de contenido y composición responsive.
