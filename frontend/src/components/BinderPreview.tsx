import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Binder } from "../types/binder";
import { getBinderSpread } from "../types/binder";

type BinderPreviewProps = {
  binder: Pick<
    Binder,
    "layout" | "slots" | "previewPageColor" | "binderColor" | "coverImageUrl" | "name"
  >;
  spreadIndex: number;
};

type TurningSide =
  | {
      kind: "page";
      pageNumber: number;
    }
  | {
      kind: "cover";
    }
  | {
      kind: "blank";
    };

type TurnState =
  | {
      id: number;
      kind: "page";
      direction: "next" | "previous";
      front: TurningSide;
      back: TurningSide;
    }
  | {
      id: number;
      kind: "cover";
      direction: "open" | "close";
      front: TurningSide;
      back: TurningSide;
    };

export function BinderPreview({ binder, spreadIndex }: BinderPreviewProps) {
  const spread = getBinderSpread(spreadIndex);

  const previousSpreadIndexRef = useRef(spreadIndex);
  const turnIdRef = useRef(0);
  const turnTimeoutRef = useRef<number | null>(null);
  const [turnState, setTurnState] = useState<TurnState | null>(null);

  useLayoutEffect(() => {
    const previousSpreadIndex = previousSpreadIndexRef.current;

    if (previousSpreadIndex === spreadIndex) {
      return;
    }

    turnIdRef.current += 1;
    const animationId = turnIdRef.current;

    const makePageSide = (pageNumber: number | null | undefined): TurningSide => {
      return pageNumber ? { kind: "page", pageNumber } : { kind: "blank" };
    };

    let nextTurnState: TurnState;

    if (previousSpreadIndex === -1 && spreadIndex >= 0) {
      // Cover -> first spread: show the cover first, then the blank inside cover.
      nextTurnState = {
        id: animationId,
        kind: "cover",
        direction: "open",
        front: { kind: "cover" },
        back: { kind: "blank" },
      };
    } else if (previousSpreadIndex >= 0 && spreadIndex === -1) {
      // First spread -> cover: show the blank inside first, then the cover.
      nextTurnState = {
        id: animationId,
        kind: "cover",
        direction: "close",
        front: { kind: "cover" },
        back: { kind: "blank" },
      };
    } else {
        const nextSpread = getBinderSpread(spreadIndex);
        const direction = spreadIndex > previousSpreadIndex ? "next" : "previous";

        // For normal page turns, the moving sheet should show the destination page
        // immediately. Using the same side for front and back prevents the old page
        // from appearing mirrored during the flip.
        const destinationSide =
          direction === "next"
            ? makePageSide(nextSpread.leftPageNumber)
            : makePageSide(nextSpread.rightPageNumber);

        nextTurnState = {
          id: animationId,
          kind: "page",
          direction,
          front: destinationSide,
          back: destinationSide,
        };
      }

    setTurnState(nextTurnState);
    previousSpreadIndexRef.current = spreadIndex;

    if (turnTimeoutRef.current !== null) {
      window.clearTimeout(turnTimeoutRef.current);
    }

    turnTimeoutRef.current = window.setTimeout(() => {
      setTurnState((current) => {
        return current?.id === animationId ? null : current;
      });
    }, 760);

    return () => {
      if (turnTimeoutRef.current !== null) {
        window.clearTimeout(turnTimeoutRef.current);
      }
    };
  }, [spreadIndex]);

  function renderCoverArt() {
    return (
      <div className="binder-preview-cover">
        {binder.coverImageUrl ? (
          <img
            className="binder-preview-cover-image"
            src={binder.coverImageUrl}
            alt={`${binder.name} cover`}
          />
        ) : (
          <div
            className="binder-preview-cover-placeholder"
            style={
              {
                "--binder-cover-bg": binder.binderColor,
              } as CSSProperties
            }
          >
            <span>No cover image yet</span>
          </div>
        )}
      </div>
    );
  }

  function renderTurningSide(side: TurningSide) {
    if (side.kind === "cover") {
      return renderCoverArt();
    }

    if (side.kind === "page") {
      return renderPreviewPage(side.pageNumber);
    }

    return <div className="binder-turning-blank-face" />;
  }

  function renderCover() {
    const isClosingCover =
      turnState?.kind === "cover" && turnState.direction === "close";

    return (
      <div className="binder-closed-cover-shell">
        <div
          className={`binder-cover-stage ${
            isClosingCover ? "binder-cover-stage-closing" : ""
          }`}
        >
          {renderCoverArt()}

          {isClosingCover && (
            <div
              key={turnState.id}
              className="binder-cover-close-sheet"
              style={
                {
                  "--binder-preview-page-bg": binder.previewPageColor,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <div className="binder-turning-page-face binder-turning-page-front">
                {renderTurningSide(turnState.front)}
              </div>

              <div className="binder-turning-page-face binder-turning-page-back">
                {renderTurningSide(turnState.back)}
              </div>

              <div className="binder-turning-page-shadow" />
            </div>
          )}
        </div>
      </div>
    );
  }

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
            if (slot.coveredBySlotKey) {
              return null;
            }

            const showMissingOverlay = !!slot.card && slot.status === "missing";

            return (
              <div
                className={`binder-preview-pocket ${
                  slot.image ? "binder-preview-image-pocket" : ""
                }`}
                key={slot.slotKey}
              >
                {slot.image ? (
                  <div className="binder-preview-card binder-preview-custom-image">
                    {slot.image.imageUrl ? (
                      <img src={slot.image.imageUrl} alt={slot.image.fileName} />
                    ) : (
                      <div className="binder-preview-empty-card" />
                    )}
                  </div>
                ) : slot.card ? (
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

  if (spreadIndex === -1) {
    return renderCover();
  }

  return (
    <div
      className="binder-preview-shell"
      style={
        {
          "--binder-shell-bg": binder.binderColor,
        } as CSSProperties
      }
    >
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

        {turnState?.kind === "page" && (
          <div
            key={turnState.id}
            className={`binder-turning-sheet binder-turning-sheet-${turnState.direction}`}
            style={
              {
                "--binder-preview-page-bg": binder.previewPageColor,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <div className="binder-turning-page-face binder-turning-page-front">
              {renderTurningSide(turnState.front)}
            </div>

            <div className="binder-turning-page-face binder-turning-page-back">
              {renderTurningSide(turnState.back)}
            </div>

            <div className="binder-turning-page-shadow" />
          </div>
        )}

        {turnState?.kind === "cover" && turnState.direction === "open" && (
          <div
            key={turnState.id}
            className="binder-cover-turn-sheet binder-cover-turn-sheet-open"
            style={
              {
                "--binder-preview-page-bg": binder.previewPageColor,
              } as CSSProperties
            }
            aria-hidden="true"
          >
            <div className="binder-turning-page-face binder-turning-page-front">
              {renderTurningSide(turnState.front)}
            </div>

            <div className="binder-turning-page-face binder-turning-page-back">
              {renderTurningSide(turnState.back)}
            </div>

            <div className="binder-turning-page-shadow" />
          </div>
        )}
      </div>
    </div>
  );
}