export type CardStatus = "owned" | "missing" | "wishlist" | "duplicate";

export type PokemonCard = {
  cardId: string;
  name: string;
  setName: string;
  imageUrl: string;
  rarity?: string;
};