// Utility for managing user preferences in localStorage
import type { DeckLayout } from '@/types/types';

// Storage key for user preferences
const USER_PREFS_KEY = 'car-wars-6e-builder:userPreferences';

// Vehicle storage key
const VEHICLE_STORAGE_KEY = 'car-wars-6e-builder:vehicle';

// Define the types for our preferences
export interface UserPreferences {
  // Layout preferences
  layoutPreferences: {
    leftPanelWidth: number; // Percentage width of the left panel
  };
  
  // Filter preferences
  filterPreferences: {
    filterPanelOpen: boolean;
    filterCardTypes: string[];
    filterSubtypes: string[];
    filterCardName: string;
    filterMinCost: number;
    filterMaxCost: number;
    costFilterEnabled: boolean;
    filterSources: string[];
  };
}

// Default preferences
const defaultPreferences: UserPreferences = {
  layoutPreferences: {
    leftPanelWidth: 30, // Default 30% width
  },
  filterPreferences: {
    filterPanelOpen: false,
    filterCardTypes: [],
    filterSubtypes: [],
    filterCardName: '',
    filterMinCost: 0,
    filterMaxCost: 8,
    costFilterEnabled: false,
    filterSources: [],
  },
};

// Get user preferences from localStorage
export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return defaultPreferences;
  }
  
  const savedPrefs = localStorage.getItem(USER_PREFS_KEY);
  if (!savedPrefs) {
    return defaultPreferences;
  }
  
  try {
    const parsedPrefs = JSON.parse(savedPrefs);
    
    // Properly merge nested objects
    return {
      layoutPreferences: {
        ...defaultPreferences.layoutPreferences,
        ...(parsedPrefs.layoutPreferences || {})
      },
      filterPreferences: {
        ...defaultPreferences.filterPreferences,
        ...(parsedPrefs.filterPreferences || {})
      }
    };
  } catch (error) {
    console.error('Error parsing user preferences:', error);
    return defaultPreferences;
  }
}

// Save user preferences to localStorage
export function saveUserPreferences(preferences: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const currentPrefs = getUserPreferences();
  
  // Deep merge current preferences with new preferences
  const updatedPrefs = {
    layoutPreferences: {
      ...currentPrefs.layoutPreferences,
      ...(preferences.layoutPreferences || {})
    },
    filterPreferences: {
      ...currentPrefs.filterPreferences,
      ...(preferences.filterPreferences || {})
    }
  };
  
  try {
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

// Update layout preferences
export function saveLayoutPreferences(layoutPrefs: Partial<UserPreferences['layoutPreferences']>): void {
  const currentPrefs = getUserPreferences();
  saveUserPreferences({
    layoutPreferences: { ...currentPrefs.layoutPreferences, ...layoutPrefs }
  });
}

// Update filter preferences
export function saveFilterPreferences(filterPrefs: Partial<UserPreferences['filterPreferences']>): void {
  const currentPrefs = getUserPreferences();
  saveUserPreferences({
    filterPreferences: { ...currentPrefs.filterPreferences, ...filterPrefs }
  });
}

// Direct functions to save and get panel width
export function savePanelWidth(width: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Store as a separate item in case there's an issue with the main preferences
    localStorage.setItem('car-wars-6e-builder:panelWidth', width.toString());
    
    // Also update in main preferences
    saveLayoutPreferences({ leftPanelWidth: width });
  } catch (error) {
    console.error('Error saving panel width:', error);
  }
}

export function getPanelWidth(): number {
  if (typeof window === 'undefined') {
    return defaultPreferences.layoutPreferences.leftPanelWidth;
  }
  
  try {
    // Try to get from direct storage first
    const storedWidth = localStorage.getItem('car-wars-6e-builder:panelWidth');
    if (storedWidth) {
      const parsedWidth = parseFloat(storedWidth);
      if (!isNaN(parsedWidth)) {
        return parsedWidth;
      }
    }
    
    // Fall back to full preferences
    return getUserPreferences().layoutPreferences.leftPanelWidth;
  } catch (error) {
    console.error('Error getting panel width:', error);
    return defaultPreferences.layoutPreferences.leftPanelWidth;
  }
}

// Debug utility to check what's currently stored
export function debugPrintUserPreferences(): void {
  if (typeof window === 'undefined') {
    console.log('Not in browser environment');
    return;
  }
  
  const savedPrefs = localStorage.getItem(USER_PREFS_KEY);
  console.log('Raw saved preferences:', savedPrefs);
  
  const userPrefs = getUserPreferences();
  console.log('Parsed user preferences:', userPrefs);
  
  if (savedPrefs) {
    try {
      const parsedJson = JSON.parse(savedPrefs);
      console.log('Direct parsed JSON:', parsedJson);
    } catch (error) {
      console.error('Error parsing preferences JSON:', error);
    }
  }
}

// Vehicle storage functions
export const saveVehicleToStorage = (vehicle: DeckLayout): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem(VEHICLE_STORAGE_KEY, JSON.stringify(vehicle));
    return true;
  } catch (error) {
    console.error('Error saving vehicle to local storage:', error);
    return false;
  }
};

export const loadVehicleFromStorage = (): DeckLayout | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(VEHICLE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading vehicle from local storage:', error);
    return null;
  }
};
