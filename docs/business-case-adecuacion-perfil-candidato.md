# Propuesta de negocio: Adecuación inteligente de perfil a vacante (con optimización ATS)

> **Resumen:** Feature que permite a un candidato adaptar su perfil/CV a una plaza específica usando IA, con transparencia total (antes/después), checklist de cumplimiento ATS y score estimado de match — sin inventar datos. Backend y frontend ya implementados; pendiente decisión de lanzamiento y posicionamiento comercial.

| Metadato | Valor |
|----------|-------|
| **Versión** | 1.0 |
| **Fecha** | Julio 2026 |
| **Audiencia** | Dirección / Producto |
| **Estado técnico** | Implementado (backend + frontend) |
| **Repos** | `ats-backend`, `ats-frontend` |

---

## 1. Resumen ejecutivo

Los candidatos suelen aplicar a múltiples vacantes con un **mismo CV genérico**. Los ATS (Applicant Tracking Systems) y los reclutadores filtran por keywords, título, skills obligatorias, idioma, recencia y logros medibles. Un perfil bien redactado pero **mal alineado a la vacante** cae en filtros automáticos aunque el candidato sea apto.

**Propuesta:** incorporar en la plataforma una capacidad de **“Adecuar mi perfil”** que:

1. Toma el perfil actual del candidato y una vacante (de la plataforma, texto pegado o archivo).
2. Genera una **versión adaptada** optimizada para esa plaza y para filtros ATS típicos.
3. Muestra al candidato **qué cambió, por qué, y qué criterios ATS cumple o no**.
4. Permite **editar, guardar versiones, comparar y aplicar** la versión a su ficha principal.

**Diferenciador:** no es un “generador de CVs” genérico. Es tailoring **veraz** (sin inventar experiencia), integrado al scoring del ATS propio, con checklist ATS de 9 criterios fijos y trazabilidad de versiones.

---

## 2. Problema de negocio

### Para el candidato

| Dolor | Impacto |
|-------|---------|
| No sabe cómo reformular su CV para cada vacante | Menor tasa de paso en filtros ATS |
| Temor a “mentir” o exagerar con herramientas de IA | Desconfianza en soluciones de mercado |
| No entiende por qué no lo llaman | Abandono de la plataforma |

### Para el reclutador / empresa

| Dolor | Impacto |
|-------|---------|
| Perfiles genéricos difíciles de comparar con la vacante | Más tiempo de screening manual |
| CVs ilegibles para ATS (formato, keywords, estructura) | Pérdida de candidatos válidos en el embudo |
| Baja calidad de aplicaciones masivas | Ruido en el pipeline |

### Oportunidad de mercado

Herramientas externas (Jobscan, Teal, Resume Worded, etc.) cobran por optimización ATS **fuera** del flujo de aplicación. Integrar esta capacidad **dentro del ATS** reduce fricción, aumenta retención de candidatos y refuerza el valor del match score propio.

---

## 3. Solución propuesta

### Nombre de producto (sugerido)

**“Adecuar mi perfil”** / *Profile Tailoring*

### Flujo del candidato

```
Perfil actual  +  Vacante (plataforma | texto | archivo)
        ↓
   IA adapta perfil (prompt v2)
        ↓
Comparación lado a lado + checklist ATS (9 criterios)
        ↓
Edición manual opcional → Guardar versión → Aplicar a ficha principal
```

### Fuentes de vacante soportadas

| Fuente | Uso típico |
|--------|------------|
| Vacante en la plataforma | Candidato ve una plaza en el portal y la adapta |
| Texto pegado | Vacante externa (LinkedIn, email del reclutador) |
| Archivo (.pdf, .docx, .md) | Job description descargada |

### Los 9 criterios ATS (checklist fijo)

El sistema evalúa y expone al candidato un checklist con IDs estables — el frontend puede traducir y mostrar iconografía sin depender del texto de la IA:

| # | Criterio | Qué valida |
|---|----------|------------|
| 1 | Formato legible | Estructura clara, sin elementos que rompan parsers ATS |
| 2 | Keywords de la vacante | Términos técnicos de la JD en headline, summary, skills y experiencia |
| 3 | Experiencia mínima | Fuera de alcance del tailoring (knock-out del proceso) |
| 4 | Match de cargo | Headline alineado al título/seniority de la vacante |
| 5 | Skills obligatorias | Skills de la JD presentes y demostradas en experiencia |
| 6 | Educación / certificaciones | Visibilidad de requisitos legales o certificaciones |
| 7 | Idioma | Nivel de idioma explícito si la vacante lo exige |
| 8 | Experiencia reciente | Prioriza tecnologías recientes relevantes a la vacante |
| 9 | Logros medibles | Bullets orientados a impacto cuando el dato existe |

Cada ítem distingue:

- **Gap real** — falta información en el perfil (no se puede “inventar” con redacción).
- **Gap de redacción** — el dato existe pero no está bien expuesto (sí se puede mejorar).

### Principios no negociables

> **Importante:** La IA **no inventa** empleadores, títulos, fechas, skills ni métricas. Si el dato no está en el perfil original, se reporta como gap real. Esto es clave para confianza del candidato y cumplimiento ético.

---

## 4. Valor de negocio

### Para candidatos

- **Mayor probabilidad de pasar filtros ATS** sin recurrir a herramientas externas.
- **Transparencia:** ven exactamente qué cambió y por qué.
- **Control:** pueden editar antes de aplicar; historial de versiones por vacante.
- **Score estimado** del perfil adaptado vs la vacante (cuando la vacante es de la plataforma).

### Para reclutadores / RRHH

- Candidatos que aplican con perfiles **más alineados** a la vacante.
- Menos ruido en screening: keywords y estructura ya optimizadas.
- El match score del ATS refleja mejor la candidatura cuando el perfil fue adaptado.

### Para el negocio (plataforma ATS)

| Beneficio | Descripción |
|-----------|-------------|
| **Diferenciación** | Feature poco común en ATS latinoamericanos integrada end-to-end |
| **Retención** | El candidato vuelve a la plataforma para adaptar, no sale a Jobscan/Teal |
| **Upsell potencial** | Límite diario configurable (hoy: 10 adaptaciones/día por candidato) como palanca freemium/premium |
| **Datos** | Versiones guardadas = señal de intención (vacantes de interés real) |
| **Marca responsable** | Disclosure de IA + regla de veracidad = posicionamiento ético |

---

## 5. Estado de implementación

### Backend (`ats-backend`) — Completo

| Componente | Estado |
|------------|--------|
| API `POST /api/candidate/profile/tailor-to-vacancy` | ✅ |
| CRUD de versiones (listar, detalle, promover, editar, eliminar) | ✅ |
| Prompt v2 con checklist ATS de 9 criterios | ✅ |
| Normalización server-side del checklist (no confía 100% en LLM) | ✅ |
| Persistencia `CandidateProfileVersion` + migración EF | ✅ |
| Rate limit diario configurable | ✅ |
| Tests unitarios + integración | ✅ |
| Documentación API | ✅ `docs/candidate-profile-tailoring-api.md` |

### Frontend (`ats-frontend`) — Completo

| Componente | Estado |
|------------|--------|
| Pantalla “Adecuar mi perfil” | ✅ |
| Entrada de vacante: archivo, texto, picker de vacante | ✅ |
| Comparación lado a lado (antes / después) | ✅ |
| Dashboard: score ring, barras por categoría, highlights de cambios | ✅ |
| Checklist ATS visual + comparación por criterio | ✅ |
| Editor del perfil adaptado antes de guardar/aplicar | ✅ |
| Historial de versiones | ✅ |
| i18n (es, en, de, fr, it) | ✅ |
| Disclosure de uso de IA | ✅ |

**Conclusión técnica:** la feature está lista para **piloto o lanzamiento controlado**. No requiere desarrollo adicional para un MVP funcional.

---

## 6. Experiencia de usuario (resumen)

1. El candidato entra a **“Adecuar mi perfil”** desde el portal.
2. Elige cómo indicar la vacante (archivo, texto o vacante del sistema).
3. La IA procesa (~55 s típicos) y muestra:
   - Perfil original vs adaptado (split view).
   - Resumen de adaptación en lenguaje natural.
   - Lista de cambios campo a campo (`changeHighlights`).
   - Checklist ATS con estados: Cumple / Parcial / Falta / No aplica.
   - Score estimado de match (si hay `vacancyId`).
4. El candidato puede **editar** el perfil adaptado.
5. **Guardar versión** (hasta 20 por candidato) o **aplicar** a su ficha principal.

---

## 7. Métricas de éxito sugeridas

| KPI | Objetivo (piloto 90 días) | Cómo medirlo |
|-----|---------------------------|--------------|
| Adopción | ≥ 15% de candidatos activos usan tailoring al menos 1 vez | Eventos `tailor-to-vacancy` / MAU candidatos |
| Conversión post-tailoring | +10% aplicaciones a vacantes tras adaptar | Funnel: tailor → apply |
| Match score medio | +5–15 pts en score del perfil adaptado vs original | `estimatedMatchScore` en respuesta API |
| Retención | Menor churn de candidatos que usaron la feature | Cohortes con/sin tailoring |
| Satisfacción | NPS ≥ 40 en encuesta post-adaptación | Micro-encuesta en UI |
| Criterios ATS “Cumple” | ≥ 6/9 criterios en promedio tras adaptación | Agregado de `atsComplianceChecklist` |

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación implementada |
|--------|-------------------------|
| IA inventa datos falsos | Prompt con regla de veracidad + no se persiste perfil si el JSON es inválido (422) |
| Checklist ATS inconsistente | Catálogo fijo de 9 IDs en backend; normalizador sobrescribe labels y orden |
| Costo de inferencia (Vertex/Gemini) | Rate limit diario (default 10/día); configurable en `SystemSettings` |
| Expectativas irreales del candidato | Disclosure de IA; gaps reales vs de redacción claramente diferenciados |
| Dependencia de proveedor LLM | Respuesta 429 manejada; arquitectura con adapter intercambiable |
| Responsabilidad legal / ética | No se promete empleo; se optimiza presentación, no credenciales |

---

## 9. Modelo comercial (opciones)

> **Nota:** Definir con Dirección según estrategia de monetización actual.

| Modelo | Descripción |
|--------|-------------|
| **Incluido en plan base** | Diferenciador de producto; límite bajo (ej. 3/día) |
| **Freemium** | Gratis: 1 adaptación/semana; Premium: ilimitado o 10/día |
| **Por empresa** | RRHH habilita la feature para sus vacantes como valor agregado al employer branding |
| **Add-on B2B** | Paquete “Optimización ATS para candidatos” cobrado a la empresa cliente |

---

## 10. Recomendación

### Lanzar en fases

| Fase | Alcance | Duración sugerida |
|------|---------|-------------------|
| **Piloto interno** | Equipo + 20–50 candidatos reales | 2 semanas |
| **Beta cerrada** | 1–2 clientes empresa con vacantes activas | 4–6 semanas |
| **GA (General Availability)** | Todos los candidatos del portal | Tras validar KPIs |

### Acciones inmediatas para decisión

- [ ] Aprobar posicionamiento comercial (incluido vs premium).
- [ ] Definir límite diario en producción (`ProfileTailoringPerDay`).
- [ ] Comunicación a RRHH: qué esperar de candidatos que usen la feature.
- [ ] Piloto con métricas de la sección 7.
- [ ] Material de marketing: “Adapta tu CV a cada vacante sin mentir”.

---

## 11. Comparativa con alternativas externas

| Capacidad | Jobscan / similares | Nuestra plataforma |
|-----------|---------------------|-------------------|
| Optimización ATS | ✅ | ✅ |
| Integrado al apply flow | ❌ | ✅ |
| Match score propio post-adaptación | ❌ | ✅ |
| Versiones por vacante | Limitado | ✅ (hasta 20) |
| Checklist ATS con gaps reales vs redacción | Parcial | ✅ |
| Regla de no inventar datos | Variable | ✅ (diseño explícito) |
| Vacante desde la plataforma | ❌ | ✅ |
| Costo adicional para candidato | Suscripción | Configurable / incluido |

---

## 12. Anexos técnicos (referencia)

- Backend API: `ats-backend/docs/candidate-profile-tailoring-api.md`
- Spec ATS compliance: `ats-backend/docs/candidate-profile-ats-compliance-spec.md`
- Frontend API mirror: `ats-frontend/docs/candidate-profile-tailoring-api.md`
- ROADMAP: Phase 7 + 7.1 en `.agents/ROADMAP.md`

---

## 13. Decisión solicitada

Se solicita aprobación para:

1. **Lanzar piloto** de “Adecuar mi perfil” con candidatos reales.
2. **Definir modelo comercial** (incluido en plan base vs freemium).
3. **Comunicar** la feature a clientes empresa como valor diferencial del ATS.

---

*Documento generado a partir del estado actual de los repositorios `ats-backend` y `ats-frontend`. Revisar con Producto y Dirección antes de distribución externa.*
