# ATS Frontend Testing Plan

This document outlines the systematic approach to achieve 100% functional test coverage for the ATS (Applicant Tracking System) frontend, ensuring reliability across all user roles and devices.

## 1. Core Objectives
- **Zero Regressions**: Ensure core features (Login, Vacancy Creation, Application) never break.
- **Cross-Device Reliability**: Verify UX on Mobile and Desktop.
- **Error Resilience**: Gracefully handle API failures and edge cases.

---

## 2. Test Coverage Gaps & Priority

### Phase 1: Authentication & Navigation (CRITICAL)
| Feature | Test Type | Scenario |
| :--- | :--- | :--- |
| **Login flow** | E2E | Success with `admin`, failure with invalid pass. |
| **Auth Guards** | Unit/E2E | Ensure `/portal-rrhh` redirects to login if unauthenticated. |
| **Logout** | E2E | Verify session cleanup and redirect to landing. |
| **Registration** | E2E | Complete recruiter registration flow. |

### Phase 2: Vacancy Management
| Feature | Test Type | Scenario |
| :--- | :--- | :--- |
| **Vacancy CRUD** | E2E | Create, Edit, and Close a vacancy. |
| **Validation** | Unit | Check form constraints (dates, required fields). |
| **Filtering** | Unit | Verify search bar and status filters in the list. |

### Phase 3: Candidate Pipeline & Polymorphism
| Feature | Test Type | Scenario |
| :--- | :--- | :--- |
| **CV Extraction** | E2E | Mock API to simulate CV upload and field extraction. |
| **Polymorphic Templates** | Unit/E2E | **(COMPLETED)** Detailed fields for Notification, Document, Questionnaire. |
| **Stage Movement** | E2E | Drag or move candidate between stages (Drag & Drop testing). |

### Phase 4: Error Handling & Resilience
| Feature | Test Type | Scenario |
| :--- | :--- | :--- |
| **API Down** | E2E | Mock 500 errors and verify "Friendly error messages". |
| **Network Latency** | E2E | Test "Loading" states and skeleton screens. |

---

## 3. Automation Lifecycle (Standardized)

The project implements a **Single-Command E2E Lifecycle** to guarantee clean states:

- **Command**: `npm run test:e2e:full`
- **Isolation**: Uses a dedicated `MatchEngine_E2E` database (via `appsettings.Testing.json`).
- **Flow**: `Drop DB` -> `Create/Migrate DB` -> `Start API` -> `Start UI` -> `Run Playwright` -> `Auto-Shutdown`.
- **Cleanup**: All background processes (node, dotnet) are forcefully terminated on completion (pass or fail).

---

## 4. CI/CD Readiness (GitHub Actions)

The project is configured for automated testing in the cloud:

- **Orchestrator**: `tests/e2e/run-e2e-full.sh` (Linux-compatible shell script).
- **Workflow**: `.github/workflows/e2e.yml`.
- **Strategy**: 
    - Checks out both `frontend` and `engine` as siblings.
    - Uses a `pgvector/pgvector` service container for the database.
    - Automatically uploads Playwright reports as artifacts on failure.

---

## 5. Tooling Strategy

### [Vitest](https://vitest.dev/) (Unit & Component Testing)
- **Target**: `components/`, `lib/`, `hooks/`.
- **Mocking**: Use `vi.mock` for `apiClient` to avoid real network calls.
- **Execution**: `npm run test` (Vitest no incluye `tests/e2e`).

### [Playwright](https://playwright.dev/) (End-to-End Testing)
- **Target**: `app/` (page flows); helpers en `tests/e2e/helpers/`.
- **Execution**: `npm run test:e2e` (ver **README**: `PLAYWRIGHT_SKIP_WEBSERVER`, `PLAYWRIGHT_BASE_URL`, UI mode).
- **Locators**: `data-testid` en login (`auth-login-*`); preferir roles y labels según reglas del proyecto.
- **Entorno**: Los flujos con login requieren API (`NEXT_PUBLIC_API_URL`) y backend accesible, salvo tests que solo validan UI.

---

## 4. Maintenance
Tests should be updated in the following scenarios:
1.  **New API Endpoints**: Update mocks in unit tests.
2.  **UI Redesigns**: Check if `aria-label` or `testid` need adjustment.
3.  **Bug Fixes**: Always add a regression test for every bug identified.

---
*Created on 2026-03-17*
