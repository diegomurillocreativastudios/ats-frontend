---
name: generate-confluence-doc
description: Genera contenido estructurado listo para pegar en Confluence (títulos, tablas, paneles informativos, listas de verificación, bloques de código, TOC). Úsala cuando el usuario pida documentación para Confluence, wiki interna, página de Confluence, o mencione generate-confluence-doc.
---

# Generar documentación para Confluence

## Cuándo aplicar

Al pedir contenido para una página de Confluence sin repetir cada vez el mismo briefing: primero **aclara o infiere** lo mínimo necesario, luego **entrega el cuerpo** en el formato acordado.

## Información a obtener (rápido)

Si el usuario no lo dio, inferir solo lo obvio del contexto; si falta algo crítico, preguntar en una sola vuelta:

| Dato | Uso |
|------|-----|
| Título de la página | H1 y nombre en Confluence |
| Objetivo / audiencia | Tono y nivel de detalle |
| Idioma de salida | Español por defecto si el usuario escribe en español |
| Tipo de página | Cómo, referencia, decisión (ADR), runbook, onboarding |
| Versión / fecha (opcional) | Pie o bloque de metadatos |

## Estructura por tipo de página

**Procedimiento (cómo hacer X)**  
1. Resumen en 1–3 frases  
2. Prerrequisitos y permisos  
3. Pasos numerados (un paso = una acción verificable)  
4. Validación / resultado esperado  
5. Errores frecuentes y solución  
6. Enlaces y referencias  

**Referencia técnica**  
Resumen → modelo de datos o contratos → tablas → ejemplos → límites conocidos.

**Runbook / incidente**  
Síntomas → impacto → diagnóstico → mitigación → escalamiento → postmortem (si aplica).

**ADR (decisión)**  
Contexto → decisión → opciones consideradas → consecuencias.

## Formato de salida (por defecto)

Usar **Markdown enriquecido** que Confluence Cloud suele interpretar al pegar (o que el usuario puede convertir con “Paste as Markdown” si está disponible):

- Un solo `H1` con el título de la página; el resto `H2`/`H3`.
- Tablas Markdown para datos tabulares.
- Listas de verificación con `- [ ]` / `- [x]` cuando aplique tareas.
- Bloques de código con lenguaje: ` ```csharp `, ` ```json `, etc.
- **Callouts** como líneas claras antes del bloque (Confluence las mapeará o el usuario aplicará el macro):

  - **Nota:** …
  - **Importante:** …
  - **Advertencia:** …

Al final, opcional: **Metadatos** (versión, autor, última actualización) en lista o tabla pequeña.

## Variante wiki markup (Confluence Server/Data Center)

Si el usuario indica **wiki markup** o instancia antigua, usar la referencia en [reference.md](reference.md) para paneles `{panel}`, `{info}`, `{warning}`, `{code}` y tablas `||`.

## Calidad

- Frases cortas; pasos comprobables; sin relleno.
- Un concepto por párrafo en secciones de procedimiento.
- No inventar políticas internas, fechas de release ni nombres de equipos: usar marcadores `[COMPLETAR]` o preguntar.
- Si el tema es seguridad o cumplimiento, incluir advertencia de revisión por el responsable.

## Ejemplo mínimo de salida

```markdown
# [Título de la página]

> **Resumen:** [Qué cubre esta página en una frase.]

## Objetivo

[Para quién es y qué lograrán al leerla.]

## Procedimiento

1. [Paso verificable]
2. [Paso verificable]

## Referencias

- [Enlace o recurso]
```

## Recursos adicionales

- Macros y wiki markup detallados: [reference.md](reference.md)
