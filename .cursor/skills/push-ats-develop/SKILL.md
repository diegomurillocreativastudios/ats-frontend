---
name: push-ats-develop
description: Publica la rama develop del backend ATS en origin y en el remoto mirror (GitLab.com). Úsala cuando el usuario pida push a develop, desplegar develop, sincronizar develop con mirror, o mencione push-ats-develop.
---

# Push ATS — rama `develop`

## Cuándo aplicar

El usuario quiere **subir `develop`** a **origin** y al **mirror** del repo `ats-backend` (o equivalente en este workspace).

## Prerrequisitos

- Repositorio con remotos `origin` y `mirror` (`git remote -v`).
- Commits locales listos; el usuario confirma que quiere publicar.

## Pasos (el agente debe ejecutarlos)

1. **Situación actual:** `git status -sb` y rama actual (`git branch --show-current`).
2. **Objetivo:** que la rama remota `develop` en `origin` y `mirror` reciban los commits que el usuario quiere publicar (normalmente desde la rama local `develop`).
3. **Comandos** (en el directorio raíz del repo):

```bash
git push origin develop
git push mirror develop
```

Si la rama local tiene otro nombre pero debe actualizar `develop` en los remotos:

```bash
git push origin HEAD:develop
git push mirror HEAD:develop
```

## Errores frecuentes

| Síntoma | Acción |
|---------|--------|
| `mirror` no existe | `git remote add mirror <url>` (preguntar al usuario la URL si no está en `.git/config`). |
| Rechazo por historial divergente | No usar `--force` salvo que el usuario lo pida explícitamente; informar y pedir decisión. |
| Sin permisos SSH/HTTPS | Revisar credenciales del remoto correspondiente. |

## Qué no hacer

- No incluir en el commit archivos sensibles (`.env`, claves).
- No forzar push a `develop` sin instrucción explícita del usuario.
