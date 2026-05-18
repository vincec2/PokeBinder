import type { BinderLayout, BinderSlot } from "../types/binder";
import type { CardStatus } from "../types/card";
import { CardSlot } from "./CardSlot.tsx";

type BinderGridProps = {
  slots: BinderSlot[];
  layout: BinderLayout;
  pageNumber: number;
  selectedSlotKey: string | null;
  onSelectSlot: (slotKey: string) => void;
  onRemoveCard: (slotKey: string) => void;
  onChangeStatus: (slotKey: string, status: CardStatus) => void;
};

export function BinderGrid({
  slots,
  layout,
  pageNumber,
  selectedSlotKey,
  onSelectSlot,
  onRemoveCard,
  onChangeStatus,
}: BinderGridProps) {
  const visibleSlots = slots
    .filter((slot) => slot.pageNumber === pageNumber)
    .sort((a, b) => a.slotNumber - b.slotNumber);

  return (
    <section className="binder-grid-section">
      <h2>Page {pageNumber}</h2>

      <div className={`binder-grid layout-${layout}`}>
        {visibleSlots.map((slot) => (
          <CardSlot
            key={slot.slotKey}
            slot={slot}
            isSelected={slot.slotKey === selectedSlotKey}
            onSelectSlot={onSelectSlot}
            onRemoveCard={onRemoveCard}
            onChangeStatus={onChangeStatus}
          />
        ))}
      </div>
    </section>
  );
}