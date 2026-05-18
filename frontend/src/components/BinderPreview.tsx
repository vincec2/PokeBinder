import type { CSSProperties } from "react";
import type { Binder } from "../types/binder";
import { getBinderSpread } from "../types/binder";

type BinderPreviewProps = {
  binder: Pick<Binder, "layout" | "slots" | "previewPageColor">;
  spreadIndex: number;
};

export function BinderPreview({ binder, spreadIndex }: BinderPreviewProps) {
  const spread = getBinderSpread(spreadIndex);

  function renderPreviewPage(pageNumber: number) {
    const pageSlots = binder.slots
      .filter((slot) => slot.pageNumber === pageNumber)
      .sort((a, b) => a.slotNumber - b.slotNumber);

    return (
      <div
        className="binder-preview-page"
        style={
          {
            "--binder-preview-page-bg": binder.previewPageColor,
          } as CSSProperties
        }
      >
        <div className={`binder-preview-grid layout-${binder.layout}`}>
          {pageSlots.map((slot) => {
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
    );
  }

  return (
    <div className="binder-preview-shell">
      <div className="binder-preview-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div
        className={`binder-preview-spread ${
          spread.leftPageNumber === null ? "first-spread" : ""
        }`}
      >
        {spread.leftPageNumber === null ? (
          <div className="binder-preview-blank-page" aria-hidden="true" />
        ) : (
          renderPreviewPage(spread.leftPageNumber)
        )}

        {spread.rightPageNumber && renderPreviewPage(spread.rightPageNumber)}
      </div>
    </div>
  );
}