# Deploy ATS Frontend to Google Cloud Platform

Guía para desplegar este frontend Next.js (App Router) en **Cloud Run** usando **Artifact Registry**, **Cloud Build** y **gcloud CLI**.

| Item | Valor |
|---|---|
| Framework | Next.js 16 (App Router) + `output: "standalone"` |
| Package manager | npm |
| Región | `us-west2` |
| Puerto | `8080` |
| Memoria / CPU | `1Gi` / `1` |
| Concurrency | `80` |
| Max instances | `10` |
| Auth Cloud Run | `--allow-unauthenticated` (la app gestiona sesión con cookies) |
| Servicios | `ats-frontend-staging`, `ats-frontend-production` |

Archivos de despliegue en este repo:

- `Dockerfile`
- `.dockerignore`
- `cloudbuild.yaml`
- `scripts/deploy-gcp.sh`
- `next.config.mjs` (`output: "standalone"`)

---

## 0. Prerrequisitos

- [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) instalado
- Cuenta con permisos de Owner o roles equivalentes (Cloud Run Admin, Artifact Registry Admin, Cloud Build Editor, Service Account User)
- Proyecto GCP creado
- Facturación habilitada en el proyecto

---

## 1. Autenticar gcloud

```bash
gcloud auth login
gcloud auth application-default login
```

---

## 2. Seleccionar proyecto

```bash
# Listar proyectos
gcloud projects list

# Elegir proyecto (reemplaza YOUR_PROJECT_ID)
export GCP_PROJECT_ID=YOUR_PROJECT_ID
gcloud config set project "$GCP_PROJECT_ID"
```

---

## 3. Habilitar APIs necesarias

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  --project="$GCP_PROJECT_ID"
```

---

## 4. Crear Artifact Registry (si no existe)

El script `deploy-gcp.sh` lo crea automáticamente. Manualmente:

```bash
export GCP_REGION=us-west2
export AR_REPO=ats-frontend

gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="ATS frontend Docker images" \
  --project="$GCP_PROJECT_ID"
```

Configurar Docker para Artifact Registry (útil si construyes localmente):

```bash
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev"
```

---

## 5. Permisos de Cloud Build → Cloud Run

La service account de Cloud Build necesita poder desplegar en Cloud Run:

```bash
PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.writer"
```

---

## 6. Variables de entorno (sin secretos en el repo)

### Variables usadas por la app

| Variable | Cuándo | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Build + runtime** | URL pública del backend (sin `/` final). Se incrusta en el bundle del cliente. |
| `NEXT_PUBLIC_APP_URL` | **Build + runtime** | URL pública del frontend (Cloud Run / dominio custom). |
| `NEXT_PUBLIC_COMPANY_NAME` | **Build + runtime** | Nombre de la empresa en el formulario de autorización y consentimiento. Si falta, se usa `Applican Tree`. |
| `API_URL` | Runtime (server) | Base URL del backend vista desde Node (Route Handlers). Si no se define, se usa `NEXT_PUBLIC_API_URL`. |
| `BACKEND_URL` | Runtime (server) | Alternativa a `API_URL`. |
| `NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL` | Build (opcional) | Redirect OAuth Calendar éxito. |
| `NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL` | Build (opcional) | Redirect OAuth Calendar error. |

> **Importante:** las variables `NEXT_PUBLIC_*` se embeben en el build de Next.js. Si cambias la URL del API o del app, debes **reconstruir y redesplegar** la imagen, no basta con actualizar solo env vars en Cloud Run.

No hay secretos de API keys en el frontend de este repo. Si en el futuro agregas secretos server-side, usa Secret Manager (sección 10).

---

## 7. Ejecutar el deploy

Desde la raíz del repo:

```bash
chmod +x scripts/deploy-gcp.sh

# Staging
export GCP_PROJECT_ID=YOUR_PROJECT_ID
export NEXT_PUBLIC_API_URL=https://TU_BACKEND_STAGING
# Tras el primer deploy, pon la URL real de Cloud Run y vuelve a desplegar:
export NEXT_PUBLIC_APP_URL=

./scripts/deploy-gcp.sh staging
```

Producción:

```bash
export NEXT_PUBLIC_API_URL=https://TU_BACKEND_PROD
export NEXT_PUBLIC_APP_URL=https://TU_FRONTEND_PROD_O_CLOUD_RUN_URL

./scripts/deploy-gcp.sh production
```

Flujo equivalente sin script:

```bash
gcloud builds submit \
  --project="$GCP_PROJECT_ID" \
  --config=cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=ats-frontend-staging,_AR_REPOSITORY=ats-frontend,_IMAGE_NAME=ats-frontend,SHORT_SHA=$(git rev-parse --short HEAD),_NEXT_PUBLIC_API_URL=https://TU_BACKEND,_NEXT_PUBLIC_APP_URL=https://TU_FRONTEND \
  .
```

### Primer deploy: fijar `NEXT_PUBLIC_APP_URL`

1. Despliega con `NEXT_PUBLIC_APP_URL` vacío o provisional.
2. Obtén la URL:

```bash
gcloud run services describe ats-frontend-staging \
  --region=us-west2 \
  --format='value(status.url)'
```

3. Exporta esa URL como `NEXT_PUBLIC_APP_URL` y vuelve a ejecutar `./scripts/deploy-gcp.sh staging`.

---

## 8. Verificar el servicio y logs

```bash
# URL
gcloud run services describe ats-frontend-staging \
  --region=us-west2 \
  --format='value(status.url)'

# Revisiones
gcloud run revisions list \
  --service=ats-frontend-staging \
  --region=us-west2

# Logs (últimos)
gcloud run services logs read ats-frontend-staging \
  --region=us-west2 \
  --limit=50

# Logs en streaming
gcloud beta run services logs tail ats-frontend-staging \
  --region=us-west2
```

También: [Cloud Console → Cloud Run → servicio → Logs](https://console.cloud.google.com/run).

Health check rápido:

```bash
SERVICE_URL="$(gcloud run services describe ats-frontend-staging --region=us-west2 --format='value(status.url)')"
curl -I "$SERVICE_URL"
```

---

## 9. Actualizar variables de entorno en Cloud Run

### Solo runtime (`API_URL`, `BACKEND_URL`, etc.)

```bash
gcloud run services update ats-frontend-staging \
  --region=us-west2 \
  --update-env-vars=API_URL=https://nuevo-backend.example.com,BACKEND_URL=https://nuevo-backend.example.com
```

### Cambiar `NEXT_PUBLIC_*` (requiere rebuild)

Vuelve a correr el deploy con los nuevos valores:

```bash
export NEXT_PUBLIC_API_URL=https://nuevo-backend.example.com
export NEXT_PUBLIC_APP_URL=https://nuevo-frontend.example.com
./scripts/deploy-gcp.sh staging
```

---

## 10. Secret Manager (si agregas secretos server-side)

No subas secretos al repo ni a `cloudbuild.yaml`. Flujo recomendado:

### Crear el secreto

```bash
echo -n "valor-secreto" | gcloud secrets create ATS_SOME_SECRET \
  --data-file=- \
  --replication-policy=automatic \
  --project="$GCP_PROJECT_ID"
```

### Dar acceso a la SA de Cloud Run

```bash
PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
# SA por defecto de Cloud Run (Compute Engine default SA):
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding ATS_SOME_SECRET \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$GCP_PROJECT_ID"
```

### Montar el secreto como env var en Cloud Run

```bash
gcloud run services update ats-frontend-staging \
  --region=us-west2 \
  --update-secrets=ATS_SOME_SECRET=ATS_SOME_SECRET:latest
```

Esto inyecta el secreto como variable de entorno `ATS_SOME_SECRET` en el contenedor. Para usarlo en código: `process.env.ATS_SOME_SECRET` (solo en server / Route Handlers; nunca con prefijo `NEXT_PUBLIC_`).

---

## 11. Rollback básico

Listar revisiones:

```bash
gcloud run revisions list \
  --service=ats-frontend-staging \
  --region=us-west2
```

Enrutar 100% del tráfico a una revisión anterior:

```bash
gcloud run services update-traffic ats-frontend-staging \
  --region=us-west2 \
  --to-revisions=REVISION_NAME=100
```

O redesplegar una imagen ya publicada en Artifact Registry:

```bash
gcloud run deploy ats-frontend-staging \
  --region=us-west2 \
  --image=us-west2-docker.pkg.dev/$GCP_PROJECT_ID/ats-frontend/ats-frontend:TAG_ANTERIOR \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=80 \
  --max-instances=10 \
  --allow-unauthenticated
```

Listar tags de imagen:

```bash
gcloud artifacts docker images list \
  "us-west2-docker.pkg.dev/${GCP_PROJECT_ID}/ats-frontend/ats-frontend" \
  --include-tags
```

---

## 12. Staging vs producción

| | Staging | Production |
|---|---|---|
| Servicio Cloud Run | `ats-frontend-staging` | `ats-frontend-production` |
| Comando | `./scripts/deploy-gcp.sh staging` | `./scripts/deploy-gcp.sh production` |
| `NEXT_PUBLIC_API_URL` | Backend staging | Backend prod |
| `NEXT_PUBLIC_APP_URL` | URL Cloud Run / dominio staging | URL Cloud Run / dominio prod |

Misma imagen base y mismo `cloudbuild.yaml`; solo cambian servicio y substitutions.

---

## 13. Notas técnicas

- **Standalone:** `next.config.mjs` usa `output: "standalone"`. El `Dockerfile` copia `.next/standalone`, `.next/static` y `public`.
- **PDF / Chromium:** en build Docker se usa `SKIP_CHROMIUM_PACK=1`. `@sparticuz/chromium` viaja con el trace de Next (`outputFileTracingIncludes` / `serverExternalPackages`). Si PDFs fallan en Cloud Run, considera subir memoria del servicio (p. ej. `2Gi`) solo para ese entorno.
- **Headers grandes:** el contenedor arranca con `NODE_OPTIONS=--max-http-header-size=65536` (alineado con `npm start` local).
- **Sin secretos en git:** `.dockerignore` excluye `.env*`. `.gitignore` ya ignora `.env*`.

---

## Checklist rápido

1. `gcloud auth login` + `gcloud config set project ...`
2. Habilitar APIs (sección 3)
3. IAM Cloud Build (sección 5)
4. `export NEXT_PUBLIC_API_URL=...`
5. `./scripts/deploy-gcp.sh staging`
6. Copiar URL → `export NEXT_PUBLIC_APP_URL=...` → redesplegar
7. Verificar con `curl` y logs
