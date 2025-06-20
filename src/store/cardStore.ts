import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Card, DeckLayout, CardTypeCategories, PointLimits, CardArea } from '@/types/types';

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
  reason?: 'duplicate_gear' | 'duplicate_sidearm' | 'duplicate_accessory' | 'duplicate_upgrade' | 'same_subtype' | 'not_enough_points' | 'crew_limit_reached' | 'structure_limit_reached' | 'weapon_cost_limit';
  conflictingCard?: Card;
  crewType?: 'Driver' | 'Gunner';
  area?: CardArea;
  weaponCost?: number;
  pointLimit?: number;
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
  canAddCardToDeck: (card: Card) => CardValidationResult;
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
      },      canAddCardToDeck: (card: Card) => {
        // Check if we can add the card to the current deck
        const state = get();
        if (!state.currentDeck) {
          return { allowed: false, reason: 'not_enough_points' };
        }

        const availablePoints = get().getAvailablePoints();

        // Check both build points and crew points
        let canAdd = true;

        if (card.buildPointCost > 0) {
          canAdd = canAdd && availablePoints.buildPoints >= card.buildPointCost;
        }

        if (card.crewPointCost > 0) {
          canAdd = canAdd && availablePoints.crewPoints >= card.crewPointCost;
        }          // Not enough points
        if (!canAdd) {
          return { allowed: false, reason: 'not_enough_points' };
        }
        
        // Special rule: Weapons that cost 6 or more cannot be equipped in games using 24 BP or less
        if (card.type === 'Weapon' && card.buildPointCost >= 6) {
          // Check if the current deck has 24 BP or less
          if (state.currentDeck.pointLimits.buildPoints <= 24) {
            return { 
              allowed: false, 
              reason: 'weapon_cost_limit', 
              weaponCost: card.buildPointCost,
              pointLimit: state.currentDeck.pointLimits.buildPoints
            };
          }
        }
          // Special rules for Gear and Sidearm cards:
        if ((card.type === 'Gear' || card.type === 'Sidearm') && state.currentDeck.cards.length > 0) {
          // Get all cards of the same type currently in the deck
          const sameTypeCardsInDeck = state.currentDeck.cards.filter(c => c.type === card.type);
          
          // Rule 1: Cannot equip multiple copies of the same card by name
          // This is the primary check - if names match, it's a duplicate
          const hasSameNameCard = sameTypeCardsInDeck.some(c => c.name === card.name);
          
          // Rule 1b: For real images (not placeholders), check if they're the same
          // This handles custom uploaded cards that might have same image but different names
          const isCardPlaceholder = !card.imageUrl || 
            card.imageUrl.includes('Blank_') || 
            card.imageUrl.includes('placeholders/');
          // Check for placeholder images
          
          let hasSameImage = false;
          
          // Only do the image check if the new card has a real (non-placeholder) image
          if (!isCardPlaceholder) {
            hasSameImage = sameTypeCardsInDeck.some(c => {
              const isDeckCardPlaceholder = !c.imageUrl || 
                c.imageUrl.includes('Blank_') || 
                c.imageUrl.includes('placeholders/');
              
              // Only compare when both are real images, not placeholders
              return !isDeckCardPlaceholder && c.imageUrl === card.imageUrl;
            });
          }
          
          if (hasSameNameCard || hasSameImage) {
            const reasonType = card.type === 'Gear' ? 'duplicate_gear' : 'duplicate_sidearm';
            return { allowed: false, reason: reasonType };
          }
          
          // Rule 2: Cannot equip a card with the same subtype as an existing card of the same type
          if (card.subtype && card.subtype.trim() !== '') {
            const conflictingCard = sameTypeCardsInDeck.find(c => 
              c.subtype && c.subtype.trim() !== '' && c.subtype.toLowerCase() === card.subtype.toLowerCase()
            );
            
            if (conflictingCard) {
              return { allowed: false, reason: 'same_subtype', conflictingCard };
            }
          }
        }
        
        // Special rules for Accessories: Cannot equip multiple accessories that share the same name
        if (card.type === 'Accessory' && state.currentDeck.cards.length > 0) {
          const accessoriesInDeck = state.currentDeck.cards.filter(c => c.type === 'Accessory');
          
          // Check for accessories with the same name
          const hasSameName = accessoriesInDeck.some(c => c.name === card.name);
          
          if (hasSameName) {
            return { allowed: false, reason: 'duplicate_accessory' };
          }
        }
        
        // Special rules for Upgrades: Cannot equip multiple upgrades that share the same name or subtype
        if (card.type === 'Upgrade' && state.currentDeck.cards.length > 0) {
          const upgradesInDeck = state.currentDeck.cards.filter(c => c.type === 'Upgrade');
          
          // Check for upgrades with the same name
          const hasSameName = upgradesInDeck.some(c => c.name === card.name);
          
          if (hasSameName) {
            return { allowed: false, reason: 'duplicate_upgrade' };
          }
          
          // Check for upgrades with the same subtype
          if (card.subtype && card.subtype.trim() !== '') {
            const conflictingCard = upgradesInDeck.find(c => 
              c.subtype && c.subtype.trim() !== '' && c.subtype.toLowerCase() === card.subtype.toLowerCase()
            );
            
            if (conflictingCard) {
              return { allowed: false, reason: 'same_subtype', conflictingCard };
            }
          }
        }
        // Special rules for Crew cards - limit to 1 Driver and 1 Gunner
        if (card.type === 'Crew' && state.currentDeck.cards.length > 0) {
          // Get all crew cards in the deck
          const crewCardsInDeck = state.currentDeck.cards.filter(c => c.type === 'Crew');
          
          // Check if the card is a driver or gunner
          if (card.subtype && card.subtype.trim() !== '') {
            const subtypeNormalized = card.subtype.trim().toLowerCase();
            
            // Check for Driver limit
            if (subtypeNormalized === 'driver') {
              const hasDriver = crewCardsInDeck.some(c => 
                c.subtype && c.subtype.trim().toLowerCase() === 'driver'
              );
              
              if (hasDriver) {
                return { 
                  allowed: false, 
                  reason: 'crew_limit_reached', 
                  crewType: 'Driver'
                };
              }
            }
            
            // Check for Gunner limit
            if (subtypeNormalized === 'gunner') {
              const hasGunner = crewCardsInDeck.some(c => 
                c.subtype && c.subtype.trim().toLowerCase() === 'gunner'
              );
              
              if (hasGunner) {
                return { 
                  allowed: false, 
                  reason: 'crew_limit_reached', 
                  crewType: 'Gunner'  
                };
              }
            }
          }
        }        // Special rules for Structure cards - limit to 1 structure card per side
        if (card.type === 'Structure' && state.currentDeck.cards.length > 0) {
          // Count total structure cards
          const totalStructures = state.currentDeck.cards.filter(c => c.type === 'Structure').length;
          
          // Check if already have 4 structure cards (maximum allowed)
          if (totalStructures >= 4) {
            return {
              allowed: false,
              reason: 'structure_limit_reached'
            };
          }
          
          // We can't check specific areas here since when checking if a card can be added,
          // we don't know which area it will be added to yet.
          // The actual area-specific validation will be done in the addToDeck and
          // DeckLayout's drop handler.
        }
        return { allowed: true };
      },      addToCollection: (card: Omit<Card, 'id'>) =>
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
          const validationResult = useCardStore.getState().canAddCardToDeck(cardTemplate);
          if (!validationResult.allowed) {
            // Don't add the card if validation fails
            // Note: Error messages are handled by the components that call this function
            return state;
          }

          // Determine default area based on card type
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
          
          // For Structure cards, check if there's already a structure in the target area
          if (cardTemplate.type === 'Structure') {
            // Only check if the target area is a vehicle location (not crew or gear/upgrade)
            const isVehicleLocation = [CardArea.Front, CardArea.Back, CardArea.Left, CardArea.Right].includes(defaultArea);
            
            if (isVehicleLocation) {
              const hasStructureInArea = state.currentDeck.cards.some(c => 
                c.type === 'Structure' && c.area === defaultArea
              );
                if (hasStructureInArea) {
                // Just return state unchanged - error handled by components through validation
                return state;
              }
            }
          }

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
        set(state => ({
          currentDeck: state.currentDeck
            ? {
                ...state.currentDeck,
                cards: state.currentDeck.cards.map(card =>
                  card.id === id ? { ...card, area } : card
                ),
              }
            : null,
        })),

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
