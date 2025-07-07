import type { DeckLayout } from '@/types/types';
import { SavedVehicleInfo } from './savedVehicles';

const STOCK_VEHICLES_PATH = '/assets/stock-cars/';

// Get a list of all stock vehicles
export async function getStockVehicles(): Promise<SavedVehicleInfo[]> {
  try {
    // Fetch the list of available stock car files
    const response = await fetch('/api/stock-vehicles');
    
    if (!response.ok) {
      throw new Error('Failed to fetch stock vehicles list');
    }
    
    const stockFiles: string[] = await response.json();
    
    // Convert file names to vehicle info objects
    return stockFiles.map(fileName => {
      // Extract name and division from filename (e.g., "Apollo - Division 4.json")
      const match = fileName.match(/(.+) - Division (\d+)\.json$/);
      
      if (!match) {
        return {
          name: fileName.replace('.json', ''),
          division: 'unknown',
          lastSaved: new Date(0).toISOString(), // Use epoch as these are pre-built
          storageKey: `${STOCK_VEHICLES_PATH}${fileName}`,
        };
      }
      
      const [, name, division] = match;
      
      return {
        name,
        division,
        lastSaved: new Date(0).toISOString(), // Use epoch as these are pre-built
        storageKey: `${STOCK_VEHICLES_PATH}${fileName}`,
      };
    });
  } catch (error) {
    console.error('Error getting stock vehicles:', error);
    return [];
  }
}

// Load a stock vehicle by its storage key (which contains the file path)
export async function loadStockVehicle(storageKey: string): Promise<DeckLayout | null> {
  try {
    // Extract the file name from the storage key
    const fileName = storageKey.replace(STOCK_VEHICLES_PATH, '');
    
    // Fetch the vehicle JSON file
    const response = await fetch(`${STOCK_VEHICLES_PATH}${fileName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load stock vehicle: ${fileName}`);
    }
    
    // Parse and return the vehicle data
    const vehicleData = await response.json();
    return vehicleData as DeckLayout;
  } catch (error) {
    console.error('Error loading stock vehicle:', error);
    return null;
  }
}
