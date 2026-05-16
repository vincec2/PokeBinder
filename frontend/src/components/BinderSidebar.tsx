import { useState } from "react";
import { Link } from "react-router";
import type { Binder, BinderLayout } from "../types/binder";

type BinderSidebarProps = {
  binders: Binder[];
  activeBinderId?: string;
  onCreateBinder: (layout: BinderLayout) => void;
  onDeleteBinder: (binderId: string) => void;
};

export function BinderSidebar({
  binders,
  activeBinderId,
  onCreateBinder,
  onDeleteBinder,
}: BinderSidebarProps) {
  const [isChoosingLayout, setIsChoosingLayout] = useState(false);

  function handleCreateBinder(layout: BinderLayout) {
    onCreateBinder(layout);
    setIsChoosingLayout(false);
  }

  return (
    <aside className="binder-sidebar">
      <div className="binder-sidebar-header">
        <div>
          <p className="eyebrow">My Binders</p>
          <h2>Collection</h2>
        </div>

        <button type="button" onClick={() => setIsChoosingLayout((current) => !current)}>
          New
        </button>
      </div>

      {isChoosingLayout && (
        <div className="new-binder-layout-panel">
          <p>Choose binder size</p>

          <div className="new-binder-layout-actions">
            <button type="button" onClick={() => handleCreateBinder("2x2")}>
              2x2
            </button>

            <button type="button" onClick={() => handleCreateBinder("3x3")}>
              3x3
            </button>
          </div>
        </div>
      )}

      <div className="binder-list">
        {binders.map((binder) => (
          <div
            className={`binder-list-item ${
              binder.binderId === activeBinderId ? "active" : ""
            }`}
            key={binder.binderId}
          >
            <Link className="binder-list-link" to={`/binders/${binder.binderId}`}>
              <strong>{binder.name}</strong>
              <small>{binder.slots.filter((slot) => slot.card).length} cards</small>
            </Link>

            {binders.length > 1 && (
              <button
                className="delete-binder-button"
                type="button"
                onClick={() => onDeleteBinder(binder.binderId)}
                aria-label={`Delete ${binder.name}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}