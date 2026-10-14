'use client'

import Link from 'next/link'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  ClipboardCheck,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  CircularGallery,
  type CircularGalleryItem,
} from '@/components/ui/circular-gallery/circular-gallery'
import type { PortalKey } from '@/lib/portal-access'

export interface PortalSelectionItem {
  key: PortalKey
  href: string
  testId: string
  name: string
  description: string
  ariaLabel: string
  image: string
}

interface PortalSelectionGalleryProps {
  portals: PortalSelectionItem[]
  galleryLabel: string
  enterLabel: string
}

const PORTAL_VISUALS: Record<
  PortalKey,
  { icon: LucideIcon; iconWrapClass: string }
> = {
  candidate: {
    icon: Users,
    iconWrapClass: 'bg-vo-sky/15 text-vo-navy',
  },
  opportunities: {
    icon: Sparkles,
    iconWrapClass: 'bg-vo-cobre/10 text-vo-cobre dark:text-emerald-400',
  },
  rrhh: {
    icon: Briefcase,
    iconWrapClass: 'bg-vo-purple/10 text-vo-purple',
  },
  pruebas: {
    icon: ClipboardCheck,
    iconWrapClass: 'bg-emerald-500/15 text-emerald-800',
  },
  admin: {
    icon: Shield,
    iconWrapClass: 'bg-vo-navy/10 text-vo-navy',
  },
}

function portalGridClass(count: number): string {
  if (count >= 5) return 'sm:grid-cols-2 lg:grid-cols-3'
  if (count >= 4) return 'sm:grid-cols-2 lg:grid-cols-4'
  if (count === 3) return 'sm:grid-cols-2 md:grid-cols-3'
  if (count === 2) return 'sm:grid-cols-2'
  return ''
}

function supportsWebGl2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

function subscribeWebGl() {
  return () => {}
}

function PortalLinkGrid({
  portals,
  enterLabel,
}: {
  portals: PortalSelectionItem[]
  enterLabel: string
}) {
  return (
    <div
      className={`grid flex-1 min-h-0 gap-3 overflow-y-auto md:gap-4 ${portalGridClass(portals.length)}`}
    >
      {portals.map((portal) => {
        const visuals = PORTAL_VISUALS[portal.key]
        const Icon = visuals.icon
        return (
          <Link
            key={portal.key}
            href={portal.href}
            data-testid={portal.testId}
            className="group glass-iridescent-card glass-card-hover iridescent-hover flex flex-col rounded-2xl p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:p-6"
            aria-label={portal.ariaLabel}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${visuals.iconWrapClass}`}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
            </span>
            <span className="mt-3 font-sans text-base font-semibold text-foreground group-hover:text-vo-purple sm:mt-4 sm:text-lg">
              {portal.name}
            </span>
            <span className="mt-1 font-sans text-sm text-muted-foreground sm:mt-2">
              {portal.description}
            </span>
            <span className="mt-3 font-sans text-sm font-medium text-vo-purple group-hover:underline sm:mt-4">
              {enterLabel}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default function PortalSelectionGallery({
  portals,
  galleryLabel,
  enterLabel,
}: PortalSelectionGalleryProps) {
  const router = useRouter()
  const isClient = useSyncExternalStore(subscribeWebGl, () => true, () => false)
  const canUseGallery = isClient && supportsWebGl2()

  const galleryItems: CircularGalleryItem[] = useMemo(
    () =>
      portals.map((portal) => ({
        image: portal.image,
        text: portal.name,
        description: portal.description,
        alt: portal.ariaLabel,
        testId: portal.testId,
        href: portal.href,
      })),
    [portals],
  )

  if (!isClient) {
    return (
      <div
        className="mt-3 h-[min(64dvh,640px)] w-full shrink-0"
        aria-busy="true"
        aria-label={galleryLabel}
      />
    )
  }

  if (!canUseGallery) {
    return (
      <div className="mt-3 max-h-[min(64dvh,640px)] min-h-0 w-full shrink-0 overflow-y-auto">
        <PortalLinkGrid portals={portals} enterLabel={enterLabel} />
      </div>
    )
  }

  return (
    <div className="mt-3 h-[min(64dvh,640px)] w-full shrink-0">
      <CircularGallery
        items={galleryItems}
        bend={1.9}
        borderRadius={0.05}
        scrollEase={0.05}
        openOnClick={false}
        autoScroll={0}
        itemSize={1}
        itemAspect={0.72}
        gap={0.12}
        fadeEdges={0}
        imageInset={0.1}
        font="bold 26px Manrope"
        textColor="#57585B"
        aria-label={galleryLabel}
        onItemClick={(item) => {
          if (item.href) router.push(item.href)
        }}
      />
    </div>
  )
}
