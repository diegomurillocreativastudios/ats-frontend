---
name: push-ats-prod
description: Publica la rama prod del backend ATS en origin y en el remoto mirror (GitLab.com). Úsala cuando el usuario pida push a prod, desplegar producción, sincronizar prod con mirror, o mencione push-ats-prod.
---

# Push ATS — rama `prod`

## Cuándo aplicar

El usuario quiere **subir `prod`** a **origin** y al **mirror** del repo `ats-backend` (o equivalente en este workspace).

## Prerrequisitos

- Repositorio con remotos `origin` y `mirror` (`git remote -v`).
- El usuario entiende que esto publica la línea de **producción**; confirmar si el contexto lo exige.

## Pasos (el agente debe ejecutarlos)

1. **Situación actual:** `git status -sb` y rama actual.
2. **Comandos** (en el directorio raíz del repo):

```bash
git push origin prod
git push mirror prod
```

Si la rama local tiene otro nombre pero debe actualizar `prod` en los remotos:

```bash
git push origin HEAD:prod
git push mirror HEAD:prod
```

## Errores frecuentes

| Síntoma | Acción |
|---------|--------|
| Rama `prod` no existe localmente | Listar ramas (`git branch -a`); alinear con el usuario antes de empujar. |
| `mirror` no existe | `git remote add mirror <url>` (preguntar al usuario la URL si no está en `.git/config`). |
| Rechazo por historial divergente | No usar `--force` salvo que el usuario lo pida explícitamente; informar y pedir decisión. |

## Qué no hacer

- No incluir en el commit archivos sensibles (`.env`, claves).
- No forzar push a `prod` sin instrucción explícita del usuario.
