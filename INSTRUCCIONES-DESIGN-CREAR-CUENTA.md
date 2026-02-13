# Instrucciones para aplicar cambios en design.pen (vista Crear Cuenta)

Usa estas instrucciones **en Claude Code** con el archivo `design.pen` en la raíz del proyecto. Asegúrate de que la app **Pencil** esté abierta en Cursor y conectada (para que las herramientas MCP de Pencil respondan).

---

## Objetivo

En la vista **Crear Cuenta** del archivo `design.pen`:

- **Quitar:** Nombre, Apellido y Teléfono.
- **Dejar solo:** Correo electrónico, Contraseña y Confirmar contraseña.

---

## Paso 1: Abrir el documento

Si el diseño no está abierto:

```
Usar: open_document(filePathOrTemplate: "design.pen")
Ruta completa si hace falta: /Users/diegomurillocorrea/Desktop/ats-frontend/design.pen
```

---

## Paso 2: Localizar la vista Crear Cuenta y los campos del formulario

Ejecutar búsquedas con **batch_get** en `design.pen`:

1. **Encontrar frames o pantallas de “Crear Cuenta”:**
   - `filePath`: `design.pen` (o ruta absoluta al design.pen en el proyecto)
   - `patterns`: `[{ "name": "Crear Cuenta", "type": "frame" }]` o `[{ "name": "crear cuenta", "type": "frame" }]`
   - `searchDepth`: 5 o 6
   - Anotar los **node IDs** de las pantallas/vistas de Crear Cuenta (puede haber variantes móvil, tablet, desktop).

2. **Encontrar textos de los campos a quitar y a conservar:**
   - Buscar nodos de tipo `text` cuyo contenido o nombre sea:
     - "Nombre" → para eliminar (junto con su contenedor/input si aplica)
     - "Apellido" → para eliminar
     - "Teléfono" → para eliminar
     - "Correo electrónico" / "Correo" → conservar
     - "Contraseña" → conservar
     - "Confirmar contraseña" → conservar
   - Ejemplo de pattern: `[{ "type": "text" }]` y revisar en el resultado los que tengan contenido "Nombre", "Apellido", "Teléfono", "Correo", "Contraseña", "Confirmar".
   - Opcional: buscar por `name` con regex si el tool lo permite, por ejemplo nombres que contengan "Nombre", "Apellido", "Teléfono".

Anotar:
- IDs de los **nodos o contenedores** que representan los campos **Nombre**, **Apellido** y **Teléfono** (para borrarlos).
- Confirmar que los campos **Correo electrónico**, **Contraseña** y **Confirmar contraseña** existen y se mantienen.

---

## Paso 3: Eliminar los campos Nombre, Apellido y Teléfono

Usar **batch_design** en `design.pen`:

- **Operación:** `D(nodeId)` (Delete).
- Para cada uno de los node IDs que correspondan a los **campos completos** (input) de Nombre, Apellido y Teléfono, ejecutar:
  - `D("idDelCampoNombre")`
  - `D("idDelCampoApellido")`
  - `D("idDelCampoTelefono")`

Importante: eliminar el **nodo contenedor** del campo (por ejemplo el frame que agrupa label + input), no solo el texto del label, para que desaparezca todo el bloque visual. Si en batch_get viste que "Nombre" está dentro de un frame padre, elimina ese frame padre (su ID).

Ejemplo de bloque de operaciones (sustituir los IDs por los reales obtenidos en el Paso 2):

```javascript
D("idContenedorNombre")
D("idContenedorApellido")
D("idContenedorTelefono")
```

Si hay **varias variantes** de la misma pantalla (móvil, tablet, desktop), repetir las eliminaciones para cada variante (usar los IDs correspondientes a cada una).

---

## Paso 4: Revisar espaciado y orden

- Si hace falta, ajustar **gap** o **padding** del contenedor del formulario para que solo queden los tres campos (Correo electrónico, Contraseña, Confirmar contraseña) y se vean bien alineados.
- Puedes usar **Update (U)** en el contenedor del formulario para tocar `gap` o `padding` si lo necesitas.

---

## Resumen de herramientas Pencil a usar en Claude Code

| Acción              | Herramienta   | Uso breve                                                                 |
|---------------------|---------------|----------------------------------------------------------------------------|
| Abrir design        | open_document | `filePathOrTemplate`: ruta a `design.pen`                                 |
| Buscar vistas       | batch_get     | patterns por nombre "Crear Cuenta" y type "frame"                         |
| Buscar campos       | batch_get     | patterns por type "text" y revisar contenido Nombre/Apellido/Teléfono/etc |
| Borrar campos       | batch_design  | Operaciones `D(id)` para Nombre, Apellido, Teléfono                        |
| Ajustar contenedor  | batch_design  | Operaciones `U(idContenedorForm, { gap: n, padding: n })` si hace falta   |

---

## Ejemplo de prompt para pegar en Claude Code

Puedes copiar y pegar algo así:

```
En el archivo design.pen del proyecto (en la raíz) necesito que actualices la vista "Crear Cuenta":

1. Abre design.pen con Pencil (open_document) si no está abierto.
2. Con batch_get, busca las pantallas o frames que se llamen "Crear Cuenta" y los textos "Nombre", "Apellido", "Teléfono", "Correo electrónico", "Contraseña", "Confirmar contraseña".
3. Con batch_design, elimina (D) los nodos que correspondan a los campos completos de Nombre, Apellido y Teléfono. Deja solo los campos de Correo electrónico, Contraseña y Confirmar contraseña.
4. Si hay varias variantes (móvil, tablet, desktop), aplica los mismos cambios en todas.
5. Ajusta gap/padding del formulario si hace falta para que se vea bien con solo los tres campos.
```

---

## Nota

- Los IDs concretos (por ejemplo `idContenedorNombre`) solo se pueden saber después de ejecutar **batch_get** en tu `design.pen`. En Claude Code, ejecuta primero los pasos 1 y 2 y usa los IDs que devuelva la herramienta en el paso 3.
- La aplicación en `app/crear-cuenta/page.jsx` ya fue actualizada en la conversación anterior para usar solo correo, contraseña y confirmar contraseña; estas instrucciones son solo para el diseño en `design.pen`.
