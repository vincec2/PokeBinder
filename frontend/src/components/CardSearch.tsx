import { useMemo, useState } from "react";
import { mockCards } from "../data/mockCards";
import type { PokemonCard } from "../types/card";

type CardSearchProps = {
  onSelectCard: (card: PokemonCard) => void;
};

export function CardSearch({ onSelectCard }: CardSearchProps) {
  const [query, setQuery] = useState("");

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return mockCards;
    }

    return mockCards.filter((card) => {
      return (
        card.name.toLowerCase().includes(normalizedQuery) ||
        card.setName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query]);

  return (
    <section className="card-search-panel">
      <h2>Search cards</h2>

      <input
        className="search-input"
        type="search"
        placeholder="Search Charizard, Base Set..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="search-results">
        {filteredCards.map((card) => (
          <button
            className="search-result-card"
            key={card.cardId}
            type="button"
            onClick={() => onSelectCard(card)}
          >
            <img src={card.imageUrl} alt={card.name} />
            <span>
              <strong>{card.name}</strong>
              <small>{card.setName}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}