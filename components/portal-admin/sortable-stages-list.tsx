"use client"

import { useMemo, type ComponentType, type ReactNode } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Trash2 } from "lucide-react"

export interface SortableStageItem {
  id: string
  name: string
  description?: string
  onEdit: (stage: SortableStageItem) => void
  onDelete: (stage: SortableStageItem) => void
  onDefaultActivate: (stage: SortableStageItem) => void
  onFinalToggle: (stage: SortableStageItem, value: boolean) => void
  onHiredToggle: (stage: SortableStageItem, value: boolean) => void
  defaultSwitchDisabled: boolean
  defaultSwitchUpdating: boolean
  finalSwitchDisabled: boolean
  finalSwitchUpdating: boolean
  hiredSwitchDisabled: boolean
  hiredSwitchUpdating: boolean
  isDefault?: boolean
  final?: boolean
  isHiredStage?: boolean
  [key: string]: unknown
}

interface StageSwitchProps {
  stage: SortableStageItem
  disabled: boolean
  isUpdating: boolean
  tStages: (key: string, values?: Record<string, string>) => string
}

interface DefaultStageSwitchProps extends StageSwitchProps {
  onActivate: (stage: SortableStageItem) => void
}

interface ToggleStageSwitchProps extends StageSwitchProps {
  onToggle: (stage: SortableStageItem, value: boolean) => void
}

interface SortableStagesListProps {
  items: SortableStageItem[]
  disabled?: boolean
  onReorder: (items: SortableStageItem[]) => void
  tStages: (key: string, values?: Record<string, string>) => string
  renderSwitches: {
    Default: ComponentType<DefaultStageSwitchProps>
    Final: ComponentType<ToggleStageSwitchProps>
    Hired: ComponentType<ToggleStageSwitchProps>
  }
}

/**
 * Flat drag-and-drop list for admin stages (FE-SEC-017: replaces react-nestable).
 */
function SortableStageRow({
  item,
  disabled,
  tStages,
  DefaultSwitch,
  FinalSwitch,
  HiredSwitch,
}: {
  item: SortableStageItem
  disabled: boolean
  tStages: SortableStagesListProps["tStages"]
  DefaultSwitch: ComponentType<DefaultStageSwitchProps>
  FinalSwitch: ComponentType<ToggleStageSwitchProps>
  HiredSwitch: ComponentType<ToggleStageSwitchProps>
}): ReactNode {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-1 items-center gap-4">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex h-12 w-12 shrink-0 cursor-grab items-center justify-center rounded-[10px] bg-vo-purple/10 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={tStages("actions.dragAria")}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-6 w-6 text-vo-purple" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-sans text-base font-semibold text-foreground">
            {item.name}
          </h3>
          {item.description ? (
            <p className="line-clamp-2 font-sans text-sm text-muted-foreground">
              {item.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
            {tStages("fields.defaultStage")}
          </span>
          <DefaultSwitch
            stage={item}
            onActivate={item.onDefaultActivate}
            disabled={item.defaultSwitchDisabled}
            isUpdating={item.defaultSwitchUpdating}
            tStages={tStages}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
            {tStages("fields.finalStage")}
          </span>
          <FinalSwitch
            stage={item}
            onToggle={item.onFinalToggle}
            disabled={item.finalSwitchDisabled}
            isUpdating={item.finalSwitchUpdating}
            tStages={tStages}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-normal leading-none tracking-wide text-muted-foreground/70">
            {tStages("fields.hiredStage")}
          </span>
          <HiredSwitch
            stage={item}
            onToggle={item.onHiredToggle}
            disabled={item.hiredSwitchDisabled}
            isUpdating={item.hiredSwitchUpdating}
            tStages={tStages}
          />
        </div>
        <button
          type="button"
          onClick={() => item.onEdit(item)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-sans text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2"
          aria-label={tStages("aria.editStage", { name: item.name })}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {tStages("actions.edit")}
        </button>
        <button
          type="button"
          onClick={() => item.onDelete(item)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-background px-4 py-2.5 font-sans text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
          aria-label={tStages("aria.deleteStage", { name: item.name })}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {tStages("actions.delete")}
        </button>
      </div>
    </div>
  )
}

export function SortableStagesList({
  items,
  disabled = false,
  onReorder,
  tStages,
  renderSwitches,
}: SortableStagesListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const itemIds = useMemo(() => items.map((item) => item.id), [items])

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === String(active.id))
    const newIndex = items.findIndex((item) => item.id === String(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {items.map((item) => (
            <li key={item.id} className="m-0 list-none p-0">
              <SortableStageRow
                item={item}
                disabled={disabled}
                tStages={tStages}
                DefaultSwitch={renderSwitches.Default}
                FinalSwitch={renderSwitches.Final}
                HiredSwitch={renderSwitches.Hired}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
