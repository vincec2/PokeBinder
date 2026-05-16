import { Link, useNavigate } from "react-router";
import type { Binder } from "../types/binder";

type MyBindersPageProps = {
  binders: Binder[];
  onCreateBinder: () => string;
  onDeleteBinder: (binderId: string) => string | null;
  onResetAllLocalData: () => void;
};

export function MyBindersPage({
  binders,
  onCreateBinder,
  onDeleteBinder,
  onResetAllLocalData,
}: MyBindersPageProps) {
  const navigate = useNavigate();

  function handleCreateBinder() {
    const newBinderId = onCreateBinder();
    navigate(`/binders/${newBinderId}`);
  }

  function handleDeleteBinder(binderId: string) {
    const nextBinderId = onDeleteBinder(binderId);

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
          <button className="primary-button button-reset" type="button" onClick={handleCreateBinder}>
            New Binder
          </button>

          <button
            className="secondary-button"
            type="button"
            onClick={onResetAllLocalData}
          >
            Reset all local data
          </button>
        </div>
      </header>

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