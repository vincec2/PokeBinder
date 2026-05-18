import { Link, useParams } from "react-router";
import { useState } from "react";
import { BinderSpreadControls } from "../components/BinderSpreadControls";
import { BinderPreview } from "../components/BinderPreview";
import type { Binder } from "../types/binder";

type PublicBinderPageProps = {
  binders: Binder[];
};

export function PublicBinderPage({ binders }: PublicBinderPageProps) {
  const { shareId } = useParams();
  const [spreadIndex, setSpreadIndex] = useState(0);

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

  const cardCount = binder.slots.filter((slot) => slot.card).length;

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
        <h2>Shared Binder Preview</h2>
        <BinderSpreadControls
          spreadIndex={spreadIndex}
          onChangeSpread={setSpreadIndex}
        />

        <BinderPreview binder={binder} spreadIndex={spreadIndex} />
      </section>
    </main>
  );
}