import type { BinderSlot } from "../types/binder";
import type { CardStatus } from "../types/card";
import { CARD_STATUSES, CARD_STATUS_LABELS } from "../types/card";
import { StatusBadge } from "./StatusBadge";

type CardSlotProps = {
  slot: BinderSlot;
  isSelected: boolean;
  onSelectSlot: (slotKey: string) => void;
  onRemoveCard: (slotKey: string) => void;
  onChangeStatus: (slotKey: string, status: CardStatus) => void;
};

export function CardSlot({
  slot,
  isSelected,
  onSelectSlot,
  onRemoveCard,
  onChangeStatus,
}: CardSlotProps) {
  return (
    <div className={`card-slot ${isSelected ? "selected" : ""}`}>
      <button
        className="slot-main-button"
        type="button"
        onClick={() => onSelectSlot(slot.slotKey)}
      >
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
          <span className="empty-slot-text">Slot {slot.slotNumber}</span>
        )}
      </button>

      {slot.card && (
        <div className="slot-actions">
          <select
            value={slot.status}
            onChange={(event) =>
              onChangeStatus(slot.slotKey, event.target.value as CardStatus)
            }
          >
            {CARD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CARD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => onRemoveCard(slot.slotKey)}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}