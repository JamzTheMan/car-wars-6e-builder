'use client';

import { useEffect, useRef, useState, useContext } from 'react';
import { DndWrapper } from '@/components/DndWrapper';
import { CardUploadProvider } from '@/context/CardUploadContext';
import { CardCollection } from '@/components/CardCollection';
import { CardCollectionHeader } from '@/components/CardCollectionHeader';
import { DeckLayout, VehicleName } from '@/components/DeckLayout';
import { useCardStore } from '@/store/cardStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSquareCaretDown, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { ToastContext } from '@/components/Toast';
import { PrintButton } from '@/components/PrintButton';
import { SavedVehiclesDialog } from '@/components/SavedVehiclesDialog';
import { PrintView } from '@/components/PrintView';
import { CardCollectionFilters } from '@/components/CardCollectionFilters';
import { useCardCollectionFilters } from './CardCollectionFiltersWrapper';

function PointsSummary() {
  const { currentDeck, setDeck, updatePointLimits } = useCardStore();
  if (!currentDeck) return null;
  const { pointsUsed, pointLimits, division } = currentDeck;
  // Inline division select logic
  const [localDivision, setLocalDivision] = useState<number>(
    division && division !== 'custom'
      ? parseInt(division)
      : Math.ceil((pointLimits.crewPoints ?? 0) / 4)
  );

  useEffect(() => {
    if (currentDeck) {
      const crewValue = currentDeck.pointLimits.crewPoints;
      setLocalDivision(crewValue > 0 ? crewValue : 1);
    }
  }, [currentDeck]);

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value);
    setLocalDivision(numValue);
    if (currentDeck) {
      setDeck({
        ...currentDeck,
        division: String(numValue),
        pointLimits: {
          ...currentDeck.pointLimits,
          buildPoints: numValue * 4,
          crewPoints: numValue,
        },
        // Optionally reset pointsUsed if you want to clear spent points on division change:
        // pointsUsed: { buildPoints: 0, crewPoints: 0 },
      });
    }
    updatePointLimits({ buildPoints: numValue * 4, crewPoints: numValue });
  };

  return (
    <div className="flex space-x-2 text-xs text-gray-300 scale-150 origin-left ml-0">
      <span className="bg-yellow-950 border border-yellow-900 rounded px-2 py-0.5 relative">
        AADA Division:{' '}
        <select
          value={localDivision}
          onChange={handleDivisionChange}
          className="font-bold bg-transparent text-white-200 focus:outline-none pr-3.5 appearance-none text-center"
          aria-label="AADA Division"
          title="AADA Division"
        >
          {[...Array(12).keys()].map(i => (
            <option key={i + 1} value={i + 1} className="text-black">
              {i + 1}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white-300 text-xs">
          <FontAwesomeIcon icon={faSquareCaretDown} />
        </span>
      </span>
      <span className="bg-blue-900 border border-blue-700 rounded px-2 py-0.5">
        CP:{' '}
        <span className="font-bold text-white-200">
          {pointsUsed.crewPoints} / {pointLimits.crewPoints}
        </span>
      </span>
      <span className="bg-red-900 border border-red-700 rounded px-2 py-0.5">
        BP:{' '}
        <span className="font-bold text-white-200">
          {pointsUsed.buildPoints} / {pointLimits.buildPoints}
        </span>
      </span>
    </div>
  );
}

function CardCollectionTitleUpload() {
  const { showToast } = useContext(ToastContext) || {};
  const { collectionCards, clearCollection } = useCardStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    // Only show the button if localStorage.debug is set to 'true'
    if (typeof window !== 'undefined') {
      setIsDebug(localStorage.getItem('debug') === 'true');
    }
  }, []);

  const handleClearAllClick = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    clearCollection();
    setShowClearConfirm(false);
    showToast?.('All cards cleared successfully.', 'success');
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className="relative">
      {/* Clear All Cards button (debug only) */}
      {isDebug && collectionCards.length > 0 && (
        <button
          onClick={handleClearAllClick}
          className="text-gray-400 hover:text-red-600"
          title="Clear the Collection"
          aria-label="Clear the Collection"
        >
          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
        </button>
      )}

      {/* Clear All confirmation dialog */}
      {showClearConfirm && (
        <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 p-3">
          <p className="text-sm text-red-400 mb-2">Delete all cards. Are you sure?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleConfirmClear}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Yes
            </button>
            <button
              onClick={handleCancelClear}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetCarButton() {
  return (
    <button
      onClick={() => {
        if (
          confirm(
            'Are you sure you want to reset the car? This will remove all cards and reset point costs to zero.'
          )
        ) {
          useCardStore.getState().resetDeck();
        }
      }}
      className="text-gray-400 hover:text-red-600"
      title="Reset Vehicle"
      aria-label="Reset Vehicle"
    >
      <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
    </button>
  );
}

export default function Home() {
  const { setDeck, currentDeck, collectionCards } = useCardStore();
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(30); // percentage - will be updated from preferences
  const [isDragging, setIsDragging] = useState(false);
  const [isSavedVehiclesOpen, setIsSavedVehiclesOpen] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printMode, setPrintMode] = useState<'full' | 'simple' | null>(null);

  // Use the custom hook to manage filter state and logic
  const filterProps = useCardCollectionFilters(collectionCards);

  const handleMouseDown = () => {
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';

    // Save the panel width when the user finishes dragging
    import('../utils/userPreferences').then(({ savePanelWidth, debugPrintUserPreferences }) => {
      console.log('Saving panel width:', leftPanelWidth);
      savePanelWidth(leftPanelWidth);

      // Debug: print the saved preferences
      setTimeout(debugPrintUserPreferences, 100);
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.getElementById('split-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Limit the resize between 20% and 80% of the container width
    const width = Math.min(Math.max(newWidth, 20), 80);
    setLeftPanelWidth(width);
    document.documentElement.style.setProperty('--panel-width', `${width}%`);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Load user layout preferences on component mount
  useEffect(() => {
    // Import is inside useEffect to avoid SSR issues
    import('../utils/userPreferences').then(({ getPanelWidth, debugPrintUserPreferences }) => {
      // Debug: print the saved preferences on load
      debugPrintUserPreferences();

      const savedWidth = getPanelWidth();

      console.log('Loading saved panel width:', savedWidth);

      // Apply saved width
      setLeftPanelWidth(savedWidth);
      document.documentElement.style.setProperty('--panel-width', `${savedWidth}%`);
    });
  }, []);

  useEffect(() => {
    // Handle store hydration
    const hydrateStore = () => {
      useCardStore.persist.rehydrate();
      setIsStoreHydrated(true);
    };

    hydrateStore();
  }, []);

  useEffect(() => {
    // Only initialize a new deck if there isn't one already and the store is hydrated
    if (isStoreHydrated && !currentDeck) {
      const newId = Math.random().toString(36).substring(2);

      // Import the generator function directly
      import('@/utils/vehicleNameGenerator').then(({ generateVehicleName }) => {
        const randomName = generateVehicleName();

        setDeck({
          id: newId,
          name: randomName,
          division: '4', // Default to Division 4
          backgroundImage: '', // We're still initializing with empty string, the DeckLayout will handle the default
          cards: [],
          pointLimits: {
            buildPoints: 16,
            crewPoints: 4,
          },
          pointsUsed: {
            buildPoints: 0,
            crewPoints: 0,
          },
        });
      });
    }
  }, [isStoreHydrated, setDeck, currentDeck]);

  // Show a loading state while hydrating
  if (!isStoreHydrated) {
    return (
      <div className="h-full flex flex-col bg-gray-900 items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <DndWrapper>
        <CardUploadProvider>
          <main className="h-full flex flex-col bg-gray-900">
            <div className="flex-1 min-h-0">
              <div id="split-container" className="h-full flex gap-2">
                <div className="panel-left bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-0">
                  <div className="flex items-center justify-between p-2 border-b border-gray-700 flex-shrink-0">
                    <CardCollectionHeader />
                    <CardCollectionTitleUpload />
                  </div>
                  {/* Render filters above the card collection */}
                  <div>
                    <CardCollectionFilters {...filterProps} />
                  </div>
                  <div className="flex-1 overflow-auto">
                    <CardCollection {...filterProps} />
                  </div>
                </div>

                <div className="resize-handle" onMouseDown={handleMouseDown} />

                <div className="panel-right bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-0">
                  <div className="relative border-b border-gray-700 flex items-center min-h-14 px-2">
                    {/* Left: VehicleName absolute */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                      <VehicleName onOpenSavedVehicles={() => setIsSavedVehiclesOpen(true)} />
                    </div>
                    {/* Center: PointsSummary absolutely centered */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -ml-17 -translate-y-1/2 flex items-center">
                      <PointsSummary />
                    </div>
                    {/* Right: Print & Reset absolute */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <PrintButton onOpenPrintDialog={() => setShowPrintOptions(true)} />
                      <ResetCarButton />
                    </div>
                    {/* Spacer for min height */}
                    <div className="invisible h-0">&nbsp;</div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <DeckLayout />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </CardUploadProvider>
      </DndWrapper>
      <SavedVehiclesDialog
        isOpen={isSavedVehiclesOpen}
        onClose={() => setIsSavedVehiclesOpen(false)}
      />
      {showPrintOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Print Options</h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setPrintMode('full');
                  setShowPrintOptions(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Full Layout (Images)
              </button>
              <button
                onClick={() => {
                  setPrintMode('simple');
                  setShowPrintOptions(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Simple Layout (Text Only)
              </button>
              <button
                onClick={() => setShowPrintOptions(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {printMode && <PrintView printMode={printMode} onClose={() => setPrintMode(null)} />}
    </>
  );
}
