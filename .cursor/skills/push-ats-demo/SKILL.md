---
name: push-ats-demo
description: Publica la rama demo del frontend ATS (este repo) en origin (GitLab) y en el remoto mirror (GitHub). Úsala cuando el usuario pida push a demo, desplegar demo, sincronizar demo con mirror, o mencione push-ats-demo.
---

# Push ATS — rama `demo` (ats-frontend)

## Cuándo aplicar

El usuario quiere **subir `demo`** del repositorio **ats-frontend** a **origin** y al **mirror** (mismo historial en GitLab y GitHub de trabajo).

## Prerrequisitos

- Repositorio con remotos `origin` y `mirror` (`git remote -v`).
- Commits locales listos; el usuario confirma que quiere publicar.

## Pasos (el agente debe ejecutarlos)

1. **Situación actual:** `git status -sb` y rama actual (`git branch --show-current`).
2. **Objetivo:** que la rama remota `demo` en `origin` y `mirror` reciban los commits que el usuario quiere publicar (normalmente desde la rama local `demo`).
3. **Comandos** (en el directorio raíz del repo **ats-frontend**):

```bash
git push origin demo
git push mirror demo
```

Si la rama aún no existe en los remotos (primer push), fijar tracking:

```bash
git push -u origin demo
git push -u mirror demo
```

Si la rama local tiene otro nombre pero debe actualizar `demo` en los remotos:

```bash
git push origin HEAD:demo
git push mirror HEAD:demo
```

## Errores frecuentes

| Síntoma | Acción |
|---------|--------|
| `mirror` no existe | `git remote add mirror <url>` (preguntar al usuario la URL si no está en `.git/config`). |
| Rechazo por historial divergente | No usar `--force` salvo que el usuario lo pida explícitamente; informar y pedir decisión. |
| Sin permisos SSH/HTTPS | Revisar credenciales del remoto correspondiente. |

## Qué no hacer

- No incluir en el commit archivos sensibles (`.env`, claves).
- No forzar push a `demo` sin instrucción explícita del usuario.
