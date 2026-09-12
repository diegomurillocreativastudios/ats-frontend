import type { ReactNode } from "react"
import PortalPageHeader from "@/components/ui/PortalPageHeader"

interface SettingsPageSectionProps {
  title: string
  description: string
  children: ReactNode
  contentClassName?: string
}

/**
 * Encabezado y bloque de Configuración con el mismo ritmo
 * title → subtítulo → contenido.
 */
export function SettingsPageSection({
  title,
  description,
  children,
  contentClassName,
}: SettingsPageSectionProps) {
  return (
    <section className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <PortalPageHeader
        title={title}
        description={description}
        className="pb-2"
        contentClassName={contentClassName}
        descriptionClassName="mt-2 leading-6"
      />
      {children}
    </section>
  )
}
