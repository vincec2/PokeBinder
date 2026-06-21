import type { CardStatus, PokemonCard } from "./card";

export type BinderLayout = "2x2" | "3x3";

export type BinderSlotImage = {
  imageKey: string;
  imageUrl: string | null;
  fileName: string;
  span: 1 | 2;
};

export type BinderSlot = {
  slotKey: string;
  pageNumber: number;
  slotNumber: number;
  card: PokemonCard | null;
  image: BinderSlotImage | null;
  coveredBySlotKey: string | null;
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
  binderColor?: string;
  isPublic: boolean;
  shareId?: string;
  coverImageKey?: string;
  createdAt: string;
  updatedAt: string;
};

export type BinderCardRecord = {
  binderId: string;
  slotKey: string;
  userId: string;

  slotType?: "card" | "image" | "covered";

  cardId?: string;
  cardName?: string;
  setName?: string;
  imageUrl?: string;
  rarity?: string;

  slotImageKey?: string;
  slotImageFileName?: string;
  slotImageSpan?: 1 | 2;
  coveredBySlotKey?: string;

  pageNumber: number;
  slotNumber: number;
  status: CardStatus;
  quantity: number;
  condition?: string;
  notes: string;
  addedAt: string;
  updatedAt: string;
};

export type Binder = Omit<
  BinderRecord,
  "userId" | "createdAt" | "shareId" | "coverImageKey"
> & {
  shareId: string | null;
  coverImageKey: string | null;
  coverImageUrl: string | null;
  binderColor: string;
  slots: BinderSlot[];
};