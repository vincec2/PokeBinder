import type { CardStatus } from "../types/card";
import { CARD_STATUS_LABELS } from "../types/card";

type StatusBadgeProps = {
  status: CardStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{CARD_STATUS_LABELS[status]}</span>;
}