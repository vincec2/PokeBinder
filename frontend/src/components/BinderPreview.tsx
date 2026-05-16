import type { CSSProperties } from "react";
import type { Binder } from "../types/binder";
import { BINDER_LAYOUT_SLOT_COUNTS } from "../types/binder";

type BinderPreviewProps = {
  binder: Pick<Binder, "layout" | "slots" | "previewPageColor">;
};

export function BinderPreview({ binder }: BinderPreviewProps) {
  const visibleSlots = binder.slots.slice(
    0,
    BINDER_LAYOUT_SLOT_COUNTS[binder.layout]
  );

  return (
    <div className="binder-preview-shell">
      <div className="binder-preview-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div
        className="binder-preview-page"
        style={
          {
            "--binder-preview-page-bg": binder.previewPageColor,
          } as CSSProperties
        }
      >
        <div className={`binder-preview-grid layout-${binder.layout}`}>
          {visibleSlots.map((slot) => {
            const showMissingOverlay = !!slot.card && slot.status === "missing";

            return (
              <div className="binder-preview-pocket" key={slot.slotKey}>
                {slot.card ? (
                  <div className="binder-preview-card">
                    <img src={slot.card.imageUrl} alt={slot.card.name} />

                    {showMissingOverlay && (
                      <div className="binder-preview-overlay">
                        <span>Missing</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="binder-preview-empty-card" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}