import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Card, DeckLayout, CardTypeCategories, PointLimits, CardArea } from '@/types/types'

interface CardStore {
  collectionCards: Card[]
  currentDeck: DeckLayout | null
  addToCollection: (card: Omit<Card, 'id'>) => void
  addToCollectionWithId: (card: Card) => void
  removeFromCollection: (id: string) => void
  clearCollection: () => void
  addToDeck: (cardId: string, area?: CardArea) => void
  removeFromDeck: (id: string) => void
  updateCardPosition: (id: string, x: number, y: number) => void
  updateCardArea: (id: string, area: CardArea) => void
  setDeck: (deck: DeckLayout) => void
  updateDeckName: (name: string) => void
  updateDeckBackground: (imageUrl: string) => void
  updatePointLimits: (limits: PointLimits) => void
  canAddCardToDeck: (card: Card) => boolean
  getAvailablePoints: () => { buildPoints: number; crewPoints: number }
  resetDeck: () => void
}

const storage = typeof window !== 'undefined'
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
          buildPoints: state.currentDeck.pointLimits.buildPoints - state.currentDeck.pointsUsed.buildPoints,
          crewPoints: state.currentDeck.pointLimits.crewPoints - state.currentDeck.pointsUsed.crewPoints
        };
      },      canAddCardToDeck: (card: Card) => {
        const state = get();
        if (!state.currentDeck) return false;

        const availablePoints = get().getAvailablePoints();
        
        // Check both build points and crew points
        let canAdd = true;
        
        if (card.buildPointCost > 0) {
          canAdd = canAdd && availablePoints.buildPoints >= card.buildPointCost;
        }
        
        if (card.crewPointCost > 0) {
          canAdd = canAdd && availablePoints.crewPoints >= card.crewPointCost;
        }
        
        return canAdd;
      },

      addToCollection: (card: Omit<Card, 'id'>) => set((state) => {
        // Create a new card with a unique ID
        const newCard = { ...card, id: crypto.randomUUID() };
        
        // Add to collection only
        return { collectionCards: [...state.collectionCards, newCard] };
      }),

      addToCollectionWithId: (card: Card) => set((state) => {
        // Add card with specific ID to collection
        return { collectionCards: [...state.collectionCards, card] };
      }),      removeFromCollection: (id: string) => set((state) => {
        // Also remove any instances from the deck
        if (state.currentDeck) {
          const deckCardInstances = state.currentDeck.cards.filter(card => 
            state.collectionCards.find(c => c.id === id)?.imageUrl === card.imageUrl
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
            });
            
            return {
              collectionCards: state.collectionCards.filter(card => card.id !== id),
              currentDeck: {
                ...state.currentDeck,
                cards: state.currentDeck.cards.filter(card => 
                  !deckCardInstances.some(dc => dc.id === card.id)
                ),
                pointsUsed: updatedPointsUsed
              }
            };
          }
        }
        
        // Just remove from collection if no deck instances
        return { 
          collectionCards: state.collectionCards.filter(card => card.id !== id)
        };
      }),
      
      clearCollection: () => set((state) => {
        // First, reset the deck if it exists
        if (state.currentDeck) {
          // Start with an empty deck 
          return {
            collectionCards: [],
            currentDeck: {
              ...state.currentDeck,
              cards: [],
              pointsUsed: { buildPoints: 0, crewPoints: 0 }
            }
          };
        }
        
        // If no deck, just clear the collection
        return { collectionCards: [] };
      }),
        addToDeck: (cardId: string, area?: CardArea) => set((state) => {
        if (!state.currentDeck) return state;
        
        // Find the card in the collection
        const cardTemplate = state.collectionCards.find(card => card.id === cardId);
        if (!cardTemplate) return state;
        
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
        
        // Create a new instance with a different ID
        const newCard = { 
          ...cardTemplate, 
          id: crypto.randomUUID(),
          area: defaultArea
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
            pointsUsed
          }
        };
      }),
      
      updateCardArea: (id: string, area: CardArea) => set((state) => ({
        currentDeck: state.currentDeck ? {
          ...state.currentDeck,
          cards: state.currentDeck.cards.map(card =>
            card.id === id ? { ...card, area } : card
          )
        } : null
      })),

      removeFromDeck: (id: string) => set((state) => {
        if (!state.currentDeck) return state;

        const cardToRemove = state.currentDeck.cards.find(card => card.id === id);
        if (!cardToRemove) return state;        const pointsUsed = { ...state.currentDeck.pointsUsed };
        
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
            pointsUsed
          }
        };
      }),

      updateCardPosition: (id, x, y) => set((state) => ({
        currentDeck: state.currentDeck ? {
          ...state.currentDeck,
          cards: state.currentDeck.cards.map(card =>
            card.id === id ? { ...card, position: { x, y } } : card
          )
        } : null
      })),

      setDeck: (deck) => {
        set((state) => ({
          ...state,
          currentDeck: {
            ...deck,
            cards: [],
            pointLimits: deck.pointLimits || { buildPoints: 200, crewPoints: 50 },
            pointsUsed: deck.pointsUsed || { buildPoints: 0, crewPoints: 0 }
          }
        }));
      },

      updateDeckBackground: (imageUrl) => set((state) => ({
        currentDeck: state.currentDeck ? {
          ...state.currentDeck,
          backgroundImage: imageUrl
        } : null
      })),      updatePointLimits: (limits) => set((state) => ({
        currentDeck: state.currentDeck ? {
          ...state.currentDeck,
          pointLimits: limits
        } : null
      })),

      resetDeck: () => set((state) => {
        if (!state.currentDeck) return state;
        
        return {
          currentDeck: {
            ...state.currentDeck,
            cards: [], // Remove all cards from deck
            pointsUsed: { buildPoints: 0, crewPoints: 0 } // Reset points used to zero
          }
        };
      }),

      updateDeckName: (name) => set((state) => ({
        currentDeck: state.currentDeck ? {
          ...state.currentDeck,
          name: name
        } : null
      })),
    }),
    {
      name: 'car-wars-storage',
      storage,
      skipHydration: true // Let us control hydration timing
    }
  )
);
