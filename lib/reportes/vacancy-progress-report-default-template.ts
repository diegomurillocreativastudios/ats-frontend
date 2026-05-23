/**
 * Default HTML template for `vacancy-progress-by-client`.
 *
 * Interpolation rules:
 * - The template engine only supports `{{path}}` (HTML-escaped) and
 *   `{{{path}}}` (raw HTML). It does NOT process `{{#if}}` or `{{#each}}`.
 * - All dynamic rows/cards/highlights are pre-rendered to HTML in
 *   `buildVacancyProgressReportTemplateContext` and injected here as raw
 *   strings via `{{{...}}}`.
 *
 * Layout strategy:
 * - The PDF is rendered server-side with PDFKit v2 (`vacancy-progress-full-v2`).
 * - `@page` defines real print margins on every page (header + continuations).
 * - Sections 5 (Detalle por vacante) and 6 (Tabla técnica) start on a new page via
 *   `break-before: page`. Vacancy cards keep together with `break-inside: avoid`.
 * - Table headers repeat across pages via `<thead>` + `display: table-header-group`.
 */
export const VACANCY_PROGRESS_REPORT_DEFAULT_TEMPLATE = `<style>
  @page {
    size: Letter;
    margin: 14mm 12mm 16mm 12mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
    line-height: 1.42;
  }

  .report-page {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
    background: #ffffff;
  }

  /* ─────────── Header ─────────── */

  .report-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 215px;
    gap: 22px;
    align-items: start;
    padding-top: 4px;
    padding-bottom: 16px;
    border-bottom: 1.5px solid #d1d5db;
    margin-bottom: 18px;
  }

  .report-header-left {
    min-width: 0;
  }

  .report-kicker {
    margin: 0 0 6px;
    font-size: 7.8pt;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #6b7280;
  }

  .report-title {
    margin: 0 0 8px;
    font-size: 21pt;
    line-height: 1.08;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.4px;
    overflow-wrap: anywhere;
  }

  .report-description {
    margin: 0;
    max-width: 640px;
    font-size: 9.2pt;
    line-height: 1.5;
    color: #4b5563;
    text-align: justify;
  }

  .report-meta {
    border: 1px solid #e5e7eb;
    border-radius: 9px;
    padding: 12px 14px;
    background: #f9fafb;
  }

  .report-meta-row {
    margin-bottom: 9px;
  }

  .report-meta-row:last-child {
    margin-bottom: 0;
  }

  .report-meta-label {
    display: block;
    font-size: 7.4pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 3px;
  }

  .report-meta-value {
    display: block;
    font-size: 9.2pt;
    font-weight: 700;
    color: #111827;
    overflow-wrap: anywhere;
  }

  /* ─────────── Sections ─────────── */

  .section {
    margin-top: 0;
    margin-bottom: 20px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section-title {
    margin: 0 0 11px;
    padding-bottom: 7px;
    border-bottom: 2px solid #111827;
    font-size: 12.5pt;
    line-height: 1.1;
    font-weight: 800;
    color: #111827;
    letter-spacing: 0.2px;
    break-after: avoid;
    page-break-after: avoid;
  }

  .section-note {
    margin: 0 0 10px;
    font-size: 8.6pt;
    line-height: 1.5;
    color: #4b5563;
    text-align: justify;
  }

  /* ─────────── Executive summary KPIs ─────────── */

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 9px;
  }

  .summary-card {
    border: 1px solid #e5e7eb;
    border-radius: 9px;
    padding: 11px 12px;
    background: #ffffff;
    min-height: 64px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .summary-card.secondary {
    background: #f9fafb;
  }

  .summary-label {
    font-size: 7.4pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .summary-value {
    font-size: 16.5pt;
    line-height: 1.05;
    font-weight: 800;
    color: #111827;
  }

  .summary-help {
    margin-top: 4px;
    font-size: 7.8pt;
    line-height: 1.3;
    color: #6b7280;
  }

  /* ─────────── Highlights ─────────── */

  .insights-box {
    border: 1px solid #d1d5db;
    border-radius: 9px;
    padding: 12px 16px 12px 16px;
    background: #f9fafb;
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 12px;
  }

  .insights-box ul {
    margin: 0;
    padding-left: 20px;
  }

  .insights-box li {
    margin: 4px 0;
    font-size: 9pt;
    line-height: 1.5;
    color: #374151;
    text-align: justify;
  }

  .top-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .top-card {
    border: 1px solid #e5e7eb;
    border-radius: 9px;
    padding: 10px 12px;
    background: #ffffff;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .top-card-title {
    font-size: 7.4pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 5px;
  }

  .top-vacancy-label {
    display: block;
    font-size: 9pt;
    line-height: 1.3;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
    overflow-wrap: anywhere;
  }

  .top-vacancy-metric {
    display: inline-block;
    font-size: 9.5pt;
    font-weight: 800;
    color: #111827;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    padding: 2px 10px;
  }

  /* ─────────── Tables ─────────── */

  .table-wrapper {
    width: 100%;
    overflow: visible;
    margin-top: 4px;
  }

  .report-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 8.3pt;
  }

  .report-table thead {
    display: table-header-group;
  }

  .report-table tfoot {
    display: table-footer-group;
  }

  .report-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .report-table th {
    background: #111827;
    color: #ffffff;
    text-align: left;
    font-weight: 700;
    font-size: 7.6pt;
    letter-spacing: 0.04em;
    padding: 8px 9px;
    border: 1px solid #374151;
  }

  .report-table td {
    padding: 8px 9px;
    border: 1px solid #e5e7eb;
    color: #374151;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: normal;
    line-height: 1.4;
  }

  .report-table tbody tr:nth-child(even) td {
    background: #f9fafb;
  }

  .center {
    text-align: center;
  }

  .muted {
    color: #6b7280;
  }

  /* ─────────── Section 5: Vacancy detail cards ─────────── */

  .vacancy-details-section {
    break-before: page;
    page-break-before: always;
  }

  .vacancy-card {
    border: 1px solid #d1d5db;
    border-radius: 10px;
    background: #ffffff;
    padding: 13px 15px;
    margin-bottom: 14px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .vacancy-card:last-child {
    margin-bottom: 0;
  }

  .vacancy-card-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: start;
    margin-bottom: 11px;
  }

  .vacancy-title {
    margin: 0 0 4px;
    font-size: 12pt;
    line-height: 1.18;
    font-weight: 800;
    color: #111827;
    overflow-wrap: anywhere;
  }

  .vacancy-subtitle {
    margin: 0;
    font-size: 8.5pt;
    line-height: 1.35;
    color: #4b5563;
    overflow-wrap: anywhere;
  }

  .vacancy-status {
    font-size: 8.2pt;
    color: #374151;
    white-space: nowrap;
    text-align: right;
    padding-top: 3px;
  }

  .vacancy-status strong {
    font-weight: 800;
    color: #111827;
  }

  .vacancy-info-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    overflow: hidden;
    margin-bottom: 10px;
    background: #ffffff;
  }

  .vacancy-info-item {
    padding: 8px 10px;
    border-right: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    min-height: 38px;
  }

  .vacancy-info-item:nth-child(4n) {
    border-right: 0;
  }

  .vacancy-info-item:nth-last-child(-n + 4) {
    border-bottom: 0;
  }

  .info-label {
    display: block;
    font-size: 6.9pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 3px;
  }

  .info-value {
    display: block;
    font-size: 8.6pt;
    font-weight: 700;
    color: #111827;
    overflow-wrap: anywhere;
    line-height: 1.3;
  }

  .vacancy-metrics-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 7px;
    margin-bottom: 11px;
  }

  .metric-mini-card {
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    padding: 8px 6px;
    text-align: center;
    background: #ffffff;
  }

  .metric-mini-label {
    font-size: 6.6pt;
    font-weight: 800;
    letter-spacing: 0.06em;
    line-height: 1.2;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .metric-mini-value {
    font-size: 13pt;
    line-height: 1.05;
    font-weight: 800;
    color: #111827;
  }

  .ai-score-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    margin-bottom: 11px;
  }

  .ai-score-cell {
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    padding: 7px 9px;
    background: #f9fafb;
  }

  .ai-score-label {
    display: block;
    font-size: 6.6pt;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 3px;
  }

  .ai-score-value {
    display: block;
    font-size: 10.5pt;
    line-height: 1.1;
    font-weight: 800;
    color: #111827;
  }

  .progress-row {
    margin-bottom: 10px;
  }

  .progress-row:last-child {
    margin-bottom: 0;
  }

  .progress-label {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 8pt;
    font-weight: 700;
    color: #374151;
    margin-bottom: 5px;
  }

  .progress-track {
    width: 100%;
    height: 7px;
    background: #e5e7eb;
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #111827;
    border-radius: 999px;
  }

  .pipeline-stages {
    margin-top: 6px;
  }

  .pipeline-stages-title {
    font-size: 7.2pt;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 6px;
  }

  .pipeline-stages-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .stage-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #d1d5db;
    border-radius: 999px;
    padding: 3px 9px;
    background: #ffffff;
    font-size: 7.8pt;
    color: #374151;
  }

  .stage-pill-name {
    font-weight: 600;
  }

  .stage-pill-count {
    font-weight: 800;
    color: #111827;
  }

  .stage-empty {
    font-size: 8pt;
    color: #6b7280;
  }

  /* ─────────── Section 6: Technical table ─────────── */

  .technical-table-section {
    break-before: page;
    page-break-before: always;
  }

  .no-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }
</style>

<main class="report-page">
  <header class="report-header">
    <div class="report-header-left">
      <p class="report-kicker">Reporte de reclutamiento</p>
      <h1 class="report-title">Estado de vacantes y candidatos</h1>
      <p class="report-description">
        Resumen informativo del estado actual de las vacantes, candidatos asociados, avance del proceso,
        etapas del pipeline, métricas de contratación y resultados del análisis preliminar generado por
        inteligencia artificial.
      </p>
    </div>

    <aside class="report-meta">
      <div class="report-meta-row">
        <span class="report-meta-label">Fecha de generación</span>
        <span class="report-meta-value">{{generatedAt}}</span>
      </div>
      <div class="report-meta-row">
        <span class="report-meta-label">Periodo</span>
        <span class="report-meta-value">{{periodLabel}}</span>
      </div>
      <div class="report-meta-row">
        <span class="report-meta-label">Total de registros</span>
        <span class="report-meta-value">{{totalCount}}</span>
      </div>
    </aside>
  </header>

  <section class="section">
    <h2 class="section-title">1. Resumen ejecutivo</h2>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Vacantes</div>
        <div class="summary-value">{{totalVacancies}}</div>
        <div class="summary-help">{{openVacancies}} abiertas</div>
      </div>

      <div class="summary-card">
        <div class="summary-label">Clientes</div>
        <div class="summary-value">{{totalClients}}</div>
        <div class="summary-help">Con vacantes registradas</div>
      </div>

      <div class="summary-card">
        <div class="summary-label">Candidatos</div>
        <div class="summary-value">{{totalCandidates}}</div>
        <div class="summary-help">{{vacanciesWithCandidates}} vacantes con candidatos</div>
      </div>

      <div class="summary-card">
        <div class="summary-label">Score IA promedio</div>
        <div class="summary-value">{{averageAiScore}}</div>
        <div class="summary-help">{{candidatesWithAiAnalysis}} con análisis IA</div>
      </div>

      <div class="summary-card secondary">
        <div class="summary-label">En entrevista</div>
        <div class="summary-value">{{totalInInterview}}</div>
      </div>

      <div class="summary-card secondary">
        <div class="summary-label">Finalistas</div>
        <div class="summary-value">{{totalFinalists}}</div>
      </div>

      <div class="summary-card secondary">
        <div class="summary-label">Contratados</div>
        <div class="summary-value">{{totalHired}}</div>
      </div>

      <div class="summary-card secondary">
        <div class="summary-label">Vacantes sin candidatos</div>
        <div class="summary-value">{{vacanciesWithoutCandidates}}</div>
      </div>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">2. Hallazgos principales</h2>

    <div class="insights-box">
      <ul>
        {{{insightsHtml}}}
      </ul>
    </div>

    <div class="top-grid">
      <div class="top-card">
        <div class="top-card-title">Vacante con mayor avance</div>
        {{{topProgressVacancy}}}
      </div>
      <div class="top-card">
        <div class="top-card-title">Mejor match IA</div>
        {{{topAiScoreVacancy}}}
      </div>
      <div class="top-card">
        <div class="top-card-title">Más candidatos</div>
        {{{topCandidatesVacancy}}}
      </div>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">3. Distribución por cliente</h2>

    <div class="table-wrapper">
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 34%;">Cliente</th>
            <th style="width: 16.5%;" class="center">Vacantes</th>
            <th style="width: 16.5%;" class="center">Candidatos</th>
            <th style="width: 16.5%;" class="center">Con análisis IA</th>
            <th style="width: 16.5%;" class="center">Contratados</th>
          </tr>
        </thead>
        <tbody>
          {{{clientDistributionRows}}}
        </tbody>
      </table>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">4. Índice general de vacantes</h2>

    <div class="table-wrapper">
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 20%;">Cliente</th>
            <th style="width: 22%;">Vacante</th>
            <th style="width: 10%;" class="center">Estado</th>
            <th style="width: 12%;" class="center">Apertura</th>
            <th style="width: 12%;" class="center">Avance</th>
            <th style="width: 12%;" class="center">Score IA</th>
            <th style="width: 12%;" class="center">Candidatos</th>
          </tr>
        </thead>
        <tbody>
          {{{vacancyIndexRows}}}
        </tbody>
      </table>
    </div>
  </section>

  <section class="section vacancy-details-section">
    <h2 class="section-title">5. Detalle completo por vacante</h2>
    {{{vacancyDetailCards}}}
  </section>

  <section class="section technical-table-section">
    <h2 class="section-title">6. Tabla técnica completa</h2>

    <p class="section-note">
      Esta tabla conserva los campos operativos principales para auditoría y revisión rápida. El detalle extendido
      de IDs, etapas, scores y métricas se encuentra en la sección anterior por cada vacante.
    </p>

    <div class="table-wrapper">
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 16%;">Cliente</th>
            <th style="width: 17%;">Vacante</th>
            <th style="width: 8%;" class="center">Estado</th>
            <th style="width: 10%;" class="center">Apertura</th>
            <th style="width: 10%;" class="center">Cierre</th>
            <th style="width: 6.5%;" class="center">Cand.</th>
            <th style="width: 6.5%;" class="center">Ent.</th>
            <th style="width: 6.5%;" class="center">Final.</th>
            <th style="width: 6.5%;" class="center">Cont.</th>
            <th style="width: 6.5%;" class="center">Avance</th>
            <th style="width: 6.5%;" class="center">Score</th>
          </tr>
        </thead>
        <tbody>
          {{{technicalRows}}}
        </tbody>
      </table>
    </div>
  </section>
</main>`
