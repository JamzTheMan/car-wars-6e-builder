import type { DeckLayout } from '@/types/types';

// Storage key prefix for vehicles
const VEHICLE_STORAGE_KEY_PREFIX = 'car-wars-6e:vehicle:';

export interface SavedVehicleInfo {
  name: string;
  division: string;
  lastSaved: Date;
  storageKey: string;
}

export interface SavedVehicleEntry extends SavedVehicleInfo {
  deck: DeckLayout;
}

// Generate a storage key from vehicle name and division
function generateStorageKey(name: string, division: string): string {
  return `${VEHICLE_STORAGE_KEY_PREFIX}${name}:${division}`.toLowerCase();
}

// Save a vehicle to localStorage
export function saveVehicle(deck: DeckLayout): boolean {
  if (!deck?.name) return false;

  try {
    const storageKey = generateStorageKey(deck.name, deck.division || 'unknown');
    const vehicleEntry: SavedVehicleEntry = {
      name: deck.name,
      division: deck.division || 'unknown',
      lastSaved: new Date(),
      storageKey,
      deck
    };

    localStorage.setItem(storageKey, JSON.stringify(vehicleEntry));

    // Update the index of saved vehicles
    updateSavedVehiclesIndex(vehicleEntry);

    return true;
  } catch (error) {
    console.error('Error saving vehicle:', error);
    return false;
  }
}

// Load a vehicle from localStorage by its storage key
export function loadVehicle(storageKey: string): DeckLayout | null {
  try {
    const savedData = localStorage.getItem(storageKey);
    if (!savedData) return null;

    const vehicleEntry: SavedVehicleEntry = JSON.parse(savedData);
    return vehicleEntry.deck;
  } catch (error) {
    console.error('Error loading vehicle:', error);
    return null;
  }
}

// Delete a vehicle from localStorage
export function deleteVehicle(storageKey: string): boolean {
  try {
    localStorage.removeItem(storageKey);
    removeSavedVehicleFromIndex(storageKey);
    return true;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return false;
  }
}

// Get list of all saved vehicles
export function getSavedVehicles(): SavedVehicleInfo[] {
  try {
    const index = localStorage.getItem(`${VEHICLE_STORAGE_KEY_PREFIX}index`);
    if (!index) return [];
    
    return JSON.parse(index);
  } catch (error) {
    console.error('Error getting saved vehicles:', error);
    return [];
  }
}

// Update the index of saved vehicles
function updateSavedVehiclesIndex(vehicleEntry: SavedVehicleEntry): void {
  try {
    const vehicles = getSavedVehicles();
    const existingIndex = vehicles.findIndex(v => v.storageKey === vehicleEntry.storageKey);
    
    const vehicleInfo: SavedVehicleInfo = {
      name: vehicleEntry.name,
      division: vehicleEntry.division,
      lastSaved: vehicleEntry.lastSaved,
      storageKey: vehicleEntry.storageKey
    };

    if (existingIndex >= 0) {
      vehicles[existingIndex] = vehicleInfo;
    } else {
      vehicles.push(vehicleInfo);
    }

    localStorage.setItem(`${VEHICLE_STORAGE_KEY_PREFIX}index`, JSON.stringify(vehicles));
  } catch (error) {
    console.error('Error updating saved vehicles index:', error);
  }
}

// Remove a vehicle from the index
function removeSavedVehicleFromIndex(storageKey: string): void {
  try {
    const vehicles = getSavedVehicles().filter(v => v.storageKey !== storageKey);
    localStorage.setItem(`${VEHICLE_STORAGE_KEY_PREFIX}index`, JSON.stringify(vehicles));
  } catch (error) {
    console.error('Error removing vehicle from index:', error);
  }
}
