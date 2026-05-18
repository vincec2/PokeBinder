import type { Binder, BinderLayout, BinderSlot } from "../types/binder";
import { BINDER_LAYOUT_SLOT_COUNTS, MAX_BINDER_PAGES } from "../types/binder";

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

export function createSlotsForPage(
  layout: BinderLayout,
  pageNumber: number
): BinderSlot[] {
  const slotCount = BINDER_LAYOUT_SLOT_COUNTS[layout];

  return Array.from({ length: slotCount }, (_, index) =>
    createSlot(pageNumber, index + 1)
  );
}

export function createEmptySlots(
  layout: BinderLayout = "3x3",
  pageCount = MAX_BINDER_PAGES
): BinderSlot[] {
  return Array.from({ length: pageCount }, (_, pageIndex) =>
    createSlotsForPage(layout, pageIndex + 1)
  ).flat();
}

export function ensureSlotsForBinder(binder: Binder): Binder {
  const pageCount = binder.pageCount ?? MAX_BINDER_PAGES;
  const slotCount = BINDER_LAYOUT_SLOT_COUNTS[binder.layout];

  const existingSlotsByKey = new Map(
    binder.slots.map((slot) => [slot.slotKey, slot])
  );

  const completeSlots: BinderSlot[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    for (let slotNumber = 1; slotNumber <= slotCount; slotNumber += 1) {
      const emptySlot = createSlot(pageNumber, slotNumber);
      const existingSlot = existingSlotsByKey.get(emptySlot.slotKey);

      completeSlots.push(existingSlot ?? emptySlot);
    }
  }

  return {
    ...binder,
    pageCount,
    slots: completeSlots.sort(
      (a, b) => a.pageNumber - b.pageNumber || a.slotNumber - b.slotNumber
    ),
  };
}

export function normalizeBinder(binder: Binder): Binder {
  const normalizedBinder: Binder = {
    ...binder,
    layout: binder.layout ?? "3x3",
    pageCount: binder.pageCount ?? MAX_BINDER_PAGES,
    isPublic: binder.isPublic ?? false,
    shareId: binder.shareId ?? null,
    previewPageColor: binder.previewPageColor ?? DEFAULT_PREVIEW_PAGE_COLOR,
  };

  return ensureSlotsForBinder(normalizedBinder);
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
    pageCount: MAX_BINDER_PAGES,
    layout,
    slots: createEmptySlots(layout, MAX_BINDER_PAGES),
    isPublic: false,
    shareId: null,
    previewPageColor: DEFAULT_PREVIEW_PAGE_COLOR,
    updatedAt: new Date().toISOString(),
  };
}