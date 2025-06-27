import { useState, useEffect } from 'react';
import {
  SavedVehicleInfo,
  getSavedVehicles,
  deleteVehicle,
  loadVehicle,
} from '@/utils/savedVehicles';
import { useCardStore } from '@/store/cardStore';
import { useToast } from '@/components/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faSpinner, faSort } from '@fortawesome/free-solid-svg-icons';

interface SavedVehiclesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedVehiclesDialog({ isOpen, onClose }: SavedVehiclesDialogProps) {
  const [vehicles, setVehicles] = useState<SavedVehicleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortByDivisionFirst, setSortByDivisionFirst] = useState(false);
  const { setDeck } = useCardStore();
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      refreshVehicleList();
    }
  }, [isOpen]);

  const refreshVehicleList = () => {
    const savedVehicles = getSavedVehicles();
    setVehicles(
      savedVehicles.sort((a, b) => {
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
  };

  // Refresh the list when sort order changes
  useEffect(() => {
    refreshVehicleList();
  }, [sortByDivisionFirst]);

  const handleLoadVehicle = (storageKey: string) => {
    setIsLoading(true);
    try {
      const vehicle = loadVehicle(storageKey);
      if (vehicle) {
        setDeck(vehicle);
        showToast('Vehicle loaded successfully', 'success');
        onClose();
      } else {
        showToast('Failed to load vehicle', 'error');
      }
    } catch (error) {
      showToast('Error loading vehicle', 'error');
    } finally {
      setIsLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-100">Saved Vehicles</h2>
            <div className="flex items-center gap-2">
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
          {vehicles.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No saved vehicles found</p>
          ) : (
            <div className="space-y-2" role="list">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.storageKey}
                  className="w-full text-left bg-gray-700 hover:bg-gray-600 rounded-lg p-4 flex items-center justify-between group relative transition-colors"
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
                      <span>•</span>
                      <span>Last saved: {new Date(vehicle.lastSaved).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {isLoading ? (
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="h-4 w-4 animate-spin mr-2 text-blue-400"
                      />
                    ) : null}
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
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
