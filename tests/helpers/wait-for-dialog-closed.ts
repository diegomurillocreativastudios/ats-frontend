import { waitForElementToBeRemoved, screen } from "@testing-library/react"

/**
 * Espera a que el `Modal` termine la animación de salida y salga del DOM.
 * Tras `onClose`, el diálogo permanece ~280ms en fase `--exit`.
 */
export async function waitForDialogClosed(name?: string | RegExp) {
  const dialog = screen.queryByRole("dialog", name ? { name } : undefined)
  if (!dialog) return
  await waitForElementToBeRemoved(dialog)
}
