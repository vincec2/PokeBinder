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
  layout: BinderLayout;
  isPublic: boolean;
  shareId: string | null;
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

export type Binder = BinderRecord & {
  slots: BinderSlot[];
};