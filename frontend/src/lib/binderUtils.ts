import type { Binder, BinderLayout, BinderSlot } from "../types/binder";
import { BINDER_LAYOUT_SLOT_COUNTS } from "../types/binder";

export const DEFAULT_PREVIEW_PAGE_COLOR = "#1b1814";

export function generateId(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}-${randomPart}`;
}

function formatPageNumber(pageNumber: number) {
  return String(pageNumber).padStart(3, "0");
}

function formatSlotNumber(slotNumber: number) {
  return String(slotNumber).padStart(2, "0");
}

export function createSlot(pageNumber: number, slotNumber: number): BinderSlot {
  return {
    slotKey: `page#${formatPageNumber(pageNumber)}_slot#${formatSlotNumber(
      slotNumber
    )}`,
    pageNumber,
    slotNumber,
    card: null,
    status: "missing",
    quantity: 0,
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptySlots(
  layout: BinderLayout = "3x3",
  pageNumber = 1
): BinderSlot[] {
  const slotCount = BINDER_LAYOUT_SLOT_COUNTS[layout];

  return Array.from({ length: slotCount }, (_, index) =>
    createSlot(pageNumber, index + 1)
  );
}

export function ensureSlotsForLayout(
  binder: Binder,
  layout: BinderLayout
): Binder {
  const requiredSlotCount = BINDER_LAYOUT_SLOT_COUNTS[layout];

  if (binder.slots.length >= requiredSlotCount) {
    return {
      ...binder,
      layout,
      updatedAt: new Date().toISOString(),
    };
  }

  const existingSlotNumbers = new Set(
    binder.slots.map((slot) => slot.slotNumber)
  );

  const slotsToAdd: BinderSlot[] = [];

  for (let slotNumber = 1; slotNumber <= requiredSlotCount; slotNumber += 1) {
    if (!existingSlotNumbers.has(slotNumber)) {
      slotsToAdd.push(createSlot(1, slotNumber));
    }
  }

  return {
    ...binder,
    layout,
    slots: [...binder.slots, ...slotsToAdd].sort(
      (a, b) => a.slotNumber - b.slotNumber
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeBinder(binder: Binder): Binder {
  const layout = binder.layout ?? "3x3";

  return ensureSlotsForLayout(
    {
      ...binder,
      layout,
      isPublic: binder.isPublic ?? false,
      shareId: binder.shareId ?? null,
      previewPageColor:
        binder.previewPageColor ?? DEFAULT_PREVIEW_PAGE_COLOR,
    },
    layout
  );
}

export function createDefaultBinder(
  name = "My First Pokémon Binder",
  layout: BinderLayout = "3x3"
): Binder {
  return {
    binderId: generateId("binder"),
    name,
    description: "A local prototype binder saved in this browser.",
    pageNumber: 1,
    layout,
    slots: createEmptySlots(layout, 1),
    isPublic: false,
    shareId: null,
    previewPageColor: DEFAULT_PREVIEW_PAGE_COLOR,
    updatedAt: new Date().toISOString(),
  };
}