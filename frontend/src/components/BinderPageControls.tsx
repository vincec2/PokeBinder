import { MAX_BINDER_PAGES } from "../types/binder";

type BinderPageControlsProps = {
  pageNumber: number;
  pageCount?: number;
  onChangePage: (pageNumber: number) => void;
};

export function BinderPageControls({
  pageNumber,
  pageCount = MAX_BINDER_PAGES,
  onChangePage,
}: BinderPageControlsProps) {
  return (
    <div className="binder-spread-controls">
      <button
        className="secondary-button"
        type="button"
        disabled={pageNumber <= 1}
        onClick={() => onChangePage(pageNumber - 1)}
      >
        Previous Page
      </button>

      <strong>
        Page {pageNumber} of {pageCount}
      </strong>

      <button
        className="secondary-button"
        type="button"
        disabled={pageNumber >= pageCount}
        onClick={() => onChangePage(pageNumber + 1)}
      >
        Next Page
      </button>
    </div>
  );
}