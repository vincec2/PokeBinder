import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { BinderGrid } from "../components/BinderGrid";
import { BinderSidebar } from "../components/BinderSidebar";
import { CardSearch } from "../components/CardSearch";
import { BinderPreview } from "../components/BinderPreview";
import { BinderSpreadControls } from "../components/BinderSpreadControls";
import { BinderPageControls } from "../components/BinderPageControls";
import type { Binder, BinderLayout } from "../types/binder";
import type { CardStatus, PokemonCard } from "../types/card";

type BinderEditorPageProps = {
  binders: Binder[];
  onSetActiveBinder: (binderId: string) => void;
  onCreateBinder: (layout: BinderLayout) => string;
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
  onCreateShareLink: (binderId: string) => string;
  onDisableShareLink: (binderId: string) => void;
  onResetAllLocalData: () => void;
  onUpdatePreviewPageColor: (
    binderId: string,
    previewBackgroundColor: string
  ) => void;
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
  onCreateShareLink,
  onDisableShareLink,
  onResetAllLocalData,
  onUpdatePreviewPageColor,
}: BinderEditorPageProps) {
  const { binderId } = useParams();
  const navigate = useNavigate();
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [previewSpreadIndex, setPreviewSpreadIndex] = useState(0);

  const activeBinder = binders.find((binder) => binder.binderId === binderId);

  function getSpreadIndexForPage(pageNumber: number) {
    if (pageNumber === 1) {
      return 0;
    }

    return Math.floor(pageNumber / 2);
  }

  useEffect(() => {
    if (!activeBinder) {
      return;
    }

    onSetActiveBinder(activeBinder.binderId);
    setCurrentPageNumber(1);
    setPreviewSpreadIndex(0);

    const firstVisibleSlot =
      activeBinder.slots.find((slot) => slot.pageNumber === 1) ??
      activeBinder.slots[0];

    setSelectedSlotKey(firstVisibleSlot?.slotKey ?? null);
  }, [activeBinder?.binderId]);

  useEffect(() => {
    if (!activeBinder) {
      return;
    }

    const currentPageSlots = activeBinder.slots
      .filter((slot) => slot.pageNumber === currentPageNumber)
      .sort((a, b) => a.slotNumber - b.slotNumber);

    const selectedSlot = activeBinder.slots.find(
      (slot) => slot.slotKey === selectedSlotKey
    );

    const selectedSlotIsOnCurrentPage =
      !!selectedSlot && selectedSlot.pageNumber === currentPageNumber;

    if (!selectedSlotIsOnCurrentPage) {
      setSelectedSlotKey(currentPageSlots[0]?.slotKey ?? null);
    }
  }, [activeBinder, selectedSlotKey, currentPageNumber]);

  function handleCreateBinder(layout: BinderLayout) {
    const newBinderId = onCreateBinder(layout);
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
            onClick={() => {
              setPreviewSpreadIndex(getSpreadIndexForPage(currentPageNumber));
              setIsPreviewOpen(true);
            }}
          >
            Preview Binder
          </button>

          <input
            className="preview-color-picker"
            type="color"
            aria-label="Preview page colour"
            title="Preview page colour"
            value={activeBinder.previewPageColor}
            onChange={(event) =>
              onUpdatePreviewPageColor(
                activeBinder.binderId,
                event.target.value
              )
            }
          />

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
            {selectedSlot
              ? `Page ${selectedSlot.pageNumber}, Slot ${selectedSlot.slotNumber}`
              : "None selected"}
          </section>

          <div className="workspace-layout">
            <div>
              <BinderPageControls
                pageNumber={currentPageNumber}
                pageCount={activeBinder.pageCount}
                onChangePage={setCurrentPageNumber}
              />

              <BinderGrid
                slots={activeBinder.slots}
                layout={activeBinder.layout}
                pageNumber={currentPageNumber}
                selectedSlotKey={selectedSlotKey}
                onSelectSlot={setSelectedSlotKey}
                onRemoveCard={(slotKey) =>
                  onRemoveCard(activeBinder.binderId, slotKey)
                }
                onChangeStatus={(slotKey, status) =>
                  onChangeStatus(activeBinder.binderId, slotKey, status)
                }
              />
            </div>

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

      {isPreviewOpen && (
        <div
          className="preview-modal-backdrop"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="preview-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="preview-modal-header">
              <div>
                <p className="eyebrow">Binder Preview</p>
                <h2>{activeBinder.name}</h2>
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close
              </button>
            </div>

            <BinderSpreadControls
              spreadIndex={previewSpreadIndex}
              onChangeSpread={setPreviewSpreadIndex}
            />

            <BinderPreview binder={activeBinder} spreadIndex={previewSpreadIndex} />
          </div>
        </div>
      )}
    </main>
  );
}