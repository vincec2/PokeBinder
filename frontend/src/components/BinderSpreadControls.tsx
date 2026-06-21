import { BINDER_SPREAD_COUNT, getBinderSpread } from "../types/binder";

type BinderSpreadControlsProps = {
  spreadIndex: number;
  onChangeSpread: (spreadIndex: number) => void;
  showCover?: boolean;
};

export function BinderSpreadControls({
  spreadIndex,
  onChangeSpread,
  showCover = false,
}: BinderSpreadControlsProps) {
  const minSpreadIndex = showCover ? -1 : 0;
  const label = spreadIndex === -1 ? "Cover" : getBinderSpread(spreadIndex).label;

  return (
    <div className="binder-spread-controls">
      <button
        className="secondary-button"
        type="button"
        disabled={spreadIndex <= minSpreadIndex}
        onClick={() => onChangeSpread(spreadIndex - 1)}
      >
        Previous
      </button>

      <strong>{label}</strong>

      <button
        className="secondary-button"
        type="button"
        disabled={spreadIndex >= BINDER_SPREAD_COUNT - 1}
        onClick={() => onChangeSpread(spreadIndex + 1)}
      >
        Next
      </button>
    </div>
  );
}