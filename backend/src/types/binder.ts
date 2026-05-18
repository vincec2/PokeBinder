import type { CardStatus, PokemonCard } from "./card";

export type BinderLayout = "2x2" | "3x3";

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

export type BinderRecord = {
  userId: string;
  binderId: string;
  name: string;
  description: string;
  pageNumber: number;
  pageCount: number;
  layout: BinderLayout;
  previewPageColor: string;
  isPublic: boolean;

  // DynamoDB record:
  // Private binders omit this entirely.
  // Public binders store it as a real string.
  shareId?: string;

  createdAt: string;
  updatedAt: string;
};

export type BinderCardRecord = {
  binderId: string;
  slotKey: string;
  userId: string;
  cardId: string;
  cardName: string;
  setName: string;
  imageUrl: string;
  rarity?: string;
  pageNumber: number;
  slotNumber: number;
  status: CardStatus;
  quantity: number;
  condition?: string;
  notes: string;
  addedAt: string;
  updatedAt: string;
};

export type Binder = Omit<BinderRecord, "userId" | "createdAt" | "shareId"> & {
  // API response:
  // Frontend expects null when there is no share link.
  shareId: string | null;
  slots: BinderSlot[];
};