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
import { faUpload, faTrash } from '@fortawesome/free-solid-svg-icons';
import { uploadCardImage } from '@/utils/cardUpload';

function PointsSummary() {
  const { currentDeck } = useCardStore();
  if (!currentDeck) return null;
  const { pointsUsed, pointLimits } = currentDeck;
  return (
    <div className="flex items-center space-x-2 text-xs text-gray-300">
      <span className="bg-blue-900 border border-blue-700 rounded px-2 py-0.5">
        BP:{' '}
        <span className="font-bold text-blue-200">
          {pointsUsed.buildPoints} / {pointLimits.buildPoints}
        </span>
      </span>
      <span className="bg-green-900 border border-green-700 rounded px-2 py-0.5">
        CP:{' '}
        <span className="font-bold text-green-200">
          {pointsUsed.crewPoints} / {pointLimits.crewPoints}
        </span>
      </span>
    </div>
  );
}

function CardCollectionTitleUpload() {
  const [uploadingCard, setUploadingCard] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const {
    newCardType,
    newCardSubtype,
    newBuildPointCost,
    newCrewPointCost,
    newNumberAllowed,
    newSource,
  } = useCardUpload();
  const {
    addToCollection,
    removeFromCollection,
    addToCollectionWithId,
    collectionCards,
    clearCollection,
  } = useCardStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Handle clicking outside to close the menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMenuOpen(false); // Close menu after selecting file

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
            source: uploadResult.source,
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
        source: uploadResult.source,
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

  const handleClearAllClick = () => {
    setShowClearConfirm(true);
    setMenuOpen(false);
  };

  const handleConfirmClear = () => {
    clearCollection();
    setShowClearConfirm(false);
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploadingCard}
        className="hidden"
        aria-label="Upload card image"
      />

      {/* Hamburger menu button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        aria-label="Menu"
      >
        <div className="flex flex-col gap-1 items-center justify-center w-4">
          <div className="w-full h-0.5 bg-white"></div>
          <div className="w-full h-0.5 bg-white"></div>
          <div className="w-full h-0.5 bg-white"></div>
        </div>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 w-48">
          <ul className="py-1">
            <li>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
                Upload Card
              </button>
            </li>
            {collectionCards.length > 0 && (
              <li>
                <button
                  onClick={handleClearAllClick}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  Clear All Cards
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Clear All confirmation dialog */}
      {showClearConfirm && (
        <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 p-3">
          <p className="text-sm text-red-400 mb-2">Delete all cards. Are you sure?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleConfirmClear}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Yes
            </button>
            <button
              onClick={handleCancelClear}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { setDeck, currentDeck } = useCardStore();
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(30); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.getElementById('split-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Limit the resize between 20% and 80% of the container width
    const width = Math.min(Math.max(newWidth, 20), 80);
    setLeftPanelWidth(width);
    document.documentElement.style.setProperty('--panel-width', `${width}%`);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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
          backgroundImage: '', // We're still initializing with empty string, the DeckLayout will handle the default
          cards: [],
          pointLimits: {
            buildPoints: 16,
            crewPoints: 4,
          },
          pointsUsed: {
            buildPoints: 0,
            crewPoints: 0,
          },
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
            <div id="split-container" className="h-full flex gap-2">
              <div className="panel-left bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-0">
                <div className="flex items-center justify-between p-2 border-b border-gray-700 flex-shrink-0">
                  <CardCollectionHeader />
                  <CardCollectionTitleUpload />
                </div>
                <div className="flex-1 overflow-auto">
                  <CardCollection />
                </div>
              </div>

              <div className="resize-handle" onMouseDown={handleMouseDown} />

              <div className="panel-right bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-0">
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
