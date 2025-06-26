'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/free-solid-svg-icons';
import { PrintView } from './PrintView';

export function PrintButton() {
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printMode, setPrintMode] = useState<'full' | 'simple' | null>(null);

  const handlePrintClick = () => {
    setShowPrintOptions(true);
  };

  const handleClosePrintOptions = () => {
    setShowPrintOptions(false);
  };

  const handlePrint = (mode: 'full' | 'simple') => {
    // Set a small delay before showing print view to avoid React rendering issues
    setTimeout(() => {
      setPrintMode(mode);
    }, 100);
  };

  const handleClosePrintView = () => {
    setPrintMode(null);
  };

  return (
    <>
      <button
        onClick={handlePrintClick}
        className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-200"
        title="Print Deck"
        aria-label="Print Deck"
      >
        <FontAwesomeIcon icon={faPrint} className="h-5 w-5" />
      </button>

      {showPrintOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Print Options</h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  handlePrint('full');
                  handleClosePrintOptions();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Full Layout (Images)
              </button>
              <button
                onClick={() => {
                  handlePrint('simple');
                  handleClosePrintOptions();
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Simple Layout (Text Only)
              </button>
              <button
                onClick={handleClosePrintOptions}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {printMode && <PrintView printMode={printMode} onClose={handleClosePrintView} />}
    </>
  );
}
