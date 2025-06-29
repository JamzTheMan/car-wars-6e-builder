'use client';

import { useEffect, useRef, useState } from 'react';
import { useCardStore } from '@/store/cardStore';
import { generateVehicleNames } from '@/utils/vehicleNameGenerator';
import { useToast } from '@/components/Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faFolderOpen, faPencil } from '@fortawesome/free-solid-svg-icons';
import { saveVehicle } from '@/utils/savedVehicles';

export function VehicleName({ onOpenSavedVehicles }: { onOpenSavedVehicles?: () => void }) {
  const { currentDeck, updateDeckName, setDeck } = useCardStore();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [vehicleName, setVehicleName] = useState(currentDeck?.name || 'Car Wars 6e Car Builder');
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const randomButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update component state when deck name changes
  useEffect(() => {
    if (currentDeck?.name) {
      setVehicleName(currentDeck.name);
    }
  }, [currentDeck?.name]);

  // Generate random names when isEditing is set to true
  useEffect(() => {
    if (isEditing) {
      // Generate names when editing mode is enabled
      const newNames = generateVehicleNames(5);
      setNameOptions(newNames);
    } else {
      setNameOptions([]);
    }
  }, [isEditing]);

  const handleGenerateRandomNames = () => {
    const newNames = generateVehicleNames(5);
    console.log('Generated random names:', newNames);
    setNameOptions(newNames);
  };

  const handleNameSelect = (name: string) => {
    setVehicleName(name);
    updateDeckName(name);
    setNameOptions([]);
    setIsEditing(false);
  };

  const handleSaveName = () => {
    updateDeckName(vehicleName);
    setIsEditing(false);
    setNameOptions([]);
  };

  const handleSaveToStorage = () => {
    if (!currentDeck) return;

    if (saveVehicle(currentDeck)) {
      showToast('Vehicle saved to local storage', 'success');
    } else {
      showToast('Failed to save vehicle to local storage', 'error');
    }
  };

  const handleLoadFromStorage = () => {
    if (onOpenSavedVehicles) {
      onOpenSavedVehicles();
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <div className="flex flex-col space-y-2">
            <label htmlFor="vehicle-name" className="sr-only">
              Vehicle Name
            </label>
            <input
              id="vehicle-name"
              type="text"
              value={vehicleName}
              onChange={e => setVehicleName(e.target.value)}
              className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-2 py-1 text-sm"
              autoFocus
              placeholder="Enter vehicle name"
              title="Enter vehicle name"
              ref={inputRef}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSaveName();
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                  setVehicleName(currentDeck?.name || 'Car Wars 6e Car Builder');
                  setNameOptions([]);
                }
              }}
            />
          </div>
          <div className="flex space-x-1">
            <button
              onClick={handleSaveName}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
            >
              Save
            </button>
            <div className="relative">
              <button
                ref={randomButtonRef}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleGenerateRandomNames();
                }}
                className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
              >
                Random
              </button>

              {nameOptions.length > 0 && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded shadow-lg p-2 w-72">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium text-gray-300">Select a random name:</div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setNameOptions([]);
                      }}
                      className="text-gray-400 hover:text-gray-200"
                      title="Close name options"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {nameOptions.map((name, index) => (
                      <button
                        key={index}
                        onClick={e => {
                          e.stopPropagation();
                          handleNameSelect(name);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>{' '}
            <button
              onClick={() => {
                setIsEditing(false);
                setVehicleName(currentDeck?.name || 'Car Wars 6e Car Builder');
                setNameOptions([]);
              }}
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLoadFromStorage}
        className="text-gray-400 hover:text-gray-200"
        title="Load vehicle from local storage"
      >
        <FontAwesomeIcon icon={faFolderOpen} className="h-4 w-4" />
      </button>
      <button
        onClick={handleSaveToStorage}
        className="text-gray-400 hover:text-gray-200"
        title="Save vehicle to local storage"
      >
        <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
      </button>
      <h2 className="text-gray-100 text-lg font-medium">
        {currentDeck?.name || 'Unnamed Vehicle'}
      </h2>
      <button
        onClick={() => setIsEditing(true)}
        className="text-gray-400 hover:text-gray-200"
        title="Edit vehicle name"
      >
        <FontAwesomeIcon icon={faPencil} className="h-4 w-4" />
      </button>
    </div>
  );
}
