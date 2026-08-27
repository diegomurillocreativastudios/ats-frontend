import { type ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"
import {
  type VacancyContentBlock,
  type VacancyStory,
} from "@/lib/public-vacancy-content"
import { publicOpportunitiesTheme } from "@/lib/public-opportunities-theme"

export function VacancyContentBlocks({
  blocks,
  className = "max-w-prose space-y-3",
}: {
  blocks: VacancyContentBlock[]
  className?: string
}) {
  if (!blocks.length) return null

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3
              key={`heading-${index}-${block.text}`}
              className="pt-1 text-base font-semibold tracking-tight text-foreground"
            >
              {block.text}
            </h3>
          )
        }

        if (block.kind === "list") {
          return (
            <VacancyListItems
              key={`list-${index}`}
              items={block.items}
            />
          )
        }

        return (
          <p
            key={`paragraph-${index}`}
            className="text-sm leading-7 text-muted-foreground"
          >
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

export function VacancyListItems({ items }: { items: string[] }) {
  if (!items.length) return null

  return (
    <ul className="max-w-prose space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-ats-cobre"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function StorySection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={publicOpportunitiesTheme.storySection}
    >
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export function PublicVacancyOutline({
  story,
  requirementsTitle,
  detailsTitle,
  advantagesTitle,
}: {
  story: VacancyStory
  requirementsTitle: string
  detailsTitle: string
  advantagesTitle: string
}) {
  return (
    <div className="mt-8">
      {story.requirements.length ? (
        <StorySection id="vacancy-requirements" title={requirementsTitle}>
          <VacancyListItems items={story.requirements} />
        </StorySection>
      ) : null}

      {hasDetails(story) ? (
        <StorySection id="vacancy-details" title={detailsTitle}>
          <VacancyContentBlocks blocks={story.details} />
          <VacancyListItems items={story.responsibilities} />
        </StorySection>
      ) : null}

      {hasAdvantages(story) ? (
        <StorySection id="vacancy-advantages" title={advantagesTitle}>
          <VacancyContentBlocks blocks={story.advantages} />
          <VacancyListItems items={story.benefits} />
        </StorySection>
      ) : null}
    </div>
  )
}

function hasDetails(story: VacancyStory): boolean {
  return story.details.length > 0 || story.responsibilities.length > 0
}

function hasAdvantages(story: VacancyStory): boolean {
  return story.advantages.length > 0 || story.benefits.length > 0
}
