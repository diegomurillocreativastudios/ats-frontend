# Confluence — referencia rápida (wiki markup)

Úsala cuando el usuario pida **wiki markup** o **Confluence Server/Data Center** con editor legacy.

## Encabezados

```
h1. Título
h2. Sección
h3. Subsección
```

## Listas

```
* item
** subitem
# numerada
## subnumerada
```

## Tabla

```
|| Cabecera 1 || Cabecera 2 ||
| Celda | Celda |
```

## Código

```
{code:language}
contenido
{code}
```

## Paneles y notas

```
{panel:title=Importante|borderStyle=solid|borderColor=#ccc}
Texto del panel
{panel}

{info}Texto informativo{info}
{warning}Texto de advertencia{warning}
{note}Nota{note}
```

## TOC

```
{toc:maxLevel=3}
```

## Enlaces

```
[texto visible|URL]
```

Nota: En **Confluence Cloud** (editor nuevo) suele preferirse Markdown o pegar y aplicar formato nativo; confirma con el usuario si la pegada directa de wiki markup está habilitada en su espacio.
