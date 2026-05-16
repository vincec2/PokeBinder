import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { BinderGrid } from "../components/BinderGrid";
import { BinderSidebar } from "../components/BinderSidebar";
import { CardSearch } from "../components/CardSearch";
import type { Binder, BinderLayout } from "../types/binder";
import { BINDER_LAYOUT_OPTIONS, BINDER_LAYOUT_SLOT_COUNTS } from "../types/binder";
import type { CardStatus, PokemonCard } from "../types/card";

type BinderEditorPageProps = {
  binders: Binder[];
  onSetActiveBinder: (binderId: string) => void;
  onCreateBinder: () => string;
  onDeleteBinder: (binderId: string) => string | null;
  onSelectCard: (binderId: string, slotKey: string, card: PokemonCard) => void;
  onRemoveCard: (binderId: string, slotKey: string) => void;
  onChangeStatus: (
    binderId: string,
    slotKey: string,
    status: CardStatus
  ) => void;
  onUpdateBinderName: (binderId: string, name: string) => void;
  onUpdateBinderDescription: (binderId: string, description: string) => void;
  onChangeLayout: (binderId: string, layout: BinderLayout) => void;
  onCreateShareLink: (binderId: string) => string;
  onDisableShareLink: (binderId: string) => void;
  onResetAllLocalData: () => void;
};

export function BinderEditorPage({
  binders,
  onSetActiveBinder,
  onCreateBinder,
  onDeleteBinder,
  onSelectCard,
  onRemoveCard,
  onChangeStatus,
  onUpdateBinderName,
  onUpdateBinderDescription,
  onChangeLayout,
  onCreateShareLink,
  onDisableShareLink,
  onResetAllLocalData,
}: BinderEditorPageProps) {
  const { binderId } = useParams();
  const navigate = useNavigate();
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

  const activeBinder = binders.find((binder) => binder.binderId === binderId);

  useEffect(() => {
    if (!activeBinder) {
      return;
    }

    onSetActiveBinder(activeBinder.binderId);
    setSelectedSlotKey(activeBinder.slots[0]?.slotKey ?? null);
  }, [activeBinder?.binderId]);

  useEffect(() => {
    if (!activeBinder) {
      return;
    }

    const visibleSlotCount = BINDER_LAYOUT_SLOT_COUNTS[activeBinder.layout];
    const selectedSlot = activeBinder.slots.find(
      (slot) => slot.slotKey === selectedSlotKey
    );

    if (!selectedSlot || selectedSlot.slotNumber > visibleSlotCount) {
      setSelectedSlotKey(activeBinder.slots[0]?.slotKey ?? null);
    }
  }, [activeBinder, selectedSlotKey]);

  function handleCreateBinder() {
    const newBinderId = onCreateBinder();
    navigate(`/binders/${newBinderId}`);
  }

  function handleDeleteBinder(deletedBinderId: string) {
    const nextBinderId = onDeleteBinder(deletedBinderId);

    if (deletedBinderId === activeBinder?.binderId && nextBinderId) {
      navigate(`/binders/${nextBinderId}`);
    }
  }

  function handleCreateShareLink() {
    if (!activeBinder) {
      return;
    }

    const shareId = onCreateShareLink(activeBinder.binderId);
    navigate(`/share/${shareId}`);
  }

  function handleCopyShareLink() {
    if (!activeBinder?.shareId) {
      return;
    }

    const shareUrl = `${window.location.origin}/share/${activeBinder.shareId}`;
    navigator.clipboard.writeText(shareUrl);
  }

  if (!activeBinder) {
    return (
      <main className="app-shell">
        <section className="not-found-card">
          <p className="eyebrow">Binder Not Found</p>
          <h1>This binder does not exist.</h1>
          <p>It may have been deleted, or the localStorage data may have changed.</p>

          <Link className="primary-button" to="/my-binders">
            Back to My Binders
          </Link>
        </section>
      </main>
    );
  }

  const selectedSlot = activeBinder.slots.find(
    (slot) => slot.slotKey === selectedSlotKey
  );

  const shareUrl = activeBinder.shareId
    ? `${window.location.origin}/share/${activeBinder.shareId}`
    : "";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">PokéBinder Prototype</p>
          <h1>{activeBinder.name}</h1>
          <p>{activeBinder.description}</p>
        </div>

        <div className="header-actions">
          <Link className="secondary-link-button" to="/my-binders">
            All Binders
          </Link>

          <button
            className="secondary-button"
            type="button"
            onClick={onResetAllLocalData}
          >
            Reset all local data
          </button>
        </div>
      </header>

      <div className="app-layout">
        <BinderSidebar
          binders={binders}
          activeBinderId={activeBinder.binderId}
          onCreateBinder={handleCreateBinder}
          onDeleteBinder={handleDeleteBinder}
        />

        <div className="main-workspace">
          <section className="binder-details-panel">
            <label>
              Binder name
              <input
                value={activeBinder.name}
                onChange={(event) =>
                  onUpdateBinderName(activeBinder.binderId, event.target.value)
                }
              />
            </label>

            <label>
              Description
              <textarea
                value={activeBinder.description}
                onChange={(event) =>
                  onUpdateBinderDescription(
                    activeBinder.binderId,
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Layout
              <select
                value={activeBinder.layout}
                onChange={(event) =>
                  onChangeLayout(
                    activeBinder.binderId,
                    event.target.value as BinderLayout
                  )
                }
              >
                {BINDER_LAYOUT_OPTIONS.map((layout) => (
                  <option key={layout} value={layout}>
                    {layout}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="share-panel">
            <div>
              <p className="eyebrow">Public Sharing</p>
              <h2>Read-only share link</h2>
              <p>
                This is a local prototype link for now. It will become a real
                public link once the backend is added.
              </p>
            </div>

            {activeBinder.isPublic && activeBinder.shareId ? (
              <div className="share-actions">
                <input readOnly value={shareUrl} />

                <Link className="primary-button" to={`/share/${activeBinder.shareId}`}>
                  View Share Page
                </Link>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleCopyShareLink}
                >
                  Copy Link
                </button>

                <button
                  className="danger-text-button"
                  type="button"
                  onClick={() => onDisableShareLink(activeBinder.binderId)}
                >
                  Disable
                </button>
              </div>
            ) : (
              <button
                className="primary-button button-reset"
                type="button"
                onClick={handleCreateShareLink}
              >
                Generate Share Link
              </button>
            )}
          </section>

          <section className="selected-slot-panel">
            <strong>Selected slot:</strong>{" "}
            {selectedSlot ? `Slot ${selectedSlot.slotNumber}` : "None selected"}
          </section>

          <div className="workspace-layout">
            <BinderGrid
              slots={activeBinder.slots}
              layout={activeBinder.layout}
              selectedSlotKey={selectedSlotKey}
              onSelectSlot={setSelectedSlotKey}
              onRemoveCard={(slotKey) =>
                onRemoveCard(activeBinder.binderId, slotKey)
              }
              onChangeStatus={(slotKey, status) =>
                onChangeStatus(activeBinder.binderId, slotKey, status)
              }
            />

            <CardSearch
              onSelectCard={(card) => {
                if (!selectedSlotKey) {
                  return;
                }

                onSelectCard(activeBinder.binderId, selectedSlotKey, card);
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}