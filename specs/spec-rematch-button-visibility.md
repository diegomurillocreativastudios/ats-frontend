# Especificación: visibilidad del botón "Re-ajustar match" tras edición de vacante

## Objetivo

Corregir el flujo de aparición/desaparición del botón **"Re-ajustar match"** en el detalle de vacantes para que su visibilidad refleje correctamente el estado real de `needsRematch`, sin depender de recargar la página.

## Bug reportado

Al editar una vacante (por ejemplo, al modificar o eliminar un requisito), guardar cambios y luego ejecutar **"Re-ajustar match"**, el reajuste se ejecuta sin errores pero el botón permanece visible en pantalla hasta que se recarga la vista manualmente.

## Alcance (frontend)

| # | Requisito |
|---|-----------|
| 1 | Al guardar cambios en requisitos/descripcion de una vacante, debe quedar marcado estado pendiente de reajuste (`needsRematch = true`) y el botón debe mostrarse. |
| 2 | Al ejecutar **"Re-ajustar match"** con respuesta exitosa, la UI debe refrescar el estado de la vacante y ocultar el botón en la misma sesión/render actual. |
| 3 | La desaparición del botón debe ocurrir sin navegación extra ni recarga manual del navegador. |
| 4 | Si el reajuste falla, el botón debe mantenerse visible y mostrarse feedback de error al usuario. |

## Flujo esperado

1. Usuario entra a `/portal-rrhh/vacantes/<id>`.
2. Usuario hace clic en **"Editar vacante"**.
3. Usuario modifica o elimina al menos un requisito.
4. Usuario hace clic en **"Guardar"**.
5. Botón **"Re-ajustar match"** aparece (o permanece visible si ya estaba visible).
6. Usuario hace clic en **"Re-ajustar match"**.
7. Al completarse exitosamente el rematch:
   - se actualiza el estado local/remoto de la vacante
   - `needsRematch` queda en `false`
   - el botón **desaparece inmediatamente** de la vista
   - se muestra confirmación de éxito

## Criterios de aceptación

1. Sin recargar la página, después de un rematch exitoso el botón **no** está presente en el DOM cuando `needsRematch = false`.
2. El botón solo se renderiza cuando `needsRematch = true` o durante estados transitorios de carga definidos por UX.
3. La actualización de estado debe ser consistente en la vista detalle y en cualquier otro punto que reutilice `RematchButton`.
4. El flujo no debe introducir regresiones en:
   - edición de vacante
   - guardado de requisitos
   - feedback visual (snackbar/loading/error)

## Criterios de no regresión (QA)

- **Caso 1 (happy path):**
  - Editar requisito -> Guardar -> Click en "Re-ajustar match"
  - Resultado esperado: botón desaparece al finalizar ajuste, sin refresh manual.

- **Caso 2 (sin cambios):**
  - Entrar a vacante que no requiere rematch (`needsRematch = false`)
  - Resultado esperado: botón no visible.

- **Caso 3 (error de rematch):**
  - Forzar error en endpoint de rematch
  - Resultado esperado: botón se mantiene visible, se notifica error.

## Referencia técnica en código

- Detalle de vacante: `app/portal-rrhh/vacantes/[id]/page.tsx`
- Componente de botón: `components/rrhh/RematchButton.tsx`
- API rematch: `POST /api/recruiter/vacancies/{id}/rematch`

## Checklist de implementación

- [ ] Confirmar que `fetchVacancy(true)` (u otro refresco de estado) complete actualización de `needsRematch` tras rematch.
- [ ] Asegurar que `RematchButton` re-renderice con `needsRematch` actualizado y retorne `null` cuando aplique.
- [ ] Validar flujo en desktop y mobile de detalle de vacante.
- [ ] Agregar/actualizar cobertura E2E del flujo editar -> guardar -> rematch -> ocultar botón.
