import type { BinderLayout, BinderSlot } from "../types/binder";
import { BINDER_LAYOUT_SLOT_COUNTS } from "../types/binder";
import type { CardStatus } from "../types/card";
import { CardSlot } from "./CardSlot.tsx";

type BinderGridProps = {
  slots: BinderSlot[];
  layout: BinderLayout;
  selectedSlotKey: string | null;
  onSelectSlot: (slotKey: string) => void;
  onRemoveCard: (slotKey: string) => void;
  onChangeStatus: (slotKey: string, status: CardStatus) => void;
};

export function BinderGrid({
  slots,
  layout,
  selectedSlotKey,
  onSelectSlot,
  onRemoveCard,
  onChangeStatus,
}: BinderGridProps) {
  const visibleSlots = slots.slice(0, BINDER_LAYOUT_SLOT_COUNTS[layout]);

  return (
    <section className="binder-grid-section">
      <h2>Binder Page 1</h2>

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