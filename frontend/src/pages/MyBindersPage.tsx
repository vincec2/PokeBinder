import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Binder, BinderLayout } from "../types/binder";
import { LogoutButton } from "../components/LogoutButton";

type MyBindersPageProps = {
  binders: Binder[];
  onCreateBinder: (layout: BinderLayout) => Promise<string>;
  onDeleteBinder: (binderId: string) => Promise<string | null>;
  onResetAllLocalData: () => void;
};

export function MyBindersPage({
  binders,
  onCreateBinder,
  onDeleteBinder,
  onResetAllLocalData,
}: MyBindersPageProps) {
  const navigate = useNavigate();
  const [isChoosingLayout, setIsChoosingLayout] = useState(false);

  async function handleCreateBinder(layout: BinderLayout) {
    const newBinderId = await onCreateBinder(layout);
    navigate(`/binders/${newBinderId}`);
  }

  async function handleDeleteBinder(binderId: string) {
    const nextBinderId = await onDeleteBinder(binderId);

    if (nextBinderId) {
      navigate("/my-binders");
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">My Binders</p>
          <h1>Your local collection</h1>
          <p>Choose a binder to edit, or create a new one.</p>
        </div>

        <div className="header-actions">
          <button
            className="primary-button button-reset"
            type="button"
            onClick={() => setIsChoosingLayout((current) => !current)}
          >
            New Binder
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={onResetAllLocalData}
          >
            Reset all local data
          </button>

          <LogoutButton />
        </div>
      </header>

      {isChoosingLayout && (
        <section className="new-binder-page-panel">
          <div>
            <p className="eyebrow">Choose Layout</p>
            <h2>Create a new binder</h2>
            <p>Select the binder size now. You will not be able to change it later.</p>
          </div>

          <div className="new-binder-page-actions">
            <button type="button" onClick={() => handleCreateBinder("2x2")}>
              Create 2x2 Binder
            </button>

            <button type="button" onClick={() => handleCreateBinder("3x3")}>
              Create 3x3 Binder
            </button>
          </div>
        </section>
      )}

      <section className="binder-card-grid">
        {binders.map((binder) => {
          const cardCount = binder.slots.filter((slot) => slot.card).length;

          return (
            <article className="binder-summary-card" key={binder.binderId}>
              <div>
                <p className="eyebrow">{binder.layout} Binder</p>
                <h2>{binder.name}</h2>
                <p>{binder.description}</p>
                <small>
                  {cardCount} card{cardCount === 1 ? "" : "s"} added
                </small>
              </div>

              <div className="binder-summary-actions">
                <Link className="primary-button" to={`/binders/${binder.binderId}`}>
                  Open Binder
                </Link>

                {binders.length > 1 && (
                  <button
                    className="danger-text-button"
                    type="button"
                    onClick={() => handleDeleteBinder(binder.binderId)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}