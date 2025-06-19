'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/Card';
import { useCardStore } from '@/store/cardStore';
import { CardType, CardTypeCategories } from '@/types/types';
import { useCardUpload } from '@/context/CardUploadContext';
import { uploadCardImage } from '@/utils/cardUpload';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faFileImport, faTrash, faUndo, faFilter } from '@fortawesome/free-solid-svg-icons';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { processCSVToCards } from '@/utils/csvProcessing';

export function CardCollection() {
  const {
    newCardType, setNewCardType,
    newCardSubtype, setNewCardSubtype,
    newBuildPointCost, setNewBuildPointCost,
    newCrewPointCost, setNewCrewPointCost,
    newNumberAllowed, setNewNumberAllowed,
    newSource, setNewSource
  } = useCardUpload();
  const [isUploading, setIsUploading] = useState(false);
  // Filter states
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterCardType, setFilterCardType] = useState<string>("");
  const [filterSubtype, setFilterSubtype] = useState<string>("");
  const [filterCost, setFilterCost] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<string>("");
  
  const {
    collectionCards: cards,
    addToCollection: addCard,
    addToCollectionWithId,
    removeFromDeck,
    removeFromCollection,
    resetDeck,
    currentDeck,
    clearCollection
  } = useCardStore();

  // Get unique subtypes and sources from the collection
  const uniqueSubtypes = useMemo(() => {
    const subtypes = new Set<string>();
    cards.forEach(card => {
      if (card.subtype && card.subtype.trim() !== '') {
        subtypes.add(card.subtype);
      }
    });
    return Array.from(subtypes).sort();
  }, [cards]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    cards.forEach(card => {
      if (card.source && card.source.trim() !== '') {
        sources.add(card.source);
      }
    });
    return Array.from(sources).sort();
  }, [cards]);
    // Filter cards based on filter criteria
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Filter by card type
      if (filterCardType && card.type !== filterCardType) {
        return false;
      }
      
      // Filter by subtype
      if (filterSubtype && (!card.subtype || card.subtype !== filterSubtype)) {
        return false;
      }
      
      // Filter by cost (either build point cost OR crew point cost)
      if (filterCost !== null && card.buildPointCost !== filterCost && card.crewPointCost !== filterCost) {
        return false;
      }
      
      // Filter by source
      if (filterSource && (!card.source || card.source !== filterSource)) {
        return false;
      }
      
      return true;
    });
  }, [cards, filterCardType, filterSubtype, filterCost, filterSource]);
    // Reset all filters
  const resetFilters = () => {
    setFilterCardType("");
    setFilterSubtype("");
    setFilterCost(null);
    setFilterSource("");
  };

  // Create a multi-drop target that accepts both files and cards
  const [{ isOver, isCardOver }, drop] = useDrop({
    accept: ['CARD', NativeTypes.FILE],
    drop: (item: any, monitor: any) => {
      // Handle file drops
      if (monitor.getItemType() === NativeTypes.FILE) {
        handleFileDrop(item);
      }
      // Handle card drops from Builder
      else if (monitor.getItemType() === 'CARD' && item.id) {
        // Only remove the card if it's coming from the deck
        if (item.source === 'deck') {
          removeFromDeck(item.id);
        }
      }
    },
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver(),
      isCardOver: !!monitor.isOver() && monitor.getItemType() === 'CARD',
    }),
  });
  // Handle file drop logic
  const handleFileDrop = async (item: { files: File[] }) => {
    const files = item.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);

      // Check if any of the files are CSV files
      const csvFiles = files.filter(file =>
        file.type === 'text/csv' ||
        file.name.toLowerCase().endsWith('.csv')
      );

      // Handle CSV files first
      if (csvFiles.length > 0) {
        await handleCSVFiles(csvFiles);
      }

      // Then handle image files
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      // Process each image file
      for (const file of imageFiles) {
        try {
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
            const existingCard = cards.find(card => {
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
              // First remove the existing card
              removeFromCollection(existingCard.id);
              // Then add the updated card with the same ID
              addToCollectionWithId(updatedCard);

              continue; // Skip to next file
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
          addCard(newCard);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          alert(`Failed to upload ${file.name}. Please try again.`);
        }
      }
    } finally {
      setIsUploading(false);
    }
  };
  // Handle CSV files uploaded through the drop target
  const handleCSVFiles = async (csvFiles: File[]) => {
    for (const file of csvFiles) {
      try {
        const reader = new FileReader();

        // Set up a promise to handle file reading
        const csvContentPromise = new Promise<string>((resolve, reject) => {
          reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
              resolve(event.target.result);
            } else {
              reject(new Error('Failed to read CSV content'));
            }
          };

          reader.onerror = () => reject(new Error(`Error reading ${file.name}`));
        });

        // Start reading the file as text
        reader.readAsText(file);

        // Wait for the file to be read
        const csvContent = await csvContentPromise;

        // Process the CSV content using our utility
        const newCards = processCSVToCards(csvContent, cards);

        // Add each new card to the collection
        for (const newCard of newCards) {
          addCard(newCard);
        }

        console.log(`Successfully imported ${newCards.length} cards from ${file.name}`);

      } catch (error) {
        console.error(`Error processing CSV file ${file.name}:`, error);
        alert(`Failed to process CSV file ${file.name}. Please check the file format and try again.`);
      }
    }
  };
  // Reset functionality moved to DeckLayout menu

  return (
    <div
      ref={drop}
      className="p-2 h-full relative"
    >
      {/* Filter Controls */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className="flex items-center text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            <FontAwesomeIcon 
              icon={filterPanelOpen ? faUndo : faFilter} 
              className="mr-2 h-3 w-3" 
            />
            {filterPanelOpen ? "Hide Filters" : "Filter Cards"}
            {(filterCardType || filterSubtype || filterCost !== null || filterSource) && 
              <span className="ml-2 bg-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                Active
              </span>
            }
          </button>
          
          {(filterCardType || filterSubtype || filterCost !== null || filterSource) && 
            <div className="flex items-center">
              <span className="text-xs text-gray-400 mr-2">
                {filteredCards.length} of {cards.length} cards
              </span>
              <button 
                onClick={resetFilters}
                className="text-xs text-gray-400 hover:text-white"
              >
                Reset
              </button>
            </div>
          }
        </div>
        
        {/* Filter Panel */}
        {filterPanelOpen && (
          <div className="flex flex-col space-y-3 p-3 bg-gray-800 rounded border border-gray-700 mb-3">
            <h3 className="text-sm font-medium border-b border-gray-700 pb-1 mb-2">Filter Collection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Card Type Filter */}
              <div>
                <label className="font-medium text-sm">Card Type</label>
                <select
                  value={filterCardType}
                  onChange={(e) => setFilterCardType(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
                >
                  <option value="">Any Type</option>
                  <optgroup label="Build Point Cards">
                    {Object.entries(CardTypeCategories)
                      .filter(([_, category]) => category === 'BuildPoints')
                      .map(([type]) => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    }
                  </optgroup>
                  <optgroup label="Crew Point Cards">
                    {Object.entries(CardTypeCategories)
                      .filter(([_, category]) => category === 'CrewPoints')
                      .map(([type]) => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    }
                  </optgroup>
                </select>
              </div>
              
              {/* Subtype Filter */}
              <div>
                <label className="font-medium text-sm">Subtype</label>
                <select
                  value={filterSubtype}
                  onChange={(e) => setFilterSubtype(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
                >
                  <option value="">Any Subtype</option>
                  {uniqueSubtypes.map((subtype) => (
                    <option key={subtype} value={subtype}>{subtype}</option>
                  ))}
                </select>
              </div>
                {/* Cost Filter (Build or Crew Point Cost) */}
              <div>
                <label className="font-medium text-sm">Cost (BP or CP)</label>
                <select
                  value={filterCost === null ? "" : filterCost}
                  onChange={(e) => setFilterCost(e.target.value === "" ? null : Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
                >
                  <option value="">Any Cost</option>
                  {[...Array(9).keys()].map((cost) => (
                    <option key={cost} value={cost}>{cost}</option>
                  ))}
                </select>
              </div>
              
              {/* Source Filter */}
              <div>
                <label className="font-medium text-sm">Source</label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
                >
                  <option value="">Any Source</option>
                  {uniqueSources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
        {/* Upload Settings Panel removed - will be added back later */}
      
      {/* Drag overlay - shows when dragging */}
      {isOver && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className={`absolute inset-0 ${isCardOver ? 'bg-red-500 bg-opacity-20 border-2 border-dashed border-red-400' : 'bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-400'} rounded-lg`}></div>
          <div className="bg-gray-800 bg-opacity-90 p-6 rounded-lg text-center shadow-2xl">
            {isCardOver ? (
              <>
                <FontAwesomeIcon icon={faTrash} className="w-16 h-16 text-red-400 mb-4" />
                <div className="text-xl font-medium text-white mb-2">Drop to remove card from deck</div>
                <div className="text-sm text-gray-300">Card will be removed from Builder only</div>
              </>
            ) : (
              <>
                <div className="flex gap-8">
                  <div className="text-center">
                    <FontAwesomeIcon icon={faCloudUploadAlt} className="w-16 h-16 text-blue-400 mb-4" />
                    <div className="text-xl font-medium text-white mb-2">Drop images to add cards</div>
                    <div className="text-sm text-gray-300">Cards will use the current settings</div>
                  </div>
                  <div className="text-center">
                    <FontAwesomeIcon icon={faFileImport} className="w-16 h-16 text-green-400 mb-4" />
                    <div className="text-xl font-medium text-white mb-2">Drop CSV files to import cards</div>
                    <div className="text-sm text-gray-300">Cards will use Blank_ images as placeholders</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Cards grid with fallback message */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${isUploading ? 'opacity-50' : ''}`}>
        {cards.length > 0 ? (
          filteredCards.map((card) => (
            <Card key={card.id} card={card} isInCollection={true} />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-700 rounded-lg">
            <div className="flex flex-col items-center">
              <div className="flex flex-col items-center">
                <FontAwesomeIcon icon={faCloudUploadAlt} className="w-12 h-12 mb-4 text-gray-500" />
                <p className="text-center text-lg mb-1">Drag and drop card images here</p>
                <br />
              </div>          
              <div className="flex items-center w-full my-4 max-w-xs">
                <div className="flex-grow h-px bg-gray-700"></div>
                <span className="px-3 text-gray-500 text-sm uppercase tracking-wider">or</span>
                <div className="flex-grow h-px bg-gray-700"></div>
              </div>
              
              <div className="flex flex-col items-center">
                <FontAwesomeIcon icon={faFileImport} className="w-12 h-12 mb-4 text-gray-500" />
                <p className="text-center text-lg mb-2">Import cards from CSV</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Imported cards will use Blank placeholder images</p>
          </div>
        )}
      </div>
    </div>
  );
}

