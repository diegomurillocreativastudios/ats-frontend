# Módulo global de ubicaciones (GeoNames)

Catálogo de países, divisiones administrativas (ADM1–ADM3) y ciudades importado desde [GeoNames](https://www.geonames.org/) en **ats-backend**, consumido por **ats-frontend** vía API paginada (sin cargar el dataset completo en el navegador).

## Nombres

Cada fila guarda:

| Campo | Origen |
|--------|--------|
| `nameOriginal` | Nombre principal del dump |
| `nameAscii` | Variante ASCII del dump |
| `nameEs` | `alternateNamesV2.txt` con `isolanguage = es` (preferido si `isPreferredName = 1`) |

**Etiqueta mostrada (`names.display`):** `nameEs` → `nameAscii` → `nameOriginal`.

## Tablas (PostgreSQL / EF Core)

| Tabla | Entidad |
|--------|---------|
| `LocationCountries` | `LocationCountry` (PK: `GeonameId`) |
| `LocationAdministrativeDivisions` | `LocationAdministrativeDivision` (ADM1–ADM3, jerarquía por `ParentGeonameId`) |
| `LocationCities` | `LocationCity` (enlace opcional a ADM1/2/3) |

Migración: `AddGeoNamesLocationCatalog`.

## Importación (Admin)

1. Descargar dumps según `ats-backend/data/geonames/README.md`.
2. Ejecutar:

```http
POST /api/admin/locations/import
Authorization: Bearer <admin>
Content-Type: application/json

{
  "replaceExisting": true,
  "importCities": true,
  "importAdminLevel3": false
}
```

Configuración: `GeoNames:DataDirectory` en `appsettings.json` (default `data/geonames`).

## API REST (públicas, sin auth)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/locations/status` | `{ hasData: boolean }` |
| `GET` | `/api/locations/countries?search=&page=&pageSize=` | Países paginados |
| `GET` | `/api/locations/countries/{iso2}/divisions?level=1\|2\|3&parentGeonameId=&search=&page=&pageSize=` | Divisiones administrativas |
| `GET` | `/api/locations/countries/{iso2}/cities?adminDivisionGeonameId=&adminLevel=&search=&page=&pageSize=` | Ciudades |

`pageSize` máximo: **100**.

## DTO de respuesta (JSON camelCase)

```json
{
  "items": [
    {
      "geonameId": 3996063,
      "iso2": "MX",
      "iso3": "MEX",
      "names": {
        "original": "Mexico",
        "ascii": "Mexico",
        "es": "México",
        "display": "México"
      }
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 250,
  "totalPages": 5
}
```

División administrativa:

```json
{
  "geonameId": 3523272,
  "countryIso2": "MX",
  "adminLevel": 1,
  "adminCode": "MX.09",
  "shortCode": "09",
  "parentGeonameId": null,
  "names": { "original": "...", "ascii": "...", "es": "...", "display": "..." }
}
```

## Frontend

- Tipos: `lib/locations/types.ts`
- Cliente: `lib/api/locations.ts`
- `VacancyLocationFields` usa GeoNames si `GET /api/locations/status` devuelve `hasData: true`; si no, fallback a `@countrystatecity/countries-browser`.

## Vacantes existentes

`Vacancy.StateCode` sigue siendo un código alfanumérico corto (máx. 10). Con GeoNames, el picker guarda `shortCode` de ADM1 (p. ej. `09` para `MX.09`). Puede no coincidir con códigos ISO de datasets anteriores; conviene re-seleccionar ubicación al migrar.
