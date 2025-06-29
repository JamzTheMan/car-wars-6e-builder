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
    let areaCards = currentDeck.cards.filter(card => card.area === area);

    // Custom sort for Crew & Sidearms area
    if (area === CardArea.Crew) {
      areaCards = [...areaCards].sort((a, b) => {
        // Driver first
        if (a.type === 'Crew' && a.subtype?.toLowerCase() === 'driver') return -1;
        if (b.type === 'Crew' && b.subtype?.toLowerCase() === 'driver') return 1;
        // Gunner second
        if (a.type === 'Crew' && a.subtype?.toLowerCase() === 'gunner') return -1;
        if (b.type === 'Crew' && b.subtype?.toLowerCase() === 'gunner') return 1;
        // Hand Cannon third
        if (a.type === 'Sidearm' && a.name === 'Hand Cannon') return -1;
        if (b.type === 'Sidearm' && b.name === 'Hand Cannon') return 1;
        // Other sidearms alphabetically
        if (a.type === 'Sidearm' && b.type === 'Sidearm') {
          return a.name.localeCompare(b.name);
        }
        // Crew before sidearms
        if (a.type === 'Crew' && b.type === 'Sidearm') return -1;
        if (a.type === 'Sidearm' && b.type === 'Crew') return 1;
        // Otherwise, keep order
        return 0;
      });
    }

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
