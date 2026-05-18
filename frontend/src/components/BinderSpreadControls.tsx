import { BINDER_SPREAD_COUNT, getBinderSpread } from "../types/binder";

type BinderSpreadControlsProps = {
  spreadIndex: number;
  onChangeSpread: (spreadIndex: number) => void;
};

export function BinderSpreadControls({
  spreadIndex,
  onChangeSpread,
}: BinderSpreadControlsProps) {
  const spread = getBinderSpread(spreadIndex);

  return (
    <div className="binder-spread-controls">
      <button
        className="secondary-button"
        type="button"
        disabled={spreadIndex === 0}
        onClick={() => onChangeSpread(spreadIndex - 1)}
      >
        Previous
      </button>

      <strong>{spread.label}</strong>

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