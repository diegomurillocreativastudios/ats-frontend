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

export const PORTAL_SELECTION_IMAGES: Record<PortalKey, string> = {
  candidate: '/ilustrations/undraw_contract-signed_vutk.svg',
  opportunities: '/ilustrations/undraw_searching_pqji.svg',
  rrhh: '/ilustrations/undraw_document-review_lfir.svg',
  pruebas: '/ilustrations/undraw_online-revenue_6egl.svg',
  admin: '/treeApplicant.svg',
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
    <div className={`grid gap-4 md:gap-6 ${portalGridClass(portals.length)}`}>
      {portals.map((portal) => {
        const visuals = PORTAL_VISUALS[portal.key]
        const Icon = visuals.icon
        return (
          <Link
            key={portal.key}
            href={portal.href}
            data-testid={portal.testId}
            className="group glass-iridescent-card glass-card-hover iridescent-hover flex flex-col rounded-2xl p-6 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label={portal.ariaLabel}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${visuals.iconWrapClass}`}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-4 font-sans text-lg font-semibold text-foreground group-hover:text-vo-purple">
              {portal.name}
            </span>
            <span className="mt-2 font-sans text-sm text-muted-foreground">
              {portal.description}
            </span>
            <span className="mt-4 font-sans text-sm font-medium text-vo-purple group-hover:underline">
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
  const [activeIndex, setActiveIndex] = useState(0)
  const isClient = useSyncExternalStore(subscribeWebGl, () => true, () => false)
  const canUseGallery = isClient && supportsWebGl2()

  const galleryItems: CircularGalleryItem[] = useMemo(
    () =>
      portals.map((portal) => ({
        image: portal.image,
        text: portal.name,
        description: portal.description,
        alt: portal.ariaLabel,
        href: portal.href,
      })),
    [portals],
  )

  /** Always-visible controls: e2e selectors and a reliable enter path without scrolling the arc. */
  const portalJumpLinks = (
    <nav
      className="mt-4 flex flex-wrap items-center justify-center gap-2"
      aria-label={galleryLabel}
    >
      {portals.map((portal) => (
        <Link
          key={portal.key}
          href={portal.href}
          data-testid={portal.testId}
          className="rounded-full border border-border/80 bg-white/70 px-3 py-1.5 font-sans text-xs font-medium text-foreground shadow-sm transition-colors hover:border-vo-purple/40 hover:text-vo-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple"
          aria-label={portal.ariaLabel}
        >
          {portal.name}
        </Link>
      ))}
    </nav>
  )

  const activePortal = portals[activeIndex] ?? portals[0]

  if (!isClient) {
    return (
      <div
        className="h-[min(70vh,640px)] min-h-[420px] w-full"
        aria-busy="true"
        aria-label={galleryLabel}
      />
    )
  }

  if (!canUseGallery) {
    return <PortalLinkGrid portals={portals} enterLabel={enterLabel} />
  }

  return (
    <div className="flex w-full flex-col">
      <div className="h-[min(70vh,640px)] min-h-[420px] w-full">
        <CircularGallery
          items={galleryItems}
          bend={3}
          borderRadius={0.05}
          scrollEase={0.05}
          openOnClick={false}
          autoScroll={0}
          font="bold 30px Manrope"
          textColor="#57585B"
          aria-label={galleryLabel}
          onActiveChange={setActiveIndex}
          onItemClick={(item) => {
            if (item.href) router.push(item.href)
          }}
        />
      </div>
      {activePortal ? (
        <div className="mt-2 px-2 text-center">
          <p className="font-sans text-sm text-muted-foreground md:text-base">
            {activePortal.description}
          </p>
          <p className="mt-2 font-sans text-sm font-medium text-vo-purple">{enterLabel}</p>
        </div>
      ) : null}
      {portalJumpLinks}
    </div>
  )
}
