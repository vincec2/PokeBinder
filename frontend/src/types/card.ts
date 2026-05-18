export type CardStatus = "owned" | "missing" | "wishlist" | "duplicate";

export type PokemonCard = {
  cardId: string;
  name: string;
  setId?: string;
  setName: string;
  imageUrl: string;
  rarity?: string;
};

export type PokemonSet = {
  setId: string;
  name: string;
  series?: string;
};

export const CARD_STATUSES: CardStatus[] = [
  "owned",
  "missing",
  "wishlist",
  "duplicate",
];

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  owned: "Owned",
  missing: "Missing",
  wishlist: "Wishlist",
  duplicate: "Duplicate",
};