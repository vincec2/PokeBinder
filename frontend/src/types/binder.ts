import type { CardStatus, PokemonCard } from "./card";

export type BinderLayout = "2x2" | "3x3";

export const BINDER_LAYOUT_OPTIONS: BinderLayout[] = ["2x2", "3x3"];

export const BINDER_LAYOUT_SLOT_COUNTS: Record<BinderLayout, number> = {
  "2x2": 4,
  "3x3": 9,
};

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
  layout: BinderLayout;
  slots: BinderSlot[];
  isPublic: boolean;
  shareId: string | null;
  updatedAt: string;
};