'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/Card';
import { useCardStore } from '@/store/cardStore';
import { CardType, CardTypeCategories } from '@/types/types';
import { useCardUpload } from '@/context/CardUploadContext';
import { uploadCardImage } from '@/utils/cardUpload';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudUploadAlt, faFileImport, faTrash, faUndo } from '@fortawesome/free-solid-svg-icons';
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
  const [isUploading, setIsUploading] = useState(false);const { 
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
        try {const uploadResult = await uploadCardImage(
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

  return (    <div 
      ref={drop}
      className="p-2 h-full relative"
    >      
      <div className="mb-4">
        <div className="flex flex-col space-y-3">          {/* Row 1: Card Type and Subtype */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="font-medium">Card Type</label>
              <select
                value={newCardType}
                onChange={(e) => setNewCardType(e.target.value as CardType)}
                className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
              >
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
            <div className="flex-1">
              <label className="font-medium">Subtype</label>              <select
                value={uniqueSubtypes.includes(newCardSubtype) ? newCardSubtype : newCardSubtype ? "custom" : ""}
                onChange={(e) => {
                  if (e.target.value !== "custom") {
                    setNewCardSubtype(e.target.value);
                  }
                }}
                className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
              >
                <option value="">-- Select Subtype --</option>
                {uniqueSubtypes.map((subtype) => (
                  <option key={subtype} value={subtype}>{subtype}</option>
                ))}
                <option value="custom">-- Custom Subtype --</option>
              </select>
              {newCardSubtype && !uniqueSubtypes.includes(newCardSubtype) && (
                <input
                  type="text"
                  value={newCardSubtype}
                  onChange={(e) => setNewCardSubtype(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full mt-1"
                  placeholder="Enter custom subtype"
                  autoFocus
                />
              )}
            </div>
          </div>
          
          {/* Row 2: Build and Crew Point Costs */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="font-medium">Build Point Cost</label>              <select
                value={newBuildPointCost}
                onChange={(e) => setNewBuildPointCost(Number(e.target.value))}
                className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
              >
                {[...Array(9).keys()].map((cost) => (
                  <option key={cost} value={cost}>{cost}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="font-medium">Crew Point Cost</label>
              <select
                value={newCrewPointCost}
                onChange={(e) => setNewCrewPointCost(Number(e.target.value))}
                className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
              >
                {[...Array(9).keys()].map((cost) => (
                  <option key={cost} value={cost}>{cost}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Row 3: Source only (Number Allowed removed) */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="font-medium">Source</label>              <select
                value={uniqueSources.includes(newSource) ? newSource : newSource ? "custom" : ""}
                onChange={(e) => {
                  if (e.target.value !== "custom") {
                    setNewSource(e.target.value);
                  }
                }}
                className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full"
              >
                <option value="">-- Select Source --</option>
                {uniqueSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
                <option value="custom">-- Custom Source --</option>
              </select>
              {newSource && !uniqueSources.includes(newSource) && (
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-2 w-full mt-1"
                  placeholder="Enter custom source"
                  autoFocus
                />
              )}
            </div>
            
            {/* Hidden Number Allowed field - setting default to 1 */}
            <input
              type="hidden"
              value="1"
              onChange={(e) => setNewNumberAllowed(1)}
            />
          </div>
        </div>
      </div>
        {/* Drag overlay - shows when dragging */}      {isOver && (
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
          cards.map((card) => (
            <Card key={card.id} card={card} isInCollection={true} />
          ))
        ) : (          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-700 rounded-lg">
            <div className="flex space-x-6">
              <div className="flex flex-col items-center">
                <FontAwesomeIcon icon={faCloudUploadAlt} className="w-12 h-12 mb-4 text-gray-500" />
                <p className="text-center text-lg mb-2">Drag and drop card images here</p>
              </div>
              <div className="flex flex-col items-center">
                <FontAwesomeIcon icon={faFileImport} className="w-12 h-12 mb-4 text-gray-500" />
                <p className="text-center text-lg mb-2">Import cards from CSV</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Imported cards will use Blank_ card images as placeholders</p>
          </div>
        )}
      </div>    </div>
  );
}

