"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import Snackbar from "@/components/ui/Snackbar"

export type CandidateSnackbarVariant = "success" | "error" | "warning" | "info"

export interface CandidateSnackbarContextValue {
  showSnackbar: (message: string, variant?: CandidateSnackbarVariant) => void
}

const CandidateSnackbarContext = createContext<CandidateSnackbarContextValue | null>(null)

export function useCandidateSnackbar(): CandidateSnackbarContextValue {
  const ctx = useContext(CandidateSnackbarContext)
  if (!ctx) {
    const noop: CandidateSnackbarContextValue["showSnackbar"] = () => {}
    return { showSnackbar: noop }
  }
  return ctx
}

export function CandidateSnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    variant: CandidateSnackbarVariant
    message: string
  }>({
    open: false,
    variant: "info",
    message: "",
  })

  const handleClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }, [])

  const showSnackbar = useCallback(
    (message: string, variant: CandidateSnackbarVariant = "info") => {
      setSnackbar({ open: true, message, variant })
    },
    []
  )

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar])

  return (
    <CandidateSnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={snackbar.open}
        onClose={handleClose}
        variant={snackbar.variant}
        message={snackbar.message}
      />
    </CandidateSnackbarContext.Provider>
  )
}
