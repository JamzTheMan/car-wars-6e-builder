'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDrop } from 'react-dnd';
import { Card } from '@/components/Card';
import { useCardStore } from '@/store/cardStore';
import type { Card as CardType, DeckLayout as DeckLayoutType } from '@/types/types';
import { CardArea, canCardTypeGoInArea } from '@/types/types';
import { VehicleName } from './VehicleName';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTrashAlt, faGear } from '@fortawesome/free-solid-svg-icons';
import { useToast } from './Toast';
import {
  useCardValidationErrors,
  validateAndAddCard,
  validateCardMovement,
} from '@/utils/cardValidation';
import { PrintButton } from './PrintButton';
import { saveVehicleToStorage, loadVehicleFromStorage } from '@/utils/userPreferences';

// Re-export VehicleName for compatibility
export { VehicleName };

export function DeckLayoutMenu() {
  const { currentDeck, updatePointLimits, collectionCards, addToCollection, setDeck } =
    useCardStore();
  const { showToast } = useToast();
  const exportInputRef = useRef<HTMLAnchorElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [buildPoints, setBuildPoints] = useState(currentDeck?.pointLimits.buildPoints ?? 0);
  const [crewPoints, setCrewPoints] = useState(currentDeck?.pointLimits.crewPoints ?? 0);
  const [division, setDivision] = useState<number | 'custom'>(
    currentDeck?.division === 'custom'
      ? 'custom'
      : currentDeck?.division
        ? parseInt(currentDeck.division)
        : Math.ceil((currentDeck?.pointLimits.crewPoints ?? 0) / 4)
  );
  const [isCustom, setIsCustom] = useState(currentDeck?.division === 'custom');

  useEffect(() => {
    if (currentDeck) {
      setBuildPoints(currentDeck.pointLimits.buildPoints);
      setCrewPoints(currentDeck.pointLimits.crewPoints);
      // Set division based on crew points (since division = crew points in AADA rules)
      const crewValue = currentDeck.pointLimits.crewPoints;
      if (crewValue > 12) {
        setDivision('custom');
        setIsCustom(true);
      } else {
        setDivision(crewValue > 0 ? crewValue : 1);
        setIsCustom(false);
      }
    }
  }, [currentDeck]);

  const handlePointsUpdate = () => {
    const newDivisionValue = isCustom ? 'custom' : crewPoints > 0 ? crewPoints : 1;
    updatePointLimits({ buildPoints, crewPoints });
    if (currentDeck) {
      setDeck({
        ...currentDeck,
        division:
          typeof newDivisionValue === 'number' ? String(newDivisionValue) : newDivisionValue,
      });
    }
    setDivision(newDivisionValue);
    setIsEditingPoints(false);
  };

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setDivision('custom');
      setIsCustom(true);
      if (currentDeck) {
        setDeck({
          ...currentDeck,
          division: 'custom',
        });
      }
    } else {
      const numValue = parseInt(value);
      setDivision(numValue);
      setIsCustom(false);
      setBuildPoints(numValue * 4);
      setCrewPoints(numValue);
      if (currentDeck) {
        setDeck({
          ...currentDeck,
          division: String(numValue), // Store as string to match type definition
        });
      }
    }
  };

  // Handle exporting deck to JSON file
  const handleExportDeck = async () => {
    if (!currentDeck) return;

    // Prepare the file name
    const divisionText = division === 'custom' ? 'Custom' : `Division ${division}`;
    const suggestedName = `${currentDeck.name || 'deck'} - ${divisionText}.json`;
    const deckData = JSON.stringify(currentDeck, null, 2);

    try {
      if ('showSaveFilePicker' in window) {
        // Modern browsers - Use File System Access API
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'JSON Files',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        });

        // Create a writable stream and write the file
        const writable = await fileHandle.createWritable();
        await writable.write(deckData);
        await writable.close();
      } else {
        // Legacy browsers - Use download attribute
        const blob = new Blob([deckData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        if (exportInputRef.current) {
          exportInputRef.current.href = url;
          exportInputRef.current.download = suggestedName;
          exportInputRef.current.click();
        }

        URL.revokeObjectURL(url);
      }

      showToast('Vehicle exported successfully!', 'success');
    } catch (err) {
      // Don't show error if user just cancelled the save dialog
      if (err.name !== 'AbortError') {
        console.error('Export error:', err);
        showToast('Failed to export vehicle', 'error');
      }
    }
  };
  // Validate imported deck structure
  const validateImportedDeck = (deck: any): deck is DeckLayoutType => {
    if (!deck || typeof deck !== 'object') return false;

    // Check required properties
    if (!deck.id || typeof deck.id !== 'string') return false;
    if (!deck.name || typeof deck.name !== 'string') return false;
    if (!deck.division || (typeof deck.division !== 'string' && typeof deck.division !== 'number'))
      return false;
    if (typeof deck.backgroundImage !== 'string') return false;
    if (!Array.isArray(deck.cards)) return false;
    if (!deck.pointLimits || typeof deck.pointLimits !== 'object') return false;
    if (!deck.pointsUsed || typeof deck.pointsUsed !== 'object') return false;

    // Validate point limits
    if (
      typeof deck.pointLimits.buildPoints !== 'number' ||
      typeof deck.pointLimits.crewPoints !== 'number'
    )
      return false;

    // Validate points used
    if (
      typeof deck.pointsUsed.buildPoints !== 'number' ||
      typeof deck.pointsUsed.crewPoints !== 'number'
    )
      return false;

    // Validate division value
    if (
      deck.division !== 'custom' &&
      typeof deck.division === 'number' &&
      (deck.division < 1 || deck.division > 12)
    ) {
      return false;
    }

    // Validate each card
    return deck.cards.every((card: any) => {
      return (
        card.id &&
        typeof card.id === 'string' &&
        card.name &&
        typeof card.name === 'string' &&
        typeof card.imageUrl === 'string' &&
        typeof card.type === 'string' &&
        ['Weapon', 'Upgrade', 'Accessory', 'Structure', 'Crew', 'Gear', 'Sidearm'].includes(
          card.type
        ) &&
        typeof card.subtype === 'string' &&
        typeof card.buildPointCost === 'number' &&
        typeof card.crewPointCost === 'number' &&
        typeof card.numberAllowed === 'number' &&
        typeof card.source === 'string' &&
        (!card.area || Object.values(CardArea).includes(card.area))
      );
    });
  };

  // Handle importing deck from JSON file
  const handleImportDeck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const content = e.target?.result as string;
        const importedDeck = JSON.parse(content);

        console.log('Attempting to import vehicle:', importedDeck);

        // Validate the imported deck structure
        if (!validateImportedDeck(importedDeck)) {
          // Log specific validation failures
          console.error('Validation failures:');
          if (!importedDeck || typeof importedDeck !== 'object') console.error('- Not an object');
          if (!importedDeck.id || typeof importedDeck.id !== 'string')
            console.error('- Invalid id');
          if (!importedDeck.name || typeof importedDeck.name !== 'string')
            console.error('- Invalid name');
          if (typeof importedDeck.backgroundImage !== 'string')
            console.error('- Invalid backgroundImage');
          if (!Array.isArray(importedDeck.cards)) console.error('- Cards is not an array');
          if (!importedDeck.pointLimits || typeof importedDeck.pointLimits !== 'object')
            console.error('- Invalid pointLimits');
          if (!importedDeck.pointsUsed || typeof importedDeck.pointsUsed !== 'object')
            console.error('- Invalid pointsUsed');

          if (Array.isArray(importedDeck.cards)) {
            importedDeck.cards.forEach((card: any, index: number) => {
              if (!card.id || typeof card.id !== 'string')
                console.error(`- Card ${index} has invalid id`);
              if (!card.name || typeof card.name !== 'string')
                console.error(`- Card ${index} has invalid name`);
              if (typeof card.imageUrl !== 'string')
                console.error(`- Card ${index} has invalid imageUrl`);
              if (
                !card.type ||
                ![
                  'Weapon',
                  'Upgrade',
                  'Accessory',
                  'Structure',
                  'Crew',
                  'Gear',
                  'Sidearm',
                ].includes(card.type)
              )
                console.error(`- Card ${index} (${card.name}) has invalid type: ${card.type}`);
              if (typeof card.subtype !== 'string')
                console.error(`- Card ${index} has invalid subtype`);
            });
          }

          throw new Error(
            'Invalid vehicle: The imported file is missing required properties or has invalid data.'
          );
        }

        // Ask for confirmation before overwriting
        if (
          !confirm('This will overwrite your current vehicle. Are you sure you want to continue?')
        ) {
          return;
        }

        // Ensure all cards in the imported deck have unique IDs to prevent React key conflicts
        const importedDeckWithUniqueCardIds = {
          ...importedDeck,
          cards: importedDeck.cards.map(card => ({
            ...card,
            id: `${card.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          })),
        };

        // Set the imported deck with unique card IDs
        setDeck(importedDeckWithUniqueCardIds as typeof importedDeck);
        setBuildPoints(importedDeck.pointLimits.buildPoints);
        setCrewPoints(importedDeck.pointLimits.crewPoints);

        // Update division based on crew points
        const crewValue = importedDeck.pointLimits.crewPoints;
        if (crewValue > 12) {
          setDivision('custom');
          setIsCustom(true);
        } else {
          setDivision(crewValue > 0 ? crewValue : 1);
          setIsCustom(false);
        }

        showToast('Vehicle imported successfully!', 'success');
      } catch (error) {
        console.error('Import error:', error);
        showToast(
          `Failed to import vehicle: ${error instanceof Error ? error.message : 'Invalid file format'}`,
          'error'
        );
      }
    };

    reader.readAsText(file);
    // Clear the input so the same file can be imported again if needed
    e.target.value = '';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Print button */}
        <PrintButton />

        <button
          className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-200"
          onClick={() => setIsEditingPoints(!isEditingPoints)}
          aria-label="Edit build and crew points"
          title="Edit build and crew points"
        >
          <FontAwesomeIcon icon={faGear} className="h-5 w-5" />
        </button>
      </div>
      {/* Hidden elements for import/export */}
      <a ref={exportInputRef} className="hidden" />{' '}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        onChange={handleImportDeck}
        className="hidden"
        aria-label="Import vehicle from JSON file"
        title="Import vehicle from JSON file"
      />
      {isEditingPoints && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <h3 className="font-medium">Build & Crew Points</h3>
              <button
                onClick={() => setIsEditingPoints(false)}
                className="text-gray-400 hover:text-gray-200"
                aria-label="Close build and crew points editor"
                title="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">AADA Division</label>
              <select
                value={division}
                onChange={handleDivisionChange}
                className="w-full bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-1.5 text-sm"
                aria-label="AADA Division"
                title="AADA Division"
              >
                {[...Array(12).keys()].map(i => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
              <p className="text-gray-400 text-xs mt-1 italic">
                Sets Crew Points & Armor to Division, and Build Points to 4 x Division.
              </p>
            </div>
            {/* Build Points */}
            <div>
              <label className="block text-sm font-medium mb-1">Custom Build Points</label>
              <input
                type="number"
                min="0"
                value={buildPoints}
                onChange={e => {
                  const value = Math.max(0, parseInt(e.target.value) || 0);
                  setBuildPoints(value);
                }}
                className="w-full bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-1.5 text-sm"
                disabled={!isCustom}
                title="Custom Build Points"
                placeholder="Enter build points"
              />
            </div>
            {/* Crew Points */}
            <div>
              <label className="block text-sm font-medium mb-1">Custom Crew Points</label>
              <input
                type="number"
                min="0"
                value={crewPoints}
                onChange={e => {
                  const value = Math.max(0, parseInt(e.target.value) || 0);
                  setCrewPoints(value);
                }}
                className="w-full bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-1.5 text-sm"
                disabled={!isCustom}
                title="Custom Crew Points"
                placeholder="Enter crew points"
              />
            </div>
            {/* Save Changes Button */}
            <button
              onClick={handlePointsUpdate}
              className="w-full bg-green-700 hover:bg-green-900 text-white px-4 py-2 rounded text-sm"
            >
              <FontAwesomeIcon icon={faSave} className="mr-2" /> Save Build Points
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to reset the car? This will remove all cards and reset point costs to zero.'
                  )
                ) {
                  useCardStore.getState().resetDeck();
                }
              }}
              className="w-full bg-red-700 hover:bg-red-900 text-white px-4 py-2 rounded text-sm"
            >
              <FontAwesomeIcon icon={faTrashAlt} className="mr-2" /> Reset Car
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeckLayout() {
  const { currentDeck, updateCardPosition, addToDeck, canAddCardToDeck, updateCardArea } =
    useCardStore();
  const [zoomedCard, setZoomedCard] = useState<CardType | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Escape key to close zoom
  useEffect(() => {
    if (!showZoom) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowZoom(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showZoom]);

  // Helper to open zoom
  const handleCardClick = useCallback((card: CardType) => {
    setZoomedCard(card);
    setShowZoom(true);
  }, []);

  // Helper to close zoom
  const closeZoom = useCallback(() => {
    setShowZoom(false);
    setTimeout(() => setZoomedCard(null), 200); // match animation duration
  }, []);

  // Add the handler in DeckLayout
  const handleCardHover = useCallback((card: CardType) => {
    setZoomedCard(card);
    setShowZoom(true);
  }, []);

  if (!currentDeck) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No deck selected</p>
      </div>
    );
  } // Helper function to create area drop targets
  const AreaDropTarget = ({
    area,
    label,
    className,
  }: {
    area: CardArea;
    label: string;
    className: string;
  }) => {
    // Determine background color based on area type
    const getAreaColor = () => {
      switch (area) {
        case CardArea.Crew:
          return 'bg-blue-900 bg-opacity-20';
        case CardArea.GearUpgrade:
          return 'bg-purple-950 bg-opacity-20';
        case CardArea.Front:
        case CardArea.Back:
        case CardArea.Left:
        case CardArea.Right:
          return 'bg-red-900 bg-opacity-20';
        default:
          return '';
      }
    };
    const { collectionCards } = useCardStore();
    const { showToast } = useToast();
    const { handleValidationError } = useCardValidationErrors();
    const [{ isOver }, dropRef] = useDrop<
      CardType & { source: 'collection' | 'deck'; id: string },
      unknown,
      { isOver: boolean }
    >(
      () => ({
        accept: 'CARD',
        canDrop: (item: CardType & { source: 'collection' | 'deck'; id: string }) => {
          // Check if the card type can go in this area
          const cardToCheck =
            item.source === 'collection'
              ? collectionCards.find((c: CardType) => c.id === item.id)
              : currentDeck.cards.find((c: CardType) => c.id === item.id);

          return cardToCheck ? canCardTypeGoInArea(cardToCheck.type, area) : false;
        },
        drop: (item: CardType & { source: 'collection' | 'deck' }) => {
          if (item.source === 'collection') {
            // Add from collection to specific area using the centralized function
            validateAndAddCard(
              item,
              { canAddCardToDeck, addToDeck },
              area,
              showToast,
              handleValidationError
            );
          } else if (item.source === 'deck') {
            // Use the centralized validation function for card movements
            const canMove = validateCardMovement(item, area, currentDeck.cards, showToast);

            if (!canMove) {
              return;
            }

            // Move card between areas
            updateCardArea(item.id, area);
            showToast(`Moved ${item.name} to the ${area} area`, 'info');
          }
        },
        collect: (monitor: any) => ({
          isOver: !!monitor.isOver(),
        }),
      }),
      [area]
    );

    // Get all cards for this area
    const areaCards = currentDeck.cards.filter(card => card.area === area);

    return (
      <div
        ref={dropRef as unknown as React.LegacyRef<HTMLDivElement>}
        className={`${className} ${getAreaColor()} rounded-md overflow-y-auto p-3 border-2 relative
          ${isOver ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600 hover:border-gray-500'} 
          transition-all duration-200 ${area !== CardArea.Turret ? 'backdrop-blur-sm' : ''} pt-6`}
      >
        {/* Area label as an overlay that doesn't take up space */}
        <div className="absolute top-0 left-0 right-0 text-gray-300 text-sm font-medium text-center opacity-70 pointer-events-none">
          {label}
        </div>{' '}
        {/* Cards layout - special centering for Turret area */}
        <div
          className={`${area === CardArea.Turret ? 'flex justify-center items-center h-full' : 'flex flex-wrap gap-2'}`}
        >
          {areaCards.map(card => (
            <Card
              key={card.id}
              card={card}
              isDraggable={true}
              isInCollection={false}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full relative">
      {/* Card Zoom Modal Overlay */}
      {zoomedCard &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 transition-opacity duration-200 ${
              showZoom ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeZoom}
          >
            <div
              className={`relative max-w-[90vw] max-h-[90vh] p-4 bg-transparent flex items-center justify-center transition-transform duration-200 ${
                showZoom ? 'scale-75' : 'scale-90'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 z-10"
                onClick={closeZoom}
                aria-label="Close zoomed card"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <Card card={zoomedCard} isDraggable={false} isInCollection={false} zoomed />
            </div>
          </div>,
          typeof window !== 'undefined' ? document.body : (null as any)
        )}
      <div
        id="deck-layout"
        className="h-full relative bg-cover bg-center bg-gray-900 rounded overflow-hidden"
        style={{
          backgroundImage: currentDeck.backgroundImage
            ? `url(${currentDeck.backgroundImage})`
            : `url(public/assets/default_background.webp)`,
        }}
      >
        {' '}
        {/* No direction indicators - using area labels instead */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1">
          {' '}
          {/* Top row */}
          <AreaDropTarget area={CardArea.Crew} label="Crew & Sidearms" className="h-full" />
          <AreaDropTarget area={CardArea.Front} label="Front Area" className="h-full" />
          <AreaDropTarget area={CardArea.GearUpgrade} label="Gear & Upgrades" className="h-full" />
          {/* Middle and bottom rows - full height columns for Left and Right */}
          <AreaDropTarget area={CardArea.Left} label="Left Side" className="row-span-2 h-full" />
          {/* Center row is for the turret location */}
          <div className="row-span-1 relative">
            <div className="absolute inset-0 bg-red-950 bg-opacity-60 rounded"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="/assets/car_with_logo.webp"
                alt="Car with Logo"
                className="w-[90%] h-[90%] object-contain"
                style={{ maxWidth: '90%', maxHeight: '90%' }}
              />
            </div>
            <AreaDropTarget area={CardArea.Turret} label="Turret" className="h-full z-10" />
          </div>
          <AreaDropTarget area={CardArea.Right} label="Right Side" className="row-span-2 h-full" />
          {/* Bottom center has the Back area */}
          <AreaDropTarget area={CardArea.Back} label="Back Area" className="h-full" />
        </div>
      </div>
    </div>
  );
}
