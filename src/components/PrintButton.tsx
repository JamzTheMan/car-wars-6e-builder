'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/free-solid-svg-icons';

export function PrintButton({ onOpenPrintDialogAction }: { onOpenPrintDialogAction?: () => void }) {
  return (
    <button
      onClick={onOpenPrintDialogAction}
      className="text-gray-400 hover:text-gray-200"
      title="Print Deck"
      aria-label="Print Deck"
    >
      <FontAwesomeIcon icon={faPrint} className="h-5 w-5" />
    </button>
  );
}
