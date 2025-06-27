import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Card, DeckLayout, CardTypeCategories, PointLimits, CardArea } from '@/types/types';
import { validateCardForDeck, validateCardSidePlacement, validateCardMovement } from '@/utils/cardValidation';

// Helper function to sort cards by custom type order, then cost/subtype, then name
const sortCards = (cards: Card[]): Card[] => {
  // Define custom order for card types
  const typeOrder = {
    'Crew': 1,
    'Sidearm': 3,
    'Gear': 4,
    'Accessory': 5,
    'Upgrade': 6,
    'Structure': 7,
    'Weapon': 8
  };

  return [...cards].sort((a, b) => {
    // Special handling for Crew cards to sort Driver before Gunner
    if (a.type === 'Crew' && b.type === 'Crew') {
      const aIsDriver = a.subtype?.toLowerCase() === 'driver';
      const bIsDriver = b.subtype?.toLowerCase() === 'driver';
      
      if (aIsDriver && !bIsDriver) return -1;
      if (!aIsDriver && bIsDriver) return 1;
    }
    
    // Sort by card type using custom order
    if (a.type !== b.type) {
      return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    }
    
    // For Upgrades: sort by subtype first, then cost
    if (a.type === 'Upgrade') {
      // First by subtype
      if (a.subtype !== b.subtype) {
        return (a.subtype || '').localeCompare(b.subtype || '');
      }
      
      // Then by cost
      const aCost = a.buildPointCost || a.crewPointCost || 0;
      const bCost = b.buildPointCost || b.crewPointCost || 0;
      if (aCost !== bCost) {
        return aCost - bCost;
      }
    } else {
      // For all other types: sort by cost first, then subtype
      const aCost = a.buildPointCost || a.crewPointCost || 0;
      const bCost = b.buildPointCost || b.crewPointCost || 0;
      if (aCost !== bCost) {
        return aCost - bCost;
      }
      
      // Then by subtype
      if (a.subtype !== b.subtype) {
        return (a.subtype || '').localeCompare(b.subtype || '');
      }
    }
    
    // Finally, sort by name
    return a.name.localeCompare(b.name);
  });
};

interface CardValidationResult {
  allowed: boolean;
  reason?: 'duplicate_gear' | 'duplicate_sidearm' | 'duplicate_accessory' | 'duplicate_upgrade' | 
           'same_subtype' | 'not_enough_points' | 'crew_limit_reached' | 'structure_limit_reached' | 
           'weapon_cost_limit' | 'exclusive_limit_reached' | 'invalid_side';
  conflictingCard?: Card;
  crewType?: 'Driver' | 'Gunner';
  area?: CardArea;
  weaponCost?: number;
  pointLimit?: number;
  invalidSide?: string;
}

interface CardStore {
  collectionCards: Card[];
  currentDeck: DeckLayout | null;
  isLoading: boolean;
  loadCollection: () => Promise<void>;
  addToCollection: (card: Omit<Card, 'id'>) => Promise<void>;
  addToCollectionWithId: (card: Card) => Promise<void>;
  removeFromCollection: (id: string) => Promise<void>;
  clearCollection: () => Promise<void>;
  addToDeck: (cardId: string, area?: CardArea) => void;
  removeFromDeck: (id: string) => void;
  updateCardPosition: (id: string, x: number, y: number) => void;
  updateCardArea: (id: string, area: CardArea) => void;
  setDeck: (deck: DeckLayout) => void;
  updateDeckName: (name: string) => void;
  updateDeckBackground: (imageUrl: string) => void;
  updatePointLimits: (limits: PointLimits) => void;
  canAddCardToDeck: (card: Card, targetArea?: CardArea) => CardValidationResult;
  getAvailablePoints: () => { buildPoints: number; crewPoints: number };
  resetDeck: () => void;
  bulkUpdateCollection: (cards: Card[]) => Promise<void>;
  setName: (name: string) => void;
  setDivision: (division: string) => void;
}

// Set up localStorage only in browser
const storage =
  typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : createJSONStorage(() => ({
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      }));

const generateId = () => Math.random().toString(36).substring(2, 15);

const createEmptyDeck = (): DeckLayout => ({
  id: generateId(),
  name: 'New Vehicle',
  division: 'Unknown',
  backgroundImage: '',
  cards: [],
  pointLimits: {
    buildPoints: 25,
    crewPoints: 5,
  },
  pointsUsed: {
    buildPoints: 0,
    crewPoints: 0,
  }
});

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      collectionCards: [],
      currentDeck: null,
      isLoading: true,

      // Load the global card collection from the API
      loadCollection: async () => {
        try {
          set({ isLoading: true });
          const response = await fetch('/api/cards');
          
          if (!response.ok) {
            throw new Error('Failed to fetch cards');
          }
          
          const cards = await response.json();
          set({ collectionCards: cards, isLoading: false });
        } catch (error) {
          console.error('Error loading card collection:', error);
          set({ isLoading: false });
        }
      },

      // Add a new card to the collection via API
      addToCollection: async (card: Omit<Card, 'id'>) => {
        try {
          const response = await fetch('/api/cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(card),
          });
          
          if (!response.ok) {
            throw new Error('Failed to add card');
          }
          
          const data = await response.json();
          set({ collectionCards: data.cards || [] });
        } catch (error) {
          console.error('Error adding card to collection:', error);
        }
      },

      // Add a card with a specific ID to the collection via API
      addToCollectionWithId: async (card: Card) => {
        try {
          const response = await fetch('/api/cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(card),
          });
          
          if (!response.ok) {
            throw new Error('Failed to add card');
          }
          
          const data = await response.json();
          set({ collectionCards: data.cards || [] });
        } catch (error) {
          console.error('Error adding card to collection:', error);
        }
      },
      
      // Remove a card from the collection via API
      removeFromCollection: async (id: string) => {
        try {
          // First handle deck cleanup
          set(state => {
            if (!state.currentDeck) return state;
            
            const cardToRemove = state.collectionCards.find(c => c.id === id);
            if (!cardToRemove) return state;
            
            const deckCardsToRemove = state.currentDeck.cards.filter(
              c => c.id === id || c.imageUrl === cardToRemove.imageUrl
            );
            
            if (deckCardsToRemove.length === 0) return state;
            
            // Calculate points to remove
            let updatedPointsUsed = { ...state.currentDeck.pointsUsed };
            
            deckCardsToRemove.forEach(card => {
              if (card.buildPointCost) {
                updatedPointsUsed.buildPoints -= card.buildPointCost;
              }
              if (card.crewPointCost) {
                updatedPointsUsed.crewPoints -= card.crewPointCost;
              }
            });
            
            return {
              currentDeck: {
                ...state.currentDeck,
                cards: state.currentDeck.cards.filter(c => !deckCardsToRemove.some(dc => dc.id === c.id)),
                pointsUsed: updatedPointsUsed
              }
            };
          });
            // Then remove from collection via API
          const response = await fetch(`/api/cards/${id}`, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            throw new Error('Failed to delete card');
          }
          
          const data = await response.json();
          set({ collectionCards: data.cards || [] });
        } catch (error) {
          console.error('Error removing card from collection:', error);
        }
      },

      // Clear the entire collection via API
      clearCollection: async () => {
        try {
          // Reset the deck first
          set(state => {
            if (!state.currentDeck) return state;
            
            return {
              currentDeck: {
                ...state.currentDeck,
                cards: [],
                pointsUsed: { buildPoints: 0, crewPoints: 0 }
              }
            };
          });
          
          // Clear the collection via API
          const response = await fetch('/api/cards/clear', {
            method: 'POST',
          });
          
          if (!response.ok) {
            throw new Error('Failed to clear collection');
          }
          
          set({ collectionCards: [] });
        } catch (error) {
          console.error('Error clearing collection:', error);
        }
      },

      // Bulk update the entire collection
      bulkUpdateCollection: async (cards: Card[]) => {
        try {
          const response = await fetch('/api/cards', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cards),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update collection');
          }
          
          const { cards: updatedCards } = await response.json();
          set({ collectionCards: updatedCards });
        } catch (error) {
          console.error('Error updating collection:', error);
        }
      },

      getAvailablePoints: () => {
        const state = get();
        if (!state.currentDeck) {
          return { buildPoints: 0, crewPoints: 0 };
        }
        return {
          buildPoints:
            state.currentDeck.pointLimits.buildPoints - state.currentDeck.pointsUsed.buildPoints,
          crewPoints:
            state.currentDeck.pointLimits.crewPoints - state.currentDeck.pointsUsed.crewPoints,
        };
      },
      
      canAddCardToDeck: (card: Card, targetArea?: CardArea) => {
        // Check if we can add the card to the current deck
        const state = get();
        if (!state.currentDeck) {
          return { allowed: false, reason: 'not_enough_points' };
        }

        // Use the centralized validation utility for deck validation
        const deckValidation = validateCardForDeck(
          card, 
          state.currentDeck.cards, 
          state.currentDeck.pointLimits, 
          state.currentDeck.pointsUsed
        );
        
        // If deck validation fails, return that result
        if (!deckValidation.allowed) {
          return deckValidation;
        }
        
        // Additional structure card area validation
        // Determine target area if not provided explicitly
        const area = targetArea || (() => {
          if (card.type === 'Crew' || card.type === 'Sidearm') {
            return CardArea.Crew;
          } else if (card.type === 'Gear' || card.type === 'Upgrade') {
            return CardArea.GearUpgrade;
          } else {
            return CardArea.Front; // Default for weapons, accessories, structure
          }
        })();
        
        // For Structure cards, check if there's already a structure in the target area
        if (card.type === 'Structure') {
          const isVehicleLocation = [CardArea.Front, CardArea.Back, CardArea.Left, CardArea.Right].includes(area);
          
          if (isVehicleLocation) {
            const hasStructureInArea = state.currentDeck.cards.some(c => 
              c.type === 'Structure' && c.area === area
            );
              
            if (hasStructureInArea) {
              return {
                allowed: false,
                reason: 'structure_limit_reached',
                area: area
              };
            }
          }
        }
        
        // Validate side placement for the card
        const sideValidation = validateCardSidePlacement(card, area);
        if (!sideValidation.allowed) {
          return sideValidation;
        }
        
        // All validations passed
        return { allowed: true };
      },

      // The following deck operations remain unchanged since decks are user-specific
      addToDeck: (cardId: string, area?) => {
        set(state => {
          if (!state.currentDeck) return state;

          const cardToAdd = state.collectionCards.find(c => c.id === cardId);
          if (!cardToAdd) return state;

          // Check if we can add this card
          const validationResult = get().canAddCardToDeck(cardToAdd, area);
          if (!validationResult.allowed) {
            console.warn('Cannot add card to deck:', validationResult.reason);
            return state;
          }

          // Determine the area based on card type if not specified
          const targetArea = area || (() => {
            if (cardToAdd.type === 'Crew' || cardToAdd.type === 'Sidearm') {
              return CardArea.Crew;
            } else if (cardToAdd.type === 'Gear' || cardToAdd.type === 'Upgrade') {
              return CardArea.GearUpgrade;
            } else {
              return CardArea.Front; // Default for weapons, structures, etc.
            }
          })();

          // Generate a new unique ID for the card in the deck
          const uniqueId = `${cardId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

          // Clone the card for the deck and add area information
          const deckCard = { 
            ...cardToAdd, 
            id: uniqueId, // Use the new unique ID
            area: targetArea,
            // Default positions based on area
            x: 0, 
            y: 0 
          };

          // Calculate new points used
          const newPointsUsed = { ...state.currentDeck.pointsUsed };
          if (deckCard.buildPointCost) {
            newPointsUsed.buildPoints += deckCard.buildPointCost;
          }
          if (deckCard.crewPointCost) {
            newPointsUsed.crewPoints += deckCard.crewPointCost;
          }

          // Add to deck
          return {
            currentDeck: {
              ...state.currentDeck,
              cards: [...state.currentDeck.cards, deckCard],
              pointsUsed: newPointsUsed
            }
          };
        });
      },

      removeFromDeck: (id: string) => {
        set(state => {
          if (!state.currentDeck) return state;

          const cardToRemove = state.currentDeck.cards.find(c => c.id === id);
          if (!cardToRemove) return state;

          // Adjust points used
          const newPointsUsed = { ...state.currentDeck.pointsUsed };
          if (cardToRemove.buildPointCost) {
            newPointsUsed.buildPoints -= cardToRemove.buildPointCost;
          }
          if (cardToRemove.crewPointCost) {
            newPointsUsed.crewPoints -= cardToRemove.crewPointCost;
          }

          return {
            currentDeck: {
              ...state.currentDeck,
              cards: state.currentDeck.cards.filter(c => c.id !== id),
              pointsUsed: newPointsUsed
            }
          };
        });
      },

      updateCardPosition: (id: string, x: number, y: number) => {
        set(state => {
          if (!state.currentDeck) return state;

          const cardIndex = state.currentDeck.cards.findIndex(c => c.id === id);
          if (cardIndex === -1) return state;          const updatedCards = [...state.currentDeck.cards];
          // Update with position as a nested object property
          updatedCards[cardIndex] = { 
            ...updatedCards[cardIndex], 
            position: { x, y }
          };

          return {
            currentDeck: {
              ...state.currentDeck,
              cards: updatedCards
            }
          };
        });
      },

      updateCardArea: (id: string, area: CardArea) => {
        set(state => {
          if (!state.currentDeck) return state;

          const cardIndex = state.currentDeck.cards.findIndex(c => c.id === id);
          if (cardIndex === -1) return state;

          const card = state.currentDeck.cards[cardIndex];
          
          // Validate card movement to new area
          const isValidMove = validateCardMovement(card, area, state.currentDeck.cards);
          if (!isValidMove) {
            console.warn('Cannot move card to area');
            return state;
          }

          const updatedCards = [...state.currentDeck.cards];
          updatedCards[cardIndex] = { ...updatedCards[cardIndex], area };

          return {
            currentDeck: {
              ...state.currentDeck,
              cards: updatedCards
            }
          };
        });
      },

      setDeck: (deck: DeckLayout) => {
        set({
          currentDeck: {
            ...deck,
            division: deck.division || 'Unknown',
          },
        });
      },

      updateDeckName: (name: string) => {
        set(state => {
          if (!state.currentDeck) return state;
          return {
            currentDeck: {
              ...state.currentDeck,
              name
            }
          };
        });
      },

      updateDeckBackground: (imageUrl: string) => {
        set(state => {
          if (!state.currentDeck) return state;
          return {
            currentDeck: {
              ...state.currentDeck,
              imageUrl
            }
          };
        });
      },

      updatePointLimits: (limits: PointLimits) => {
        set(state => {
          if (!state.currentDeck) return state;
          return {
            currentDeck: {
              ...state.currentDeck,
              pointLimits: limits
            }
          };
        });
      },

      resetDeck: () => {
        set({ currentDeck: null });
      },

      setName: (name: string) => {
        set((state) => ({
          ...state,
          currentDeck: state.currentDeck
            ? { ...state.currentDeck, name, division: state.currentDeck.division || 'Unknown' }
            : null,
        }));
      },
      
      // Add new action to update division
      setDivision: (division: string) => {
        set((state) => ({
          ...state,
          currentDeck: state.currentDeck
            ? { ...state.currentDeck, division }
            : null,
        }));
      },
    }),
    {
      name: 'car-wars-storage',
      storage,
      // Only persist the currentDeck in localStorage, collectionCards will come from the API
      partialize: (state) => ({ currentDeck: state.currentDeck }),
    }
  )
);
