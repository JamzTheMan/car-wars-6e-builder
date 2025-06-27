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
import { faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons';

interface SavedVehiclesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedVehiclesDialog({ isOpen, onClose }: SavedVehiclesDialogProps) {
  const [vehicles, setVehicles] = useState<SavedVehicleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      savedVehicles.sort(
        (a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime()
      )
    );
  };

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

        <div className="overflow-y-auto flex-1 p-4">
          {vehicles.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No saved vehicles found</p>
          ) : (
            <div className="space-y-2">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.storageKey}
                  className="bg-gray-700 rounded-lg p-4 flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <h3 className="text-gray-100 font-medium">{vehicle.name}</h3>
                    <div className="text-sm text-gray-400 space-x-2">
                      <span>Division: {vehicle.division}</span>
                      <span>•</span>
                      <span>Last saved: {new Date(vehicle.lastSaved).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleLoadVehicle(vehicle.storageKey)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      {isLoading ? (
                        <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                      ) : (
                        'Load'
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.storageKey, vehicle.name)}
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
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
