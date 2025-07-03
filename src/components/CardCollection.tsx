'use client';

import { useState, useMemo, useContext, useEffect } from 'react';
import { Card } from '@/components/Card';
import { useCardStore } from '@/store/cardStore';
import { CardType } from '@/types/types';
import { useCardUpload } from '@/context/CardUploadContext';
import { uploadCardImage } from '@/utils/cardUpload';
import { ToastContext } from '@/components/Toast';
import { faCloudUploadAlt, faFileImport } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { processCSVToCards } from '@/utils/csvProcessing';
import { useConfirmationDialog } from './useConfirmationDialog';

interface CardCollectionProps {
  filterPanelOpen: boolean;
  updateFilterPanelOpen: (value: boolean) => void;
  filterCardTypes: string[];
  updateFilterCardTypes: (value: string[]) => void;
  filterSubtypes: string[];
  updateFilterSubtypes: (value: string[]) => void;
  filterCardName: string;
  updateFilterCardName: (value: string) => void;
  filterMinCost: number;
  updateFilterMinCost: (value: number) => void;
  filterMaxCost: number;
  updateFilterMaxCost: (value: number) => void;
  filterSources: string[];
  updateFilterSources: (value: string[]) => void;
  resetFilters: () => void;
  filteredCardsCount: number;
  totalCardsCount: number;
  subtypesByCardType: Record<string, string[]>;
  uniqueSources: string[];
}

export function CardCollection({
  filterCardTypes,
  filterSubtypes,
  filterCardName,
  filterMinCost,
  filterMaxCost,
  filterSources,
}: CardCollectionProps) {
  // CSS for custom range sliders
  const rangeSliderStyle = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      margin-top: -6px;
      z-index: 1;
      position: relative;
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
    }

    input[type="range"]:focus::-webkit-slider-thumb {
      background: #2563eb;
    }

    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
    }
  `;

  const { showToast } = useContext(ToastContext) || {};
  const {
    newCardType,
    newCardSubtype,
    newBuildPointCost,
    newCrewPointCost,
    newNumberAllowed,
    newSource,
  } = useCardUpload();
  const [isUploading, setIsUploading] = useState(false);
  const { confirm, dialog } = useConfirmationDialog();

  const {
    collectionCards,
    currentDeck,
    loadCollection,
    addToCollectionWithId,
    removeFromDeck,
    canRemoveFromDeck,
    clearCollection,
    bulkUpdateCollection,
  } = useCardStore();

  // Load the global card collection when component mounts
  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  // Get unique subtypes organized by their corresponding card type
  const subtypesByCardTypeMemo = useMemo(() => {
    // Create an object to map subtypes to their card type
    const subtypeToCardTypeMap: Record<string, CardType> = {};

    // Create an object to store unique subtypes for each card type
    const result: Record<CardType, string[]> = {
      [CardType.Weapon]: [],
      [CardType.Upgrade]: [],
      [CardType.Accessory]: [],
      [CardType.Structure]: [],
      [CardType.Crew]: [],
      [CardType.Gear]: [],
      [CardType.Sidearm]: [],
    };

    // First pass: map each subtype to its card type
    collectionCards.forEach(card => {
      if (card.subtype && card.subtype.trim() !== '' && card.type) {
        // Map this subtype to its card type if not already mapped
        if (!subtypeToCardTypeMap[card.subtype]) {
          subtypeToCardTypeMap[card.subtype] = card.type;
        }
      }
    });

    // Second pass: collect all unique subtypes for each card type
    Object.entries(subtypeToCardTypeMap).forEach(([subtype, cardType]) => {
      if (!result[cardType].includes(subtype)) {
        result[cardType].push(subtype);
      }
    });

    // Sort subtypes alphabetically within each card type
    Object.keys(result).forEach(type => {
      result[type as CardType].sort();
    });

    return result;
  }, [collectionCards]);

  const uniqueSourcesMemo = useMemo(() => {
    const sources = new Set<string>();
    collectionCards.forEach(card => {
      if (card.source && card.source.trim() !== '') {
        sources.add(card.source);
      }
    });
    return Array.from(sources).sort();
  }, [collectionCards]); // Filter cards based on filter criteria
  const filteredCards = useMemo(() => {
    // Cards are already sorted at the store level, so we just need to filter
    return collectionCards.filter(card => {
      // Filter by card type - if any card types are selected, the card must match one of them
      if (filterCardTypes.length > 0 && !filterCardTypes.includes(card.type)) {
        return false;
      }

      // Filter by subtype - if any subtypes are selected, the card must match one of them
      if (filterSubtypes.length > 0 && (!card.subtype || !filterSubtypes.includes(card.subtype))) {
        return false;
      }

      // Filter by card name - if a card name is entered, the card name must include this value
      if (
        filterCardName.trim() !== '' &&
        (!card.name || !card.name.toLowerCase().includes(filterCardName.toLowerCase()))
      ) {
        return false;
      }

      // Filter by cost range
      // Get the effective cost - the maximum of build and crew point costs
      const effectiveCost = Math.max(
        card.buildPointCost !== undefined ? card.buildPointCost : 0,
        card.crewPointCost !== undefined ? card.crewPointCost : 0
      );

      // Check if the cost is outside the selected range
      if (effectiveCost < filterMinCost || effectiveCost > filterMaxCost) {
        return false;
      }

      // Filter by source - if any sources are selected, the card must match one of them
      if (filterSources.length > 0 && (!card.source || !filterSources.includes(card.source))) {
        return false;
      }

      return true;
    });
    // Note: No need to sort here as the cards collection is already sorted
  }, [
    collectionCards,
    filterCardTypes,
    filterSubtypes,
    filterCardName,
    filterMinCost,
    filterMaxCost,
    filterSources,
  ]);
  // Create a multi-drop target that accepts both files and cards
  const [{ isOver, isCardOver }, drop] = useDrop({
    accept: ['CARD', NativeTypes.FILE],
    drop: async (item: any, monitor: any) => {
      // Handle file drops
      if (monitor.getItemType() === NativeTypes.FILE) {
        await handleFileDrop(item);
      }
      // Handle card drops from Builder
      else if (monitor.getItemType() === 'CARD' && item.id) {
        // Only remove the card if it's coming from the deck
        if (item.source === 'deck') {
          // Check if the card can be removed (no dependent cards)
          const validationResult = canRemoveFromDeck(item.id);

          if (
            !validationResult.allowed &&
            validationResult.reason === 'has_dependent_cards' &&
            validationResult.conflictingCard
          ) {
            showToast(
              `Cannot remove ${item.name} because ${validationResult.conflictingCard.name} depends on it. Remove ${validationResult.conflictingCard.name} first.`,
              'error'
            );
            return;
          }

          // Remove x copies if card.copies > 1, otherwise just one (same logic as Card.tsx)
          const deckCard = currentDeck?.cards.find(c => c.id === item.id);
          const copiesToRemove =
            deckCard && deckCard.copies && deckCard.copies > 1 ? deckCard.copies : 1;
          removeFromDeck(item.id, copiesToRemove);
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
      const csvFiles = files.filter(
        file => file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
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
          // Extract the base filename without extension
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          // Check if filename follows Name_Subtype format
          const underscoreMatch = baseName.match(/^(.+)_(.+)$/);
          let cardName = baseName;
          let cardSubtypeFromName: string | undefined;

          if (underscoreMatch) {
            // If we have a Name_Subtype format, extract them
            [, cardName, cardSubtypeFromName] = underscoreMatch;
          }

          // Try to find a card with a matching name (case-insensitive, trimmed)
          // If we have a subtype from the filename, also match on that
          const existingCard = collectionCards.find(card => {
            const nameMatch = card.name.trim().toLowerCase() === cardName.trim().toLowerCase();

            // If we have a subtype from the filename, make sure it matches BOTH name AND subtype
            if (cardSubtypeFromName) {
              // For Crew cards, ensure we're matching exactly the right subtype (Driver vs Gunner)
              if (card.type === CardType.Crew) {
                return (
                  nameMatch &&
                  card.subtype.trim().toLowerCase() === cardSubtypeFromName.trim().toLowerCase()
                );
              }

              // For non-Crew cards, do a general subtype match check
              return (
                nameMatch &&
                card.subtype.trim().toLowerCase() === cardSubtypeFromName.trim().toLowerCase()
              );
            }

            return nameMatch;
          });
          const uploadResult = await uploadCardImage(
            file,
            newCardType,
            cardSubtypeFromName || newCardSubtype,
            newBuildPointCost,
            newCrewPointCost,
            newNumberAllowed,
            newSource,
            showToast
          );

          if (existingCard) {
            // Update only the image for the existing card
            const updatedCard = {
              ...existingCard,
              imageUrl: uploadResult.imageUrl,
            };
            // We now use addToCollectionWithId directly from the store
            await addToCollectionWithId(updatedCard);
            continue; // Skip to next file
          } // For new cards, add normally
          // If the file had a Name_Subtype format, use the parsedName as the card name
          const newCard = {
            name: uploadResult.parsedName || baseName,
            imageUrl: uploadResult.imageUrl,
            type: uploadResult.cardType,
            subtype: uploadResult.cardSubtype,
            buildPointCost: uploadResult.buildPointCost,
            crewPointCost: uploadResult.crewPointCost,
            numberAllowed: uploadResult.numberAllowed,
            source: uploadResult.source,
            copies: uploadResult.copies || 1,
            exclusive: uploadResult.exclusive || false,
            sides: uploadResult.sides || '',
          };

          // Add to collection using the store function
          await addToCollectionWithId({
            ...newCard,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          });
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
        // First, show the confirmation dialog before processing to avoid delay
        const replaceCollection = await confirm({
          title: 'Import CSV Cards',
          message: 'Do you want to replace the entire collection with these CSV cards?',
          confirmText: 'Replace All',
          cancelText: 'Add to Collection',
        });

        // Now proceed with file reading
        const reader = new FileReader();

        // Set up a promise to handle file reading
        const csvContentPromise = new Promise<string>((resolve, reject) => {
          reader.onload = event => {
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
        const newCards = await processCSVToCards(csvContent, collectionCards);

        // Take action based on the user's choice in the dialog
        if (replaceCollection) {
          try {
            // First, clear the existing collection
            await clearCollection();

            if (showToast) {
              showToast('Cleared existing collection', 'info');
            }

            // Then add all the new cards with unique IDs
            const cardsWithUniqueIds = newCards.map(card => ({
              ...card,
              id: crypto.randomUUID(),
            }));

            // Use bulk update to add all cards at once
            await bulkUpdateCollection(cardsWithUniqueIds);

            if (showToast) {
              showToast(
                `Replaced collection with ${cardsWithUniqueIds.length} new cards`,
                'success'
              );
            }
          } catch (error) {
            console.error('Error replacing collection:', error);
            if (showToast) {
              showToast('Failed to replace collection', 'error');
            }
          }
        } else {
          try {
            // Add each new card to the collection individually
            let addedCount = 0;

            for (const newCard of newCards) {
              // Create a new card object with a generated id
              await addToCollectionWithId({
                ...newCard,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              });
              addedCount++;
            }

            if (showToast) {
              showToast(`Added ${addedCount} new cards to your collection`, 'success');
            }
          } catch (error) {
            console.error('Error adding cards to collection:', error);
            if (showToast) {
              showToast('Failed to add some cards to collection', 'error');
            }
          }
        }

        console.log(`Successfully imported ${newCards.length} cards from ${file.name}`);
      } catch (error) {
        console.error(`Error processing CSV file ${file.name}:`, error);
        alert(
          `Failed to process CSV file ${file.name}. Please check the file format and try again.`
        );
      }
    }
  };
  // Reset functionality moved to DeckLayout menu
  return (
    <div className="h-full">
      {/* Render the confirmation dialog */}
      {dialog}
      <style jsx>{rangeSliderStyle}</style>
      {/* Card collection area with drag and drop */}
      <div ref={drop} className="relative p-2">
        {isOver && (
          <div
            className={`absolute inset-0 z-50 pointer-events-none border-2 border-dashed ${
              isCardOver ? 'border-red-400' : 'border-yellow-400'
            } rounded-lg`}
          />
        )}
        {/* Cards grid with fallback message */}
        <div
          className={`grid gap-1 grid-cols-[repeat(auto-fit,minmax(clamp(138px,15vw,155px),1fr))] ${
            isUploading ? 'opacity-50' : ''
          }`}
        >
          {filteredCards.length > 0 ? (
            filteredCards.map(card => <Card key={card.id} card={card} isInCollection={true} />)
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-700 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="flex flex-col items-center">
                  <FontAwesomeIcon
                    icon={faCloudUploadAlt}
                    className="w-12 h-12 mb-4 text-gray-500"
                  />
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
              <p className="text-sm text-gray-500 mt-4">
                Imported cards will use Blank placeholder images
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
