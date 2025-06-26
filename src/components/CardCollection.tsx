'use client';

import { useState, useMemo, useContext, useEffect } from 'react';
import { Card } from '@/components/Card';
import { useCardStore } from '@/store/cardStore';
import { CardType, CardTypeCategories } from '@/types/types';
import { useCardUpload } from '@/context/CardUploadContext';
import { uploadCardImage } from '@/utils/cardUpload';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ToastContext } from '@/components/Toast';
import { ChipSelector } from '@/components/ChipSelector';
import {
  faCloudUploadAlt,
  faFileImport,
  faTrash,
  faUndo,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { processCSVToCards } from '@/utils/csvProcessing';

export function CardCollection() {
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
      z-index: 10;
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
    setNewCardType,
    newCardSubtype,
    setNewCardSubtype,
    newBuildPointCost,
    setNewBuildPointCost,
    newCrewPointCost,
    setNewCrewPointCost,
    newNumberAllowed,
    setNewNumberAllowed,
    newSource,
    setNewSource,
  } = useCardUpload();
  const [isUploading, setIsUploading] = useState(false);
  // Filter states
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterCardTypes, setFilterCardTypes] = useState<string[]>([]);
  const [filterSubtypes, setFilterSubtypes] = useState<string[]>([]);
  const [filterMinCost, setFilterMinCost] = useState<number>(0);
  const [filterMaxCost, setFilterMaxCost] = useState<number>(8);
  const [costFilterEnabled, setCostFilterEnabled] = useState<boolean>(false);
  const [filterSources, setFilterSources] = useState<string[]>([]);

  const {
    collectionCards: cards,
    addToCollection: addCard,
    addToCollectionWithId,
    removeFromDeck,
    removeFromCollection,
    resetDeck,
    currentDeck,
    clearCollection,
    loadCollection,
    isLoading,
    bulkUpdateCollection,
  } = useCardStore();

  // Load the global card collection when component mounts
  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  // Get unique subtypes organized by their corresponding card type
  const subtypesByCardType = useMemo(() => {
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

    console.log('Total cards in collection:', cards.length);

    // Debug: print some card examples to see what's in the collection
    if (cards.length > 0) {
      console.log('Example card:', cards[0]);
    }

    // First pass: map each subtype to its card type
    cards.forEach(card => {
      if (card.subtype && card.subtype.trim() !== '' && card.type) {
        console.log(`Found subtype: ${card.subtype} for card type: ${card.type}`);
        // Map this subtype to its card type if not already mapped
        if (!subtypeToCardTypeMap[card.subtype]) {
          subtypeToCardTypeMap[card.subtype] = card.type;
        }
      }
    });

    console.log('Mapped subtypes:', subtypeToCardTypeMap);

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

    console.log('Final grouped subtypes:', result);

    return result;
  }, [cards]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    cards.forEach(card => {
      if (card.source && card.source.trim() !== '') {
        sources.add(card.source);
      }
    });
    return Array.from(sources).sort();
  }, [cards]); // Filter cards based on filter criteria
  const filteredCards = useMemo(() => {
    // Cards are already sorted at the store level, so we just need to filter
    return cards.filter(card => {
      // Filter by card type - if any card types are selected, the card must match one of them
      if (filterCardTypes.length > 0 && !filterCardTypes.includes(card.type)) {
        return false;
      }

      // Filter by subtype - if any subtypes are selected, the card must match one of them
      if (filterSubtypes.length > 0 && (!card.subtype || !filterSubtypes.includes(card.subtype))) {
        return false;
      }

      // Filter by cost range
      if (costFilterEnabled) {
        // Get the effective cost - the maximum of build and crew point costs
        const effectiveCost = Math.max(
          card.buildPointCost !== undefined ? card.buildPointCost : 0,
          card.crewPointCost !== undefined ? card.crewPointCost : 0
        );

        // Check if the cost is outside the selected range
        if (effectiveCost < filterMinCost || effectiveCost > filterMaxCost) {
          return false;
        }
      }

      // Filter by source - if any sources are selected, the card must match one of them
      if (filterSources.length > 0 && (!card.source || !filterSources.includes(card.source))) {
        return false;
      }

      return true;
    });
    // Note: No need to sort here as the cards collection is already sorted
  }, [
    cards,
    filterCardTypes,
    filterSubtypes,
    filterMinCost,
    filterMaxCost,
    costFilterEnabled,
    filterSources,
  ]);
  // Reset all filters
  const resetFilters = () => {
    setFilterCardTypes([]);
    setFilterSubtypes([]);
    setFilterMinCost(0);
    setFilterMaxCost(8);
    setCostFilterEnabled(false);
    setFilterSources([]);
  };

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
          const existingCard = cards.find(card => {
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
            await removeFromCollection(existingCard.id);
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

          // Add to collection
          await addCard(newCard);
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
        const csvContent = await csvContentPromise; // Process the CSV content using our utility
        const newCards = await processCSVToCards(csvContent, cards); // Check if we need to add the cards to existing collection or
        // create a completely new collection from CSV
        if (
          showToast &&
          confirm(
            'Do you want to replace the entire collection with these CSV cards?\n\nClick OK to replace all cards,\nCancel to add these to the existing collection'
          )
        ) {
          // Replace the entire collection - always generate new unique IDs
          const cardsWithUniqueIds = newCards.map(card => ({
            ...card,
            id: crypto.randomUUID(),
          }));
          await bulkUpdateCollection(cardsWithUniqueIds);
        } else {
          // Add each new card to the collection individually - the API will handle unique IDs
          for (const newCard of newCards) {
            // Create a new card object without the id property
            const { id, ...cardWithoutId } = newCard as any;
            await addCard(cardWithoutId);
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
      <style jsx>{rangeSliderStyle}</style>
      {/* Filter Controls */}{' '}
      <div className="px-2 mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              className="flex items-center text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              <FontAwesomeIcon
                icon={filterPanelOpen ? faUndo : faFilter}
                className="mr-2 h-3 w-3"
              />
              {filterPanelOpen ? 'Hide Filters' : 'Filter Cards'}
              {(filterCardTypes.length > 0 ||
                filterSubtypes.length > 0 ||
                costFilterEnabled ||
                filterSources.length > 0) && (
                <span className="ml-2 bg-blue-600 px-1.5 py-0.5 rounded-full text-xs">Active</span>
              )}
            </button>
          </div>

          <div className="flex items-center">
            {(filterCardTypes.length > 0 ||
              filterSubtypes.length > 0 ||
              costFilterEnabled ||
              filterSources.length > 0) && (
              <>
                <span className="text-xs text-gray-400 mr-2">
                  {filteredCards.length} of {cards.length} cards
                </span>
                <button onClick={resetFilters} className="text-xs text-gray-400 hover:text-white">
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {filterPanelOpen && (
          <div className="flex flex-col space-y-3 p-3 bg-gray-800 rounded border border-gray-700 mb-3">
            <p className="text-xs text-gray-400 mb-2">
              <span className="font-medium">Tip:</span> Click the filters to open dropdowns, select
              options, and click the × on chips to remove selections.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Card Type Filter - Chip Selector */}
              <div className="relative">
                <ChipSelector
                  label="Card Type"
                  selectedValues={filterCardTypes}
                  onChange={setFilterCardTypes}
                  options={[]} // This is required but not used when groupedOptions is provided
                  groupedOptions={{
                    'Build Point Cards': Object.entries(CardTypeCategories)
                      .filter(([_, category]) => category === 'BuildPoints')
                      .map(([type]) => ({ value: type, label: type })),
                    'Crew Point Cards': Object.entries(CardTypeCategories)
                      .filter(([_, category]) => category === 'CrewPoints')
                      .map(([type]) => ({ value: type, label: type })),
                  }}
                />
              </div>{' '}
              {/* Subtype Filter - Chip Selector */}
              <div className="relative">
                <ChipSelector
                  label="Subtype"
                  selectedValues={filterSubtypes}
                  onChange={setFilterSubtypes}
                  options={[]}
                  groupedOptions={
                    // Convert the subtypesByCardType object to the format expected by ChipSelector
                    Object.entries(subtypesByCardType).reduce(
                      (acc, [type, subtypes]) => {
                        // Skip card types with no subtypes
                        if (subtypes.length === 0) return acc;

                        // Add subtypes for this card type
                        acc[`${type} Subtypes`] = subtypes.map(subtype => ({
                          value: subtype,
                          label: subtype,
                        }));
                        return acc;
                      },
                      {} as Record<string, { value: string; label: string }[]>
                    )
                  }
                />
              </div>
              {/* Source Filter - Chip Selector */}
              <div className="relative">
                <ChipSelector
                  label="Source"
                  selectedValues={filterSources}
                  onChange={setFilterSources}
                  options={uniqueSources.map(source => ({
                    value: source,
                    label: source,
                  }))}
                />
              </div>
              {/* Cost Filter (Build or Crew Point Cost) - Dual Range Slider */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-sm">Cost Range (BP or CP)</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="cost-filter-enabled"
                      className="mr-2 h-4 w-4"
                      checked={costFilterEnabled}
                      onChange={e => setCostFilterEnabled(e.target.checked)}
                    />
                    <label htmlFor="cost-filter-enabled" className="text-sm text-gray-300">
                      {costFilterEnabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                </div>

                <div className={`mt-2 px-1 ${costFilterEnabled ? 'opacity-100' : 'opacity-50'}`}>
                  <div className="flex justify-between mb-1 text-xs text-gray-400">
                    <div className="flex items-center">
                      <span className="w-4 text-center">{filterMinCost}</span>
                      <span className="ml-1">BP/CP</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-4 text-center">{filterMaxCost}</span>
                      <span className="ml-1">BP/CP</span>
                    </div>
                  </div>

                  <div className="relative h-7">
                    {/* Min Cost Slider */}
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      value={filterMinCost}
                      onChange={e => {
                        const value = Number(e.target.value);
                        setFilterMinCost(Math.min(value, filterMaxCost));
                      }}
                      disabled={!costFilterEnabled}
                      className="absolute w-full bg-gray-700 h-2 rounded-lg appearance-none cursor-pointer"
                      id="min-cost-range"
                      aria-label="Minimum cost filter"
                      title="Minimum cost filter"
                    />

                    {/* Max Cost Slider */}
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      value={filterMaxCost}
                      onChange={e => {
                        const value = Number(e.target.value);
                        setFilterMaxCost(Math.max(value, filterMinCost));
                      }}
                      disabled={!costFilterEnabled}
                      className="absolute w-full bg-transparent h-2 rounded-lg appearance-none cursor-pointer"
                      id="max-cost-range"
                      aria-label="Maximum cost filter"
                      title="Maximum cost filter"
                    />
                  </div>

                  <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                    <span>Min</span>
                    <span>Max</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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
          {cards.length > 0 ? (
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
