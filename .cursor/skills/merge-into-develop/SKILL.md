---
name: merge-into-develop
description: >-
  Commits pending work via git-commit-messages, merges the current feature
  branch into develop, checks out develop, and deletes the merged feature
  branch to keep the local version tree clean. Use when the user asks to
  merge into develop, finish a feature branch, /merge-into-develop, or
  close a feature into develop without pushing.
---

# Merge into develop

## Cuándo aplicar

El usuario quiere **cerrar la rama actual en `develop`** en local:

1. `/git-commit-messages`
2. Merge de la rama actual hacia `develop`
3. Checkout a `develop`
4. Eliminar rama feature que se acababa de hacer merge a `develop` (para mantener el version tree limpio)

También aplica con `/merge-into-develop` o frases como “merge a develop y borra la feature”, “cierra la feature en develop”.

## Alcance

- Solo **local**. **No** push a `origin` / `mirror` salvo que el usuario lo pida aparte (p. ej. `push-ats-develop`).
- No tocar `main`, `test`, ni ramas legacy.
- No usar `--force` / `-D` salvo instrucción explícita del usuario.

## Prerrequisitos

- Repo en la raíz del workspace (`git rev-parse --show-toplevel`).
- Rama actual **no** es `develop`, `main` ni `test` (si ya estás en `develop`, solo corre el commit si hay cambios y detén el resto).
- Working tree usable: si hay conflictos de merge previos, resolverlos o abortar antes.

## Flujo (ejecutar en orden)

### 0 — Capturar contexto

Desde la raíz del repo:

```bash
git status -sb
FEATURE="$(git branch --show-current)"
```

Si `FEATURE` es `develop`, `main` o `test`:

- Ejecuta solo el paso 1 (commit) si hay cambios pendientes.
- **No** merges ni borres la rama actual.
- Informa y termina.

Guarda `FEATURE` para el delete final.

### 1 — `/git-commit-messages`

Sigue el skill **`git-commit-messages`** (proyecto o personal) **sin preguntar**:

1. `git status`, `git diff`, `git diff --staged`.
2. Bloquear secretos (`.env`, claves, PEM, etc.).
3. `git add .` en la raíz del repo.
4. Si no hay staged meaningful → **no** crear commit vacío; continuar al merge solo si la rama ya tiene commits que faltan en `develop`.
5. Commit en inglés, Conventional Commits + emoji.

Si el commit falla por hook: corregir y crear un **nuevo** commit (no `--amend` salvo reglas del skill/proyecto).

### 2 — Merge de la rama actual hacia `develop`

```bash
git checkout develop
git merge "$FEATURE" -m "Merge branch '$FEATURE' into develop"
```

Si hay conflictos:

- **Detener**.
- Listar archivos en conflicto.
- **No** `--abort` automático ni `--force`.
- No borrar `$FEATURE` hasta que el merge termine limpio.

### 3 — Checkout a `develop`

Tras el merge exitoso ya estás en `develop`. Si no:

```bash
git checkout develop
```

Verificar: `git branch --show-current` → `develop`.

### 4 — Eliminar la rama feature mergeada

Solo si el merge del paso 2 terminó **sin** conflictos pendientes y `FEATURE` no es una rama protegida:

```bash
git branch -d "$FEATURE"
```

- Usar **`-d`** (safe delete). Si Git rechaza porque no está fully merged: informar; **no** usar `-D` sin pedido explícito.
- Nunca borrar `develop`, `main`, `test`.

### 5 — Verificación breve

```bash
git status -sb
git branch --show-current
git log -1 --oneline
```

Respuesta al usuario (corta):

- Hash/resumen del commit (si hubo).
- Confirmación: merge `FEATURE` → `develop`.
- Confirmación: rama `FEATURE` eliminada (o por qué no).
- Recordatorio: sin push (salvo que lo pidan).

## Qué no hacer

- No push remoto en este skill.
- No mergear `develop` → feature (dirección incorrecta).
- No borrar la feature antes del merge exitoso.
- No `--no-ff` / rebase / squash salvo que el usuario lo pida.
- No editar `git config`.

## Errores frecuentes

| Síntoma | Acción |
|---------|--------|
| Ya en `develop` | Solo commit si aplica; no delete. |
| Merge conflicts | Parar; no borrar feature. |
| `git branch -d` rechaza | Informar; pedir `-D` solo si el usuario insiste. |
| Nada que commitear y feature ya en develop | Checkout develop; intentar `-d` si fully merged; si no hay nada que mergear, decirlo. |
