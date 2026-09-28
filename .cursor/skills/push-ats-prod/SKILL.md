---
name: push-ats-prod
description: Publica la rama main (línea de producción) del frontend ATS en origin y en el remoto mirror. Úsala cuando el usuario pida push a prod, desplegar producción, sincronizar main con mirror, o mencione push-ats-prod.
---

# Push ATS — rama `main` (producción)

## Cuándo aplicar

El usuario quiere **subir la línea de producción** del repo **ats-frontend** a **origin** (GitLab) y al **mirror** (GitHub).

> En este repositorio la rama de producción es **`main`**, no `prod`. Esta skill SIEMPRE publica `main`.

## Prerrequisitos

- Repositorio con remotos `origin` y `mirror` (`git remote -v`).
- Rama local **`main`** existe y contiene los commits que se desean publicar (típicamente tras un merge de `develop` → `main`).
- El usuario entiende que esto publica **producción**; confirmar si el contexto lo exige.

## Pasos (el agente debe ejecutarlos)

1. **Situación actual:** `git status -sb` y rama actual (`git branch --show-current`).
2. **Verificar `main`:** confirmar que existe localmente y que contiene lo que se quiere publicar (`git log --oneline -5 main`).
3. **Comandos** (en el directorio raíz del repo **ats-frontend**):

```bash
git push origin main
git push mirror main
```

Si la rama local tiene otro nombre pero debe actualizar `main` en los remotos:

```bash
git push origin HEAD:main
git push mirror HEAD:main
```

## Errores frecuentes

| Síntoma | Acción |
|---------|--------|
| Rama `main` no existe localmente | Listar ramas (`git branch -a`); alinear con el usuario antes de empujar. |
| `mirror` no existe | `git remote add mirror <url>` (preguntar al usuario la URL si no está en `.git/config`). |
| Rechazo por historial divergente | No usar `--force` salvo que el usuario lo pida explícitamente; informar y pedir decisión. |
| Sin permisos SSH/HTTPS | Revisar credenciales del remoto correspondiente. |

## Qué no hacer

- No incluir en el commit archivos sensibles (`.env`, claves).
- No forzar push a `main` sin instrucción explícita del usuario.
- No publicar otra rama bajo el nombre de esta skill: si el usuario quiere `develop`, usar `push-ats-develop`.
