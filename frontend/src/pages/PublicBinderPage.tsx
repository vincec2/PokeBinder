import { Link, useParams } from "react-router";
import { StatusBadge } from "../components/StatusBadge";
import type { Binder } from "../types/binder";
import { BINDER_LAYOUT_SLOT_COUNTS } from "../types/binder";

type PublicBinderPageProps = {
  binders: Binder[];
};

export function PublicBinderPage({ binders }: PublicBinderPageProps) {
  const { shareId } = useParams();

  const binder = binders.find(
    (currentBinder) =>
      currentBinder.isPublic && currentBinder.shareId === shareId
  );

  if (!binder) {
    return (
      <main className="app-shell">
        <section className="not-found-card">
          <p className="eyebrow">Share Link Not Found</p>
          <h1>This public binder is not available.</h1>
          <p>
            The link may be wrong, disabled, or only available in another
            browser once the backend is added.
          </p>

          <Link className="primary-button" to="/">
            Go Home
          </Link>
        </section>
      </main>
    );
  }

  const visibleSlots = binder.slots.slice(0, BINDER_LAYOUT_SLOT_COUNTS[binder.layout]);
  const cardCount = visibleSlots.filter((slot) => slot.card).length;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Public PokéBinder</p>
          <h1>{binder.name}</h1>
          <p>{binder.description}</p>
        </div>

        <Link className="secondary-link-button" to="/">
          Back Home
        </Link>
      </header>

      <section className="public-binder-meta">
        <strong>{binder.layout} layout</strong>
        <span>
          {cardCount} card{cardCount === 1 ? "" : "s"} shown
        </span>
        <span>Read-only shared view</span>
      </section>

      <section className="binder-grid-section">
        <h2>Shared Binder Page 1</h2>

        <div className={`binder-grid layout-${binder.layout}`}>
          {visibleSlots.map((slot) => (
            <article className="public-card-slot" key={slot.slotKey}>
              {slot.card ? (
                <>
                  <img src={slot.card.imageUrl} alt={slot.card.name} />
                  <div className="slot-card-info">
                    <strong>{slot.card.name}</strong>
                    <small>{slot.card.setName}</small>
                    <StatusBadge status={slot.status} />
                  </div>
                </>
              ) : (
                <span className="empty-slot-text">Empty Slot</span>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}