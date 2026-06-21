import type { BinderLayout, BinderSlot } from "../types/binder";
import { BINDER_LAYOUT_SLOT_COUNTS } from "../types/binder";
import type { CardStatus } from "../types/card";
import { CardSlot } from "./CardSlot.tsx";

type BinderGridProps = {
  slots: BinderSlot[];
  layout: BinderLayout;
  pageNumber?: number;
  selectedSlotKey: string | null;
  onSelectSlot: (slotKey: string) => void;
  onRemoveCard: (slotKey: string) => void;
  onChangeStatus: (slotKey: string, status: CardStatus) => void;
  onRemoveSlotImage: (slotKey: string) => void;
};

export function BinderGrid({
  slots,
  layout,
  pageNumber,
  selectedSlotKey,
  onSelectSlot,
  onRemoveCard,
  onChangeStatus,
  onRemoveSlotImage,
}: BinderGridProps) {
  const pageSlots = slots
    .filter((slot) => (pageNumber ? slot.pageNumber === pageNumber : true))
    .sort((a, b) => a.slotNumber - b.slotNumber)
    .slice(0, BINDER_LAYOUT_SLOT_COUNTS[layout]);

  return (
    <section className="binder-grid-section">
      <h2>{pageNumber ? `Binder Page ${pageNumber}` : "Binder Page"}</h2>

      <div className={`binder-grid layout-${layout}`}>
        {pageSlots.map((slot) => {
          if (slot.coveredBySlotKey) {
            return null;
          }

          if (slot.image) {
            return (
              <div
                key={slot.slotKey}
                className={`card-slot image-slot ${
                  slot.slotKey === selectedSlotKey ? "selected" : ""
                }`}
              >
                <button
                  className="slot-main-button image-slot-button"
                  type="button"
                  onClick={() => onSelectSlot(slot.slotKey)}
                >
                  {slot.image.imageUrl ? (
                    <img
                      src={slot.image.imageUrl}
                      alt={slot.image.fileName}
                    />
                  ) : (
                    <span className="empty-slot-text">Image unavailable</span>
                  )}

                  <span className="slot-card-info">
                    <strong>{slot.image.fileName}</strong>
                    <small>
                      Page {slot.pageNumber}, slot {slot.slotNumber}
                    </small>
                  </span>
                </button>

                <button
                  className="remove-image-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveSlotImage(slot.slotKey);
                  }}
                >
                  Remove image
                </button>
              </div>
            );
          }

          return (
            <CardSlot
              key={slot.slotKey}
              slot={slot}
              isSelected={slot.slotKey === selectedSlotKey}
              onSelectSlot={onSelectSlot}
              onRemoveCard={onRemoveCard}
              onChangeStatus={onChangeStatus}
            />
          );
        })}
      </div>
    </section>
  );
}