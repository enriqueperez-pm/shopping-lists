"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { BudgetConceptAnalysis } from "../budget-analytics";
import type { BudgetConcept } from "../types";
import type { EnhancedTransaction } from "../FinancialDatabase";
import BudgetConceptRow from "./BudgetConceptRow";
import {
  getBudgetConceptOrder,
  moveConceptToCategory,
  setBudgetConceptOrder,
  sortConceptsByOrder,
} from "../finance-crud";
import type { FinancialDatabase } from "../FinancialDatabase";
import { setBudgetCategoryOrder } from "../finance-linking";

type CategoryGroup = {
  parent: BudgetConceptAnalysis;
  children: BudgetConceptAnalysis[];
};

function SortableConceptItem({
  row,
  transactions,
  onEdit,
  muted,
  periodLabel,
  organizeMode,
}: {
  row: BudgetConceptAnalysis;
  transactions: EnhancedTransaction[];
  onEdit: (c: BudgetConcept) => void;
  muted?: boolean;
  periodLabel?: string;
  organizeMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.concept.id,
    disabled: !organizeMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <BudgetConceptRow
        row={row}
        transactions={transactions}
        onEdit={onEdit}
        muted={muted}
        periodLabel={periodLabel}
        organizeMode={organizeMode}
        dragHandleProps={organizeMode ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

function CategoryDropZone({
  parentId,
  organizeMode,
  children,
}: {
  parentId: string;
  organizeMode: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cat:${parentId}`,
    disabled: !organizeMode,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver && organizeMode ? "ring-2 ring-pantry/30 rounded-xl" : undefined}
    >
      {children}
    </div>
  );
}

function SortableCategoryHeader({
  parentId,
  organizeMode,
  children,
}: {
  parentId: string;
  organizeMode: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `parent:${parentId}`,
    disabled: !organizeMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 px-0.5">
      {organizeMode ? (
        <button
          type="button"
          className="p-1 text-ink-faint cursor-grab active:cursor-grabbing shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
      ) : null}
      {children}
    </div>
  );
}

type Props = {
  db: FinancialDatabase;
  selectedPeriod: string;
  conceptType: "income" | "expense";
  categoryGroups: CategoryGroup[];
  transactions: EnhancedTransaction[];
  organizeMode: boolean;
  collapsed: Record<string, boolean>;
  tab: string;
  onEdit: (c: BudgetConcept) => void;
  onRefresh: () => void;
  renderCategoryHeader: (
    group: CategoryGroup,
    index: number,
    headerWrap: (node: React.ReactNode) => React.ReactNode,
  ) => React.ReactNode;
};

export default function BudgetOrganizerDnd({
  db,
  selectedPeriod,
  conceptType,
  categoryGroups,
  transactions,
  organizeMode,
  collapsed,
  tab,
  onEdit,
  onRefresh,
  renderCategoryHeader,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("parent:")) {
      const parentId = activeId.replace("parent:", "");
      const parentIds = categoryGroups.map((g) => g.parent.concept.id);
      const oldIndex = parentIds.indexOf(parentId);
      let newIndex = oldIndex;
      if (overId.startsWith("parent:")) {
        newIndex = parentIds.indexOf(overId.replace("parent:", ""));
      }
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const order = arrayMove(parentIds, oldIndex, newIndex);
      setBudgetCategoryOrder(db, selectedPeriod, conceptType, order);
      onRefresh();
      return;
    }

    if (overId.startsWith("cat:")) {
      const targetParentId = overId.replace("cat:", "");
      const targetGroup = categoryGroups.find((g) => g.parent.concept.id === targetParentId);
      if (targetGroup) {
        moveConceptToCategory(db, activeId, targetGroup.parent.concept.category);
        onRefresh();
      }
      return;
    }

    const sourceGroup = categoryGroups.find((g) =>
      g.children.some((c) => c.concept.id === activeId),
    );
    const targetGroup = categoryGroups.find((g) =>
      g.children.some((c) => c.concept.id === overId),
    );
    if (!sourceGroup || !targetGroup) return;

    if (sourceGroup.parent.concept.id !== targetGroup.parent.concept.id) {
      moveConceptToCategory(db, activeId, targetGroup.parent.concept.category);
      onRefresh();
      return;
    }

    const parentId = sourceGroup.parent.concept.id;
    const ids = sourceGroup.children.map((c) => c.concept.id);
    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    setBudgetConceptOrder(
      db,
      selectedPeriod,
      conceptType,
      parentId,
      arrayMove(ids, oldIndex, newIndex),
    );
    onRefresh();
  };

  const sortableCategoryIds = categoryGroups.map((g) => `parent:${g.parent.concept.id}`);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortableCategoryIds} strategy={verticalListSortingStrategy}>
        {categoryGroups.map((group, index) => {
          const key = `budget:${tab}:${group.parent.concept.id}`;
          const isCollapsed = collapsed[key];
          const order = getBudgetConceptOrder(
            db,
            selectedPeriod,
            conceptType,
            group.parent.concept.id,
          );
          const sortedChildren = sortConceptsByOrder(
            group.children.map((c) => c.concept),
            order,
          )
            .map((concept) => group.children.find((c) => c.concept.id === concept.id)!)
            .filter(Boolean);
          const conceptIds = sortedChildren.map((c) => c.concept.id);

          return (
            <section key={group.parent.concept.id} className="space-y-2">
              <SortableCategoryHeader parentId={group.parent.concept.id} organizeMode={organizeMode}>
                {renderCategoryHeader(group, index, (node) => node)}
              </SortableCategoryHeader>

              {!isCollapsed ? (
                <CategoryDropZone
                  parentId={group.parent.concept.id}
                  organizeMode={organizeMode}
                >
                  <SortableContext items={conceptIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {sortedChildren.map((child) => (
                        <SortableConceptItem
                          key={child.concept.id}
                          row={child}
                          transactions={transactions}
                          onEdit={onEdit}
                          organizeMode={organizeMode}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CategoryDropZone>
              ) : null}
            </section>
          );
        })}
      </SortableContext>
      <DragOverlay />
    </DndContext>
  );
}

export function sortGroupChildren(
  db: FinancialDatabase,
  group: CategoryGroup,
  selectedPeriod: string,
  conceptType: "income" | "expense",
): BudgetConceptAnalysis[] {
  const order = getBudgetConceptOrder(db, selectedPeriod, conceptType, group.parent.concept.id);
  return sortConceptsByOrder(
    group.children.map((c) => c.concept),
    order,
  )
    .map((concept) => group.children.find((c) => c.concept.id === concept.id)!)
    .filter(Boolean);
}

export { moveCategoryInOrder } from "../finance-linking";
