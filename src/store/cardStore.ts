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
  addToCollection: (card: Omit<Card, 'id'>) => void;
  addToCollectionWithId: (card: Card) => void;
  removeFromCollection: (id: string) => void;
  clearCollection: () => void;
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
}

const storage =
  typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : createJSONStorage(() => ({
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      }));

export const useCardStore = create<CardStore>()(
  persist(
    (set, get) => ({
      collectionCards: [],
      currentDeck: null,

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
      },      canAddCardToDeck: (card: Card, targetArea?: CardArea) => {
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
      addToCollection: (card: Omit<Card, 'id'>) =>
        set(state => {
          // Create a new card with a unique ID
          const newCard = { ...card, id: crypto.randomUUID() };

          // Add to collection and sort
          return { collectionCards: sortCards([...state.collectionCards, newCard]) };
        }),

      addToCollectionWithId: (card: Card) =>
        set(state => {
          // Add card with specific ID to collection and sort
          return { collectionCards: sortCards([...state.collectionCards, card]) };
        }),
      removeFromCollection: (id: string) =>
        set(state => {
          // Also remove any instances from the deck
          if (state.currentDeck) {
            const deckCardInstances = state.currentDeck.cards.filter(
              card => state.collectionCards.find(c => c.id === id)?.imageUrl === card.imageUrl
            );

            if (deckCardInstances.length > 0) {
              // Remove points for each instance that's being removed
              let updatedPointsUsed = { ...state.currentDeck.pointsUsed };
              deckCardInstances.forEach(card => {
                // Deduct both build points and crew points if applicable
                if (card.buildPointCost > 0) {
                  updatedPointsUsed.buildPoints -= card.buildPointCost;
                }
                if (card.crewPointCost > 0) {
                  updatedPointsUsed.crewPoints -= card.crewPointCost;
                }
              });              return {
                collectionCards: sortCards(state.collectionCards.filter(card => card.id !== id)),
                currentDeck: {
                  ...state.currentDeck,
                  cards: state.currentDeck.cards.filter(
                    card => !deckCardInstances.some(dc => dc.id === card.id)
                  ),
                  pointsUsed: updatedPointsUsed,
                },
              };
            }
          }          // Just remove from collection if no deck instances and ensure the result is sorted
          return {
            collectionCards: sortCards(state.collectionCards.filter(card => card.id !== id)),
          };
        }),      clearCollection: () =>
        set(state => {
          // First, reset the deck if it exists
          if (state.currentDeck) {
            // Start with an empty deck
            return {
              collectionCards: [],

              currentDeck: {
                ...state.currentDeck,
                cards: [],
                pointsUsed: { buildPoints: 0, crewPoints: 0 },
              },
            };
          }

          // If no deck, just clear the collection
          return { collectionCards: [] };
        }),addToDeck: (cardId: string, area?: CardArea) =>
        set(state => {
          if (!state.currentDeck) return state;

          // Find the card in the collection
          const cardTemplate = state.collectionCards.find(card => card.id === cardId);
          if (!cardTemplate) return state;
            // First, check if we can add this card using the canAddCardToDeck function
          // Pass the area to validate structure placement too
          const validationResult = useCardStore.getState().canAddCardToDeck(cardTemplate, area);
          if (!validationResult.allowed) {
            // Don't add the card if validation fails
            // Note: Error messages are handled by the components that call this function
            return state;
          }          // Determine default area based on card type
          let defaultArea: CardArea | undefined = area;
          if (!defaultArea) {
            if (cardTemplate.type === 'Crew' || cardTemplate.type === 'Sidearm') {
              defaultArea = CardArea.Crew;
            } else if (cardTemplate.type === 'Gear' || cardTemplate.type === 'Upgrade') {
              defaultArea = CardArea.GearUpgrade;
            } else {
              // Default location for weapons, accessories, and structure
              defaultArea = CardArea.Front;
            }
          }
          
          // NOTE: All placement validations are now handled in canAddCardToDeck, 
          // which has already been called with the same area parameter

          // Create a new instance with a different ID
          const newCard = {
            ...cardTemplate,
            id: crypto.randomUUID(),
            area: defaultArea,
          };

          // Update points used
          const pointsUsed = { ...state.currentDeck.pointsUsed };

          // Add both build points and crew points if applicable
          if (newCard.buildPointCost > 0) {
            pointsUsed.buildPoints += newCard.buildPointCost;
          }
          if (newCard.crewPointCost > 0) {
            pointsUsed.crewPoints += newCard.crewPointCost;
          }

          return {
            currentDeck: {
              ...state.currentDeck,
              cards: [...state.currentDeck.cards, newCard],
              pointsUsed,
            },
          };
        }),

      updateCardArea: (id: string, area: CardArea) =>
        set(state => {
          if (!state.currentDeck) return state;
            // Find the card to update
          const cardToUpdate = state.currentDeck.cards.find(card => card.id === id);
          if (!cardToUpdate) return state;
          
          // Use the centralized validation function for card movements
          const canMove = validateCardMovement(
            cardToUpdate,
            area,
            state.currentDeck.cards
          );
          
          if (!canMove) {
            return state;
          }
          
          return {
            currentDeck: {
              ...state.currentDeck,
              cards: state.currentDeck.cards.map(card =>
                card.id === id ? { ...card, area } : card
              ),
            }
          };
        }),

      removeFromDeck: (id: string) =>
        set(state => {
          if (!state.currentDeck) return state;

          const cardToRemove = state.currentDeck.cards.find(card => card.id === id);
          if (!cardToRemove) return state;
          const pointsUsed = { ...state.currentDeck.pointsUsed };

          // Deduct both build points and crew points if applicable
          if (cardToRemove.buildPointCost > 0) {
            pointsUsed.buildPoints -= cardToRemove.buildPointCost;
          }
          if (cardToRemove.crewPointCost > 0) {
            pointsUsed.crewPoints -= cardToRemove.crewPointCost;
          }

          return {
            currentDeck: {
              ...state.currentDeck,
              cards: state.currentDeck.cards.filter(card => card.id !== id),
              pointsUsed,
            },
          };
        }),

      updateCardPosition: (id, x, y) =>
        set(state => ({
          currentDeck: state.currentDeck
            ? {
                ...state.currentDeck,
                cards: state.currentDeck.cards.map(card =>
                  card.id === id ? { ...card, position: { x, y } } : card
                ),
              }
            : null,
        })),      setDeck: deck => {
        set(state => ({
          ...state,
          currentDeck: {
            ...deck,
            // Use the imported deck's cards, point limits, and points used
            cards: deck.cards || [],
            pointLimits: deck.pointLimits || { buildPoints: 200, crewPoints: 50 },
            pointsUsed: deck.pointsUsed || { buildPoints: 0, crewPoints: 0 },
          },
        }));
      },

      updateDeckBackground: imageUrl =>
        set(state => ({
          currentDeck: state.currentDeck
            ? {
                ...state.currentDeck,
                backgroundImage: imageUrl,
              }
            : null,
        })),
      updatePointLimits: limits =>
        set(state => ({
          currentDeck: state.currentDeck
            ? {
                ...state.currentDeck,
                pointLimits: limits,
              }
            : null,
        })),

      resetDeck: () =>
        set(state => {
          if (!state.currentDeck) return state;

          return {
            currentDeck: {
              ...state.currentDeck,
              cards: [], // Remove all cards from deck
              pointsUsed: { buildPoints: 0, crewPoints: 0 }, // Reset points used to zero
            },
          };
        }),

      updateDeckName: name =>
        set(state => ({
          currentDeck: state.currentDeck
            ? {
                ...state.currentDeck,
                name: name,
              }
            : null,
        })),
    }),
    {
      name: 'car-wars-storage',
      storage,
      skipHydration: true, // Let us control hydration timing
    }
  )
);
