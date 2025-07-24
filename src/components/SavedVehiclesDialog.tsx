import { useState, useEffect, useRef } from 'react';
import {
  SavedVehicleInfo,
  getSavedVehicles,
  deleteVehicle,
  loadVehicle,
  saveVehicle,
} from '@/utils/savedVehicles';
import { getStockVehicles, loadStockVehicle } from '@/utils/stockVehicles';
import { useCardStore } from '@/store/cardStore';
import { useToast } from '@/components/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faSpinner,
  faSort,
  faUpload,
  faDownload,
  faExchangeAlt,
} from '@fortawesome/free-solid-svg-icons';
import type { DeckLayout } from '@/types/types';
import { ConfirmationDialog } from './ConfirmationDialog';

interface SavedVehiclesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedVehiclesDialog({ isOpen, onClose }: SavedVehiclesDialogProps) {
  const [vehicles, setVehicles] = useState<SavedVehicleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortByDivisionFirst, setSortByDivisionFirst] = useState(false);
  const [viewMode, setViewMode] = useState<'saved' | 'stock'>('saved');
  const { setDeck, currentDeck } = useCardStore();
  const { showToast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const exportInputRef = useRef<HTMLAnchorElement>(null);

  // Confirmation dialog state
  const [pendingLoadKey, setPendingLoadKey] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshVehicleList();
    }
  }, [isOpen]);

  // Refresh the list when sort order or view mode changes
  useEffect(() => {
    if (isOpen) {
      refreshVehicleList();
    }
  }, [sortByDivisionFirst, viewMode, isOpen]);

  const refreshVehicleList = async () => {
    setIsLoading(true);
    try {
      let vehicleList: SavedVehicleInfo[];

      if (viewMode === 'saved') {
        vehicleList = getSavedVehicles();
      } else {
        vehicleList = await getStockVehicles();
      }

      setVehicles(
        vehicleList.sort((a, b) => {
          if (sortByDivisionFirst) {
            // First sort by division
            const divisionCompare = a.division.localeCompare(b.division);
            if (divisionCompare !== 0) return divisionCompare;

            // Then by name
            return a.name.localeCompare(b.name);
          } else {
            // First sort by name
            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;

            // Then by division
            return a.division.localeCompare(b.division);
          }
        })
      );
    } catch (error) {
      console.error('Error refreshing vehicle list:', error);
      showToast('Failed to load vehicles', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadVehicle = async (storageKey: string) => {
    if (currentDeck) {
      setPendingLoadKey(storageKey);
      setShowConfirm(true);
      return;
    }
    await actuallyLoadVehicle(storageKey);
  };

  const actuallyLoadVehicle = async (storageKey: string) => {
    setIsLoading(true);
    try {
      let vehicle: DeckLayout | null = null;
      if (viewMode === 'saved') {
        vehicle = loadVehicle(storageKey);
      } else {
        vehicle = await loadStockVehicle(storageKey);
      }
      if (vehicle) {
        setDeck(vehicle);
        showToast('Vehicle loaded successfully', 'success');
        onClose();
      } else {
        showToast('Failed to load vehicle', 'error');
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
      showToast('Error loading vehicle', 'error');
    } finally {
      setIsLoading(false);
      setPendingLoadKey(null);
      setShowConfirm(false);
    }
  };

  const handleDeleteVehicle = (storageKey: string, vehicleName: string) => {
    if (!confirm(`Are you sure you want to delete "${vehicleName}"?`)) {
      return;
    }

    if (deleteVehicle(storageKey)) {
      showToast('Vehicle deleted successfully', 'success');
      refreshVehicleList();
    } else {
      showToast('Failed to delete vehicle', 'error');
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const importedDeck = JSON.parse(e.target?.result as string) as DeckLayout;
        setDeck(importedDeck);

        // Save the imported vehicle to localStorage
        if (saveVehicle(importedDeck)) {
          showToast('Vehicle imported and saved successfully!', 'success');
        } else {
          showToast('Vehicle imported but could not be saved', 'info');
        }

        onClose();
      } catch (error) {
        console.error('Import error:', error);
        showToast(
          `Failed to import vehicle: ${error instanceof Error ? error.message : 'Invalid file format'}`,
          'error'
        );
      }
    };
    reader.readAsText(file);
    // Clear the input so the same file can be imported again if needed
    e.target.value = '';
  };

  // Handle exporting deck to JSON file
  const handleExportVehicle = async (vehicle: SavedVehicleInfo) => {
    try {
      const loadedVehicle = loadVehicle(vehicle.storageKey);
      if (!loadedVehicle) {
        showToast('Failed to load vehicle for export', 'error');
        return;
      }

      // Prepare the file name
      const divisionText =
        vehicle.division === 'custom' ? 'Custom' : `Division ${vehicle.division}`;
      const suggestedName = `${vehicle.name} - ${divisionText}.json`;
      const deckData = JSON.stringify(loadedVehicle, null, 2);

      try {
        if ('showSaveFilePicker' in window) {
          // Modern browsers - Use File System Access API
          const fileHandle = await window.showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: 'JSON Files',
                accept: {
                  'application/json': ['.json'],
                },
              },
            ],
          });

          // Create a writable stream and write the file
          const writable = await fileHandle.createWritable();
          await writable.write(deckData);
          await writable.close();
        } else {
          // Legacy browsers - Use download attribute
          const blob = new Blob([deckData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          if (exportInputRef.current) {
            exportInputRef.current.href = url;
            exportInputRef.current.download = suggestedName;
            exportInputRef.current.click();
          }

          URL.revokeObjectURL(url);
        }

        showToast('Vehicle exported successfully!', 'success');
      } catch (err) {
        // Don't show error if user just cancelled the save dialog
        if (err.name !== 'AbortError') {
          console.error('Export error:', err);
          showToast('Failed to export vehicle', 'error');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export vehicle', 'error');
    }
  };

  if (!isOpen) return null;

  // Dialog title and caption based on the view mode
  const dialogTitle = viewMode === 'saved' ? 'Saved Vehicles' : 'Stock Vehicles';
  const dialogCaption =
    viewMode === 'saved'
      ? 'Your saved vehicles collection'
      : 'Pre-configured vehicles ready to use';

  // CSS classes for the title based on view mode
  const titleClasses =
    viewMode === 'saved'
      ? 'text-xl font-semibold text-gray-100'
      : 'text-xl font-semibold text-blue-200';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        {/* Hidden elements for file operations */}
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
          aria-label="Import vehicle from JSON file"
        />
        <a
          ref={exportInputRef}
          className="hidden"
          download="vehicle.json"
          aria-label="Export vehicle to JSON file"
        ></a>

        <div
          className={`${
            viewMode === 'saved' ? 'bg-gray-800' : 'bg-blue-950'
          } rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col`}
          aria-labelledby="vehicle-dialog-title"
        >
          <div
            className={`p-4 border-b ${viewMode === 'saved' ? 'border-gray-700' : 'border-blue-800'} 
              ${viewMode === 'saved' ? 'bg-gray-800' : 'bg-blue-900/40'}`}
          >
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <div className="flex items-center">
                  <h2 id="vehicle-dialog-title" className={titleClasses}>
                    {dialogTitle}
                  </h2>
                  {viewMode === 'stock' && (
                    <span className="ml-2 px-1.5 py-0.5 bg-blue-700/60 text-blue-200 text-xs rounded-md">
                      Official
                    </span>
                  )}
                </div>
                <p className={`text-xs ${viewMode === 'saved' ? 'text-gray-400' : 'text-blue-300'}`}>
                  {dialogCaption}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'saved' && (
                  <button
                    onClick={handleImportClick}
                    className="text-gray-400 hover:text-gray-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700"
                    title="Import vehicle from file"
                  >
                    <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                    <span className="text-sm">Import</span>
                  </button>
                )}
                <button
                  onClick={() => setViewMode(viewMode === 'saved' ? 'stock' : 'saved')}
                  className="text-gray-400 hover:text-gray-200 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-700"
                  title={`Switch to ${viewMode === 'saved' ? 'stock' : 'saved'} vehicles`}
                >
                  <span className="text-sm">
                    <FontAwesomeIcon icon={faExchangeAlt} className="h-4 w-4 ml-1" />

                    {viewMode === 'saved' ? ' Stock Vehicles' : ' Saved Vehicles'}
                  </span>
                </button>
                <button
                  onClick={() => setSortByDivisionFirst(prev => !prev)}
                  className="text-gray-400 hover:text-gray-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700"
                  title={
                    sortByDivisionFirst
                      ? 'Sorting by Division then Name'
                      : 'Sorting by Name then Division'
                  }
                >
                  <FontAwesomeIcon icon={faSort} className="h-4 w-4" />
                  <span className="text-sm">{sortByDivisionFirst ? 'Division' : 'Name'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200"
                  title="Close dialog"
                  aria-label="Close dialog"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} className="h-6 w-6 animate-spin text-blue-400" />
                <span className="ml-2 text-gray-300">Loading vehicles...</span>
              </div>
            ) : vehicles.length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                {viewMode === 'saved'
                  ? 'No saved vehicles found. Add some vehicles to your collection!'
                  : 'No stock vehicles found. Check the server configuration.'}
              </p>
            ) : (
              <div className="space-y-2" role="list">
                {vehicles.map(vehicle => (
                  <div
                    key={vehicle.storageKey}
                    className={`w-full text-left ${
                      viewMode === 'stock'
                        ? 'bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/40'
                        : 'bg-gray-700 hover:bg-gray-600'
                    } rounded-lg p-4 flex items-center justify-between group relative transition-colors`}
                    role="listitem"
                  >
                    <div
                      className="flex-1"
                      onClick={() => handleLoadVehicle(vehicle.storageKey)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleLoadVehicle(vehicle.storageKey);
                        }
                      }}
                      aria-label={`Load vehicle ${vehicle.name}`}
                    >
                      <h3 className="text-gray-100 font-medium">{vehicle.name}</h3>
                      <div className="text-sm text-gray-400 space-x-2">
                        <span>Division: {vehicle.division}</span>
                        {viewMode === 'saved' && (
                          <>
                            <span>•</span>
                            <span>Last saved: {new Date(vehicle.lastSaved).toLocaleString()}</span>
                          </>
                        )}
                        {viewMode === 'stock' && (
                          <>
                            <span>•</span>
                            <span>Stock vehicle</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {isLoading ? (
                        <FontAwesomeIcon
                          icon={faSpinner}
                          className="h-4 w-4 animate-spin mr-2 text-blue-400"
                        />
                      ) : null}
                      {viewMode === 'saved' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleExportVehicle(vehicle);
                            }}
                            className="text-gray-400 hover:text-green-500 p-1 rounded transition-colors"
                            title="Export vehicle"
                          >
                            <FontAwesomeIcon icon={faDownload} className="h-4 w-4" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteVehicle(vehicle.storageKey, vehicle.name);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                            title="Delete vehicle"
                          >
                            <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        // For stock vehicles, just show a save button that would save a copy to local storage
                        <div className="flex gap-2">
                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              setIsLoading(true);
                              try {
                                const stockVehicle = await loadStockVehicle(vehicle.storageKey);
                                if (stockVehicle && saveVehicle(stockVehicle)) {
                                  showToast('Vehicle saved to your collection', 'success');
                                } else {
                                  showToast('Failed to save vehicle to your collection', 'error');
                                }
                              } catch (error) {
                                console.error('Error saving stock vehicle:', error);
                                showToast('Failed to save vehicle to your collection', 'error');
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            className="flex items-center gap-1 text-blue-300 hover:text-blue-100 hover:text-green-500 px-2 py-1 rounded transition-colors"
                            title="Save to your collection"
                          >
                            <FontAwesomeIcon icon={faUpload} className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className={`p-4 border-t ${viewMode === 'saved' ? 'border-gray-700' : 'border-blue-800'} 
             ${viewMode === 'saved' ? 'bg-gray-800' : 'bg-blue-900/40'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={onClose}
                className={`w-full px-4 py-2 ${
                  viewMode === 'saved'
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-blue-700 hover:bg-blue-600 text-blue-100'
                } rounded transition-colors`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirm}
        title="Overwrite Current Vehicle?"
        message="Loading a new vehicle will overwrite your current build. Continue?"
        confirmText="Overwrite"
        cancelText="Cancel"
        onConfirm={() => {
          if (pendingLoadKey) {
            actuallyLoadVehicle(pendingLoadKey);
          }
        }}
        onCancel={() => {
          setShowConfirm(false);
          setPendingLoadKey(null);
        }}
      />
    </>
  );
}
