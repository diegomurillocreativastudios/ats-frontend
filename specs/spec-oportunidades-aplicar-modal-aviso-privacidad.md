# Especificación: modal de aviso de privacidad al aplicar (oportunidades públicas)

## Objetivo

Al ingresar a la vista de postulación pública, mostrar un aviso informativo de privacidad y protección de datos en un **modal** que aparezca **de arriba hacia abajo** y bloquee el acceso al formulario hasta que el candidato acepte o decline. Si declina, redirigir al listado de oportunidades. Si acepta, solo cerrar el modal y permitir el uso normal de la pantalla.

Ruta afectada:

```text
/oportunidades/<vacanteId>/aplicar
```

Ejemplo local: `http://localhost:3000/oportunidades/<vacanteId>/aplicar`

## Contexto

La postulación a vacantes se realiza en flujo público. Antes de exponer el formulario, se requiere comunicar al usuario el tratamiento de sus datos y darle una acción clara: continuar aceptando el aviso o salir a la lista de oportunidades.

Este spec define **comportamiento de UI**, **copy fijo** y **criterios de aceptación**; no sustituye revisión legal del texto final en producción.

## Relación con otros documentos

- Complementa la experiencia pública de oportunidades descrita en [`spec-oportunidades-ui-frontend.md`](./spec-oportunidades-ui-frontend.md).
- El punto de implementación directo en código es el flujo que monta `PublicVacancyApplyPage` desde `app/oportunidades/[vacanteId]/aplicar/page.tsx`.

## Alcance

### En alcance

- Modal con overlay que impide interacción con el formulario hasta resolverse.
- Entrada de animación del panel: **de arriba hacia abajo** (p. ej. `slide-in-from-top` o equivalente coherente con el design system).
- Texto del aviso tal como se indica en la sección [Contenido del modal](#contenido-del-modal).
- Dos acciones al pie del modal, alineadas a la **derecha** (orden visual de izquierda a derecha):
  1. **No, gracias** — navegación a `/oportunidades`.
  2. **Acepto** — cierre del modal; el usuario queda con acceso completo a la vista de aplicar.
- Accesibilidad mínima: título/landmark del diálogo, focus trap o foco al primer control, cierre con teclado según el patrón de diálogos usado en el proyecto (Radix Dialog, etc.).

### Fuera de alcance (explícito)

- Persistir el consentimiento en backend o cookie con fines legales (si el producto lo requiere, tratarlo en un spec/épica aparte).
- Volver a mostrar el modal en la misma sesión tras haber aceptado (dejar claro: por defecto este spec asume “mostrar al entrar a la ruta” en cada visita a menos que se defina `sessionStorage`/preferencia; ver [Decisiones de producto opcionales](#decisiones-de-producto-opcionales)).
- Modificar el contrato de la API de postulación o el flujo de envío del formulario.
- Rediseño del formulario de aplicación más allá de superponer el aviso.

## Comportamiento funcional

1. **Carga de la ruta** `/oportunidades/<vacanteId>/aplicar`
   - El modal de aviso está **visible** de inmediato (o tras el primer render estable del contenedor de la página) y cubre el contenido interactivo del formulario.
2. **Clic o activación de “No, gracias”**
   - Navegación del usuario a ` /oportunidades` (misma pestaña, comportamiento de `router.push` o `Link` equivalente).
3. **Clic o activación de “Acepto”**
   - El modal se **cierra**; el formulario y el resto de la vista quedan utilizables.
   - No hay redirección; el usuario permanece en `/oportunidades/<vacanteId>/aplicar`.
4. **Bloqueo de interacción**
   - Mientras el modal esté abierto, el usuario no debe poder rellenar el formulario de postulación por detrás (enfoque: overlay y/o `inert`/`aria-hidden` en el contenido de fondo según implementación con el componente de diálogo elegido).

## Contenido del modal

**Título (o primera línea destacada)**

```text
AVISO DE PRIVACIDAD Y PROTECCIÓN DE DATOS PERSONALES
```

**Cuerpo (texto corrido y lista)**

```text
Sus datos personales serán incorporados a la base de datos de Visible Outsource y procesados exclusivamente por profesionales autorizados del área de Recursos Humanos en el contexto de procesos de selección y gestión de personal.

Tratamiento de datos:
• Finalidad: Evaluación de candidatos y gestión de procesos de reclutamiento
• Acceso: Personal autorizado de RRHH únicamente
• Confidencialidad: Sus datos serán tratados bajo estrictos estándares de confidencialidad y seguridad de información
• Derechos: Usted tiene derecho a acceder, rectificar o solicitar la eliminación de sus datos personales

Este sistema cumple con la normativa vigente de protección de datos personales.

Si desea eliminar o rectificar sus datos personales en nuestra base de datos, favor escriba a info@visibleo.us
```

**Botones (etiquetas exactas para copy)**

| Orden visual (izq. → dcha.) | Etiqueta     | Acción                          |
|----------------------------|--------------|---------------------------------|
| Primero                    | No, gracias  | Ir a `/oportunidades`           |
| Segundo                    | Acepto       | Cerrar el modal, quedarse en la vista |

Alineación del grupo de botones: **a la derecha** en el pie del modal (footer del diálogo).

## Requisitos de presentación (UX / UI)

- **Animación de entrada** del contenedor del modal: movimiento o transición clara de **arriba hacia abajo** (el overlay puede aparecer con fade; lo crítico es el panel de contenido).
- **Legibilidad**: cuerpo con buen contraste, espaciado entre párrafo, lista con viñetas o líneas con indentación clara, ancho máximo de texto cómodo en desktop y mobile.
- **Proporción**: en viewport pequeño, el contenido debe ser scrolleable **dentro** del modal sin cortar el pie con los dos botones fijos, o patrón equivalente usado en el resto de modales del proyecto.
- **Consistencia**: reutilizar tokens de color, tipografía y botones (p. ej. `Button` de shadcn) ya presentes en el portal público de oportunidades.

## Accesibilidad

- El bloque debe comportarse como **diálogo modal**: foco movido al interior, cierre o navegación coherente con el stack de componente (p. ej. `Dialog` de Radix + `DialogTitle`/`DialogDescription` o estructura equivalente).
- Etiqueta accesible para el aviso: el título de la sección debe asociarse al `aria-labelledby`/`aria-describedby` del diálogo de forma explícita.
- Los botones deben ser activables por teclado y anunciados con el texto de cada acción.
- `No, gracias` y `Acepto` no deben depender solo del color para distinguirse (variación de estilo: secundario vs. primario según el design system).

## Criterios de aceptación (QA)

1. Al abrir ` /oportunidades/<vacanteId>/aplicar` en un entorno con datos válidos, el aviso de privacidad aparece **antes** de que el candidato interactúe con el formulario.
2. El panel del aviso se percibe con animación/entrada de **arriba hacia abajo** (definir visualmente en la revisión de implementación; no aceptar solo fade sin movimiento del panel).
3. El cuerpo del modal coincide con el [contenido acordado](#contenido-del-modal) (sin omisiones de párrafo; correo `info@visibleo.us` visible y copiable).
4. Los dos botones están en el **pie** del modal, alineados a la **derecha**, con etiquetas `No, gracias` y `Acepto` en ese orden.
5. **No, gracias** navega a `/oportunidades` (URL exacta, sin `vacanteId`).
6. **Acepto** cierra el modal y deja al usuario en la misma ruta con el formulario utilizable; no hay regreso automático al modal en esa misma visita a menos que se defina otra regla.
7. Con el modal abierto, no es posible enfocar campos del formulario por detrás (comportamiento estándar de modal accesible).

## Decisiones de producto opcionales

Si el equipo decide **no** volver a mostrar el aviso en la misma sesión tras aceptar, documentar y acordar:

- clave de `sessionStorage` o equivalente, y
- criterio de “primera carga de la ruta en la sesión”.

Esta iteración no es obligatoria mientras el spec de alcance indique “mostrar al entrar” en cada carga; incluirlo solo si negocio/legal lo requiere.

## Referencias técnicas (orientativas, no prescriptivas)

- Ruta: `app/oportunidades/[vacanteId]/aplicar/page.tsx`
- Componente principal: `components/public/PublicVacancyApplyPage` (o subcomponente cliente que encapsule el estado `open` del modal y la navegación)
- Navegación: `useRouter` de `next/navigation` para el botón “No, gracias” o `Link` a `/oportunidades` con estilos de botón secundario
