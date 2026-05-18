import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { BinderPreview } from "../components/BinderPreview";
import { BinderSpreadControls } from "../components/BinderSpreadControls";
import { getPublicBinder } from "../api/binderApi";
import type { Binder } from "../types/binder";
import { normalizeBinder } from "../lib/binderUtils";

export function PublicBinderPage() {
  const { shareId } = useParams();
  const [binder, setBinder] = useState<Binder | null>(null);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPublicBinder() {
      if (!shareId) {
        setErrorMessage("Missing share link.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const publicBinder = await getPublicBinder(shareId);
        setBinder(normalizeBinder(publicBinder));
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load public binder."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPublicBinder();
  }, [shareId]);

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="not-found-card">
          <p className="eyebrow">Loading</p>
          <h1>Loading shared binder...</h1>
        </section>
      </main>
    );
  }

  if (errorMessage || !binder) {
    return (
      <main className="app-shell">
        <section className="not-found-card">
          <p className="eyebrow">Shared Binder Not Found</p>
          <h1>This public binder is unavailable.</h1>
          <p>{errorMessage ?? "The link may be disabled or invalid."}</p>

          <Link className="primary-button" to="/">
            Back Home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Public Binder</p>
          <h1>{binder.name}</h1>
          <p>{binder.description}</p>
        </div>

        <div className="header-actions">
          <Link className="secondary-link-button" to="/">
            Back Home
          </Link>
        </div>
      </header>

      <section className="public-binder-preview">
        <BinderSpreadControls
          spreadIndex={spreadIndex}
          onChangeSpread={setSpreadIndex}
        />

        <BinderPreview binder={binder} spreadIndex={spreadIndex} />
      </section>
    </main>
  );
}