---
name: push-ats-prod
description: >-
  Publica la rama main del frontend ATS en origin (GitLab) y en el remoto
  mirror (GitHub). Úsala cuando el usuario pida push a prod, desplegar
  producción o sincronizar prod con mirror.
---

# push-ats-prod

## Objetivo

Ejecutar el push de la rama `main` a los dos remotos del proyecto:

- `origin`
- `mirror`

## Flujo obligatorio

1. Verificar que el repositorio esté en una rama válida y sin conflictos locales:
   - `git branch --show-current`
   - `git status --short`
2. Asegurar que se trabaja con la rama `main`:
   - Si no está en `main`, cambiar a `main`.
3. Publicar exactamente esta rama:
   - `git push origin main`
   - `git push mirror main`
4. Reportar resultado de ambos pushes en una respuesta breve.

## Reglas

- Esta skill **no** debe intentar push a `prod`.
- Esta skill **no** crea commits automáticamente.
- Si falla uno de los remotos, informar cuál falló y el error.
