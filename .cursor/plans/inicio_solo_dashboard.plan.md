---
name: Inicio solo dashboard
overview: El Inicio RRHH solo llama GET /api/recruiter/dashboard; se eliminan vacancies y vacancy-progress del mount.
todos:
  - id: remove-vacancy-hook
    content: Quitar useRecruiterVacancyDashboard y buildActiveVacanciesMetric basado en snapshot
    status: pending
  - id: panel-dashboard-only
    content: Simplificar DashboardVacanciesPanel (solo activeVacancies + reminders)
    status: pending
  - id: tests-verify
    content: Test Vitest de mount sin vacancies/progress + lint/test verdes
    status: pending
isProject: true
---

# Inicio RRHH: solo endpoint dashboard

## En una frase
Al abrir `/portal-rrhh`, el front solo pide `GET /api/recruiter/dashboard` y deja de pedir vacancies (~5–10 s).

## Lo que ya funciona
- `useRecruiterDashboard` ya trae métricas y reminders de vacantes.
- El bloque de candidatos del Inicio ya usa solo ese endpoint.
- El backend del dashboard ya responde en decenas/centenas de ms.

## Los 2 problemas
1. El Inicio monta `useRecruiterVacancyDashboard`, que carga vacancies (páginas de 100) y `vacancy-progress-by-client`.
2. Eso alimenta tarjetas extra y “Vacantes que necesitan atención”, no aggregates del dashboard.

## Qué hay que hacer
1. En `RecruiterDashboard`: eliminar `useRecruiterVacancyDashboard` y `buildActiveVacanciesMetric` basado en snapshot. Usar el metric `activeVacancies` de `data.metrics` del dashboard (con el mismo `href` a vacantes activas).
2. Simplificar `DashboardVacanciesPanel`:
   - Props: `activeMetric` (o metrics), `isLoading`/`error` del dashboard, `actionableReminders` / `unavailableReminders` de vacantes.
   - Quitar props `snapshot`, `onRetry` de vacancies, estados de carga/error del snapshot.
   - **Quitar** las 3 count cards (`withoutApplications` / overdue / unpublished) y **`VacancyAttentionList`**.
   - **Dejar** la tarjeta `activeVacancies` + listas de reminders de vacantes (CTA a recordatorios / listados al navegar).
3. Refresh del Inicio: solo `reload()` del dashboard.
4. Test Vitest: al montar el home (o el panel), mockear fetch y assert que se llama dashboard y **no** se llama a `/api/recruiter/vacancies` ni a progress-by-client.
5. `npm test` (y lint si aplica).

## Criterio de hecho
- Network en `/portal-rrhh`: no aparece `recruiter/vacancies` ni `vacancy-progress` en el load inicial (sí puede aparecer auth/session y dashboard).
- UI de vacantes en Inicio: 1 métrica activa + reminders; sin lista de atención por vacante ni las 3 count cards del snapshot.
- Página `/portal-rrhh/vacantes` intacta.

## Fuera de alcance
- Optimizar el endpoint vacancies en backend (`ats-backend`).
- Enrichment del DTO dashboard con items de atención.
- Cambiar rutas de detalle de recordatorios.

## Anexo: referencias técnicas
- Origen: plan acordado en sesión con `ats-backend` (cuello de botella era vacancies en el Inicio).
- [`components/rrhh/dashboard/recruiter-dashboard.tsx`](components/rrhh/dashboard/recruiter-dashboard.tsx) — quitar segundo hook; `activeVacancies` desde `data.metrics`
- [`components/rrhh/dashboard/dashboard-vacancies-panel.tsx`](components/rrhh/dashboard/dashboard-vacancies-panel.tsx) — quitar `COUNT_CARDS`, `VacancyAttentionList`, deps de `VacancyDashboardSnapshot`
- [`hooks/use-recruiter-vacancy-dashboard.ts`](hooks/use-recruiter-vacancy-dashboard.ts) / [`lib/rrhh/load-vacancy-list-views.ts`](lib/rrhh/load-vacancy-list-views.ts) — sin uso en Inicio; no borrar (otras vistas)
- Tests: `vitest` (`npm test`); patrón Testing Library ya en el proyecto
- Decisión UX: se acepta perder lista de atención y count cards del snapshot en el Inicio a cambio de una sola llamada rápida
