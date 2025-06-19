'use client';

import { useEffect, useRef, useState } from 'react';
import { DndWrapper } from '@/components/DndWrapper';
import { CardUploadProvider } from '@/context/CardUploadContext';
import { CardCollection } from '@/components/CardCollection';
import { CardCollectionHeader } from '@/components/CardCollectionHeader';
import { DeckLayout, DeckLayoutMenu, VehicleName } from '@/components/DeckLayout';
import { useCardStore } from '@/store/cardStore';
import { useCardUpload } from '@/context/CardUploadContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import { uploadCardImage } from '@/utils/cardUpload';

function PointsSummary() {
  const { currentDeck } = useCardStore();
  if (!currentDeck) return null;
  const { pointsUsed, pointLimits } = currentDeck;
  return (
    <div className="flex items-center space-x-2 text-xs text-gray-300">
      <span className="bg-blue-900 border border-blue-700 rounded px-2 py-0.5">
        BP: <span className="font-bold text-blue-200">{pointsUsed.buildPoints} / {pointLimits.buildPoints}</span>
      </span>
      <span className="bg-green-900 border border-green-700 rounded px-2 py-0.5">
        CP: <span className="font-bold text-green-200">{pointsUsed.crewPoints} / {pointLimits.crewPoints}</span>
      </span>
    </div>
  );
}

function CardCollectionTitleUpload() {
  const [uploadingCard, setUploadingCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { 
    newCardType, 
    newCardSubtype,
    newBuildPointCost, 
    newCrewPointCost,
    newNumberAllowed,
    newSource
  } = useCardUpload();
  const { addToCollection, removeFromCollection, addToCollectionWithId, collectionCards } = useCardStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCard(true);
      
      // Use shared upload utility
      const uploadResult = await uploadCardImage(
        file, 
        newCardType, 
        newCardSubtype,
        newBuildPointCost,
        newCrewPointCost,
        newNumberAllowed,
        newSource
      );
      
      // Extract the base filename without extension
      const baseName = file.name.split('.')[0];
          
      // If this is a replacement for an existing file
      if (uploadResult.isExistingFile) {
        // Find any existing cards with the same base filename
        const existingCard = collectionCards.find(card => {
          const cardBaseName = card.name.toLowerCase();
          return cardBaseName === baseName.toLowerCase();
        });
        
        if (existingCard) {
          // Create updated card with same ID but new properties
          const updatedCard = {
            id: existingCard.id, // Keep the same ID
            name: baseName,
            imageUrl: uploadResult.imageUrl,
            type: uploadResult.cardType,
            subtype: uploadResult.cardSubtype,
            buildPointCost: uploadResult.buildPointCost,
            crewPointCost: uploadResult.crewPointCost,
            numberAllowed: uploadResult.numberAllowed,
            source: uploadResult.source
          };
          
          // Update the existing card
          console.log('Updating existing card:', { existingCard, updatedCard });
          
          // Remove and re-add to update the card
          removeFromCollection(existingCard.id);
          addToCollectionWithId(updatedCard);
          return;
        }
      }
      
      // For new cards, add normally
      const newCard = {
        name: baseName,
        imageUrl: uploadResult.imageUrl,
        type: uploadResult.cardType,
        subtype: uploadResult.cardSubtype,
        buildPointCost: uploadResult.buildPointCost,
        crewPointCost: uploadResult.crewPointCost,
        numberAllowed: uploadResult.numberAllowed,
        source: uploadResult.source
      };

      // Add to collection
      addToCollection(newCard);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingCard(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploadingCard}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadingCard}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
      >
        <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
        Upload Card
      </button>
    </div>
  );
}

export default function Home() {
  const { setDeck, currentDeck } = useCardStore();
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);

  useEffect(() => {
    // Handle store hydration
    const hydrateStore = () => {
      useCardStore.persist.rehydrate();
      setIsStoreHydrated(true);
    };
    
    hydrateStore();
  }, []);

  useEffect(() => {
    // Only initialize a new deck if there isn't one already and the store is hydrated
    if (isStoreHydrated && !currentDeck) {
      const newId = Math.random().toString(36).substring(2);
      
      // Import the generator function directly
      import('@/utils/vehicleNameGenerator').then(({ generateVehicleName }) => {
        const randomName = generateVehicleName();
        
        setDeck({
          id: newId,
          name: randomName,
          backgroundImage: '',
          cards: [],
          pointLimits: {
            buildPoints: 16,
            crewPoints: 4,
          },
          pointsUsed: {
            buildPoints: 0,
            crewPoints: 0,
          }
        });
      });
    }
  }, [isStoreHydrated, setDeck, currentDeck]);

  // Show a loading state while hydrating
  if (!isStoreHydrated) {
    return (
      <div className="h-full flex flex-col bg-gray-900 items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <DndWrapper>    
      <CardUploadProvider>
        <main className="h-full flex flex-col bg-gray-900">
          <div className="flex-1 min-h-0">
            <div className="h-full grid grid-cols-1 lg:grid-cols-[30%_70%] gap-2">
              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-0">
                <div className="flex items-center justify-between p-2 border-b border-gray-700 flex-shrink-0">
                  <CardCollectionHeader />
                  <CardCollectionTitleUpload />
                </div>
                <div className="flex-1 overflow-auto">
                  <CardCollection />
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-0">
                <div className="flex items-center justify-between p-2 border-b border-gray-700 flex-shrink-0">
                  <VehicleName />
                  <div className="flex items-center space-x-3">
                    <PointsSummary />
                    <DeckLayoutMenu />
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <DeckLayout />
                </div>
              </div>
            </div>
          </div>
        </main>
      </CardUploadProvider>
    </DndWrapper>
  );
}
