import type { CardStatus, PokemonCard } from "./card";

export type BinderLayout = "2x2" | "3x3";

export const BINDER_LAYOUT_OPTIONS: BinderLayout[] = ["2x2", "3x3"];

export const BINDER_LAYOUT_SLOT_COUNTS: Record<BinderLayout, number> = {
  "2x2": 4,
  "3x3": 9,
};

export const MAX_BINDER_PAGES = 5;

export const BINDER_SPREAD_COUNT = Math.ceil(MAX_BINDER_PAGES / 2);

export type BinderSpread = {
  spreadIndex: number;
  leftPageNumber: number | null;
  rightPageNumber: number | null;
  label: string;
};

export function getBinderSpread(spreadIndex: number): BinderSpread {
  if (spreadIndex === 0) {
    return {
      spreadIndex,
      leftPageNumber: null,
      rightPageNumber: 1,
      label: "Page 1",
    };
  }

  const leftPageNumber = spreadIndex * 2;
  const rightPageNumber = leftPageNumber + 1;

  return {
    spreadIndex,
    leftPageNumber,
    rightPageNumber:
      rightPageNumber <= MAX_BINDER_PAGES ? rightPageNumber : null,
    label:
      rightPageNumber <= MAX_BINDER_PAGES
        ? `Pages ${leftPageNumber}-${rightPageNumber}`
        : `Page ${leftPageNumber}`,
  };
}

export type BinderSlot = {
  slotKey: string;
  pageNumber: number;
  slotNumber: number;
  card: PokemonCard | null;
  status: CardStatus;
  quantity: number;
  notes: string;
  updatedAt: string;
};

export type Binder = {
  binderId: string;
  name: string;
  description: string;
  pageNumber: number;
  pageCount: number;
  layout: BinderLayout;
  slots: BinderSlot[];
  isPublic: boolean;
  shareId: string | null;
  previewPageColor: string;
  updatedAt: string;
};