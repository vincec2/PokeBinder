import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
import {
  getPokemonCardsBySet,
  getPokemonSets,
  searchPokemonCards,
} from "../api/cardApi";
import type { PokemonCard, PokemonSet } from "../types/card";

type CardSearchProps = {
  onSelectCard: (card: PokemonCard) => void;
};

export function CardSearch({ onSelectCard }: CardSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [selectedSetCards, setSelectedSetCards] = useState<PokemonCard[]>([]);
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [isLoadingSetCards, setIsLoadingSetCards] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [setListErrorMessage, setSetListErrorMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSets() {
      setIsLoadingSets(true);
      setSetListErrorMessage(null);

      try {
        const pokemonSets = await getPokemonSets();

        if (isMounted) {
          setSets(pokemonSets);
        }
      } catch (error) {
        if (isMounted) {
          setSetListErrorMessage(
            error instanceof Error ? error.message : "Set list failed to load."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingSets(false);
        }
      }
    }

    void loadSets();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedSetCards() {
      if (!selectedSetId) {
        setSelectedSetCards([]);
        setIsLoadingSetCards(false);
        return;
      }

      setIsLoadingSetCards(true);
      setErrorMessage(null);
      setResults([]);

      try {
        const cards = await getPokemonCardsBySet(selectedSetId);

        if (isMounted) {
          setSelectedSetCards(cards);
        }
      } catch (error) {
        if (isMounted) {
          setSelectedSetCards([]);
          setErrorMessage(
            error instanceof Error ? error.message : "Set cards failed to load."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingSetCards(false);
        }
      }
    }

    void loadSelectedSetCards();

    return () => {
      isMounted = false;
    };
  }, [selectedSetId]);

  const selectedSetFuse = useMemo(() => {
    return new Fuse(selectedSetCards, {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "setName", weight: 0.2 },
        { name: "rarity", weight: 0.1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [selectedSetCards]);

  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();

    if (trimmedSearchTerm.length < 2 && !selectedSetId) {
      setResults([]);
      setIsSearching(false);
      setErrorMessage(null);
      return;
    }

    const searchTimeout = window.setTimeout(async () => {
      setIsSearching(true);
      setErrorMessage(null);

      try {
        if (selectedSetId) {
          if (isLoadingSetCards) {
            return;
          }

          if (trimmedSearchTerm.length < 2) {
            setResults(selectedSetCards);
          } else {
            const fuzzyResults = selectedSetFuse.search(trimmedSearchTerm, {
              limit: 40,
            });

            setResults(fuzzyResults.map((result) => result.item));
          }

          return;
        }

        const cards = await searchPokemonCards(trimmedSearchTerm);
        setResults(cards);
      } catch (error) {
        setResults([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Card search failed."
        );
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(searchTimeout);
  }, [
    searchTerm,
    selectedSetId,
    selectedSetCards,
    selectedSetFuse,
    isLoadingSetCards,
  ]);

  const groupedSets = useMemo(() => {
    return sets.reduce<Record<string, PokemonSet[]>>((groups, set) => {
      const groupName = set.series ?? "Other";

      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      groups[groupName].push(set);
      return groups;
    }, {});
  }, [sets]);

  const hasSearchInput = searchTerm.trim().length >= 2 || !!selectedSetId;

  return (
    <aside className="card-search-panel">
      <div>
        <p className="eyebrow">Card Search</p>
        <h2>Find Pokémon cards</h2>
        <p>
          Search by name, narrow by set, then click a result to place it in the
          selected slot.
        </p>
      </div>

      <label>
        Search by card name
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Try Charizard, Pikachu, Mew..."
        />
      </label>

      <label>
        Filter by set
        <select
          value={selectedSetId}
          onChange={(event) => setSelectedSetId(event.target.value)}
          disabled={isLoadingSets}
        >
          <option value="">
            {isLoadingSets ? "Loading sets..." : "All sets"}
          </option>

          {Object.entries(groupedSets).map(([series, seriesSets]) => (
            <optgroup key={series} label={series}>
              {seriesSets.map((set) => (
                <option key={set.setId} value={set.setId}>
                  {set.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {setListErrorMessage && (
        <p className="form-error">{setListErrorMessage}</p>
      )}

      {(isSearching || isLoadingSetCards) && (
        <p className="search-helper-text">
          {isLoadingSetCards ? "Loading set cards..." : "Searching cards..."}
        </p>
      )}

      {errorMessage && <p className="form-error">{errorMessage}</p>}

      {!isSearching &&
        !isLoadingSetCards &&
        !errorMessage &&
        hasSearchInput &&
        results.length === 0 && (
          <p className="search-helper-text">No cards found.</p>
        )}

      <div className="card-search-results">
        {results.map((card) => (
          <button
            className="search-result-card"
            type="button"
            key={card.cardId}
            onClick={() => onSelectCard(card)}
          >
            <img src={card.imageUrl} alt={card.name} />

            <span>
              <strong>{card.name}</strong>
              <small>{card.setName}</small>
              {card.rarity && <small>{card.rarity}</small>}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}