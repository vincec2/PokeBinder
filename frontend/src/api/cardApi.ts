import type { PokemonCard, PokemonSet } from "../types/card";

const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";
const POKEMON_TCG_CARDS_URL = `${POKEMON_TCG_API_BASE_URL}/cards`;
const POKEMON_TCG_SETS_URL = `${POKEMON_TCG_API_BASE_URL}/sets`;

type PokemonTcgApiCard = {
  id: string;
  name: string;
  rarity?: string;
  set?: {
    id?: string;
    name?: string;
  };
  images?: {
    small?: string;
    large?: string;
  };
};

type PokemonTcgApiSet = {
  id: string;
  name: string;
  series?: string;
};

type PokemonTcgSearchResponse = {
  data: PokemonTcgApiCard[];
};

type PokemonTcgSetsResponse = {
  data: PokemonTcgApiSet[];
};

function sanitizeSearchValue(value: string) {
  return value.trim().replaceAll('"', "");
}

function buildNameQuery(searchTerm: string) {
  const trimmedSearchTerm = sanitizeSearchValue(searchTerm);

  if (!trimmedSearchTerm) {
    return "";
  }

  if (trimmedSearchTerm.includes(" ")) {
    return `name:"${trimmedSearchTerm}"`;
  }

  return `name:${trimmedSearchTerm}*`;
}

function buildCardQuery(searchTerm: string, setId?: string) {
  const queryParts: string[] = [];

  const nameQuery = buildNameQuery(searchTerm);

  if (nameQuery) {
    queryParts.push(nameQuery);
  }

  if (setId) {
    queryParts.push(`set.id:${sanitizeSearchValue(setId)}`);
  }

  return queryParts.join(" ");
}

function mapApiCardToPokemonCard(card: PokemonTcgApiCard): PokemonCard | null {
  const imageUrl = card.images?.small ?? card.images?.large;

  if (!imageUrl) {
    return null;
  }

  return {
    cardId: card.id,
    name: card.name,
    setId: card.set?.id,
    setName: card.set?.name ?? "Unknown Set",
    imageUrl,
    rarity: card.rarity,
  };
}

function mapApiSetToPokemonSet(set: PokemonTcgApiSet): PokemonSet {
  return {
    setId: set.id,
    name: set.name,
    series: set.series,
  };
}

export async function getPokemonSets(): Promise<PokemonSet[]> {
  const params = new URLSearchParams({
    pageSize: "250",
    select: "id,name,series,releaseDate",
    orderBy: "-releaseDate",
  });

  const response = await fetch(`${POKEMON_TCG_SETS_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Set search failed with status ${response.status}`);
  }

  const data = (await response.json()) as PokemonTcgSetsResponse;

  return data.data.map(mapApiSetToPokemonSet);
}

export async function searchPokemonCards(
  searchTerm: string,
  setId?: string
): Promise<PokemonCard[]> {
  const query = buildCardQuery(searchTerm, setId);

  if (!query) {
    return [];
  }

  const params = new URLSearchParams({
    q: query,
    pageSize: "40",
    select: "id,name,set,images,rarity",
    orderBy: "name",
  });

  const response = await fetch(`${POKEMON_TCG_CARDS_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Card search failed with status ${response.status}`);
  }

  const data = (await response.json()) as PokemonTcgSearchResponse;

  return data.data
    .map(mapApiCardToPokemonCard)
    .filter((card): card is PokemonCard => card !== null);
}

export async function getPokemonCardsBySet(
  setId: string
): Promise<PokemonCard[]> {
  const trimmedSetId = setId.trim();

  if (!trimmedSetId) {
    return [];
  }

  const params = new URLSearchParams({
    q: `set.id:${trimmedSetId}`,
    pageSize: "250",
    select: "id,name,set,images,rarity",
    orderBy: "number",
  });

  const response = await fetch(`${POKEMON_TCG_CARDS_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Set card search failed with status ${response.status}`);
  }

  const data = (await response.json()) as PokemonTcgSearchResponse;

  return data.data
    .map(mapApiCardToPokemonCard)
    .filter((card): card is PokemonCard => card !== null);
}