'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDrop } from 'react-dnd';
import { Card } from '@/components/Card';
import { useCardStore } from '@/store/cardStore';
import type { Card as CardType } from '@/types/types';
import { CardArea, canCardTypeGoInArea } from '@/types/types';
import { VehicleName } from './VehicleName';
import { useToast } from './Toast';
import { useConfirmationDialog } from './useConfirmationDialog';
import { ArmorDisplay } from './ArmorDisplay';
import {
  useCardValidationErrors,
  validateAndAddCard,
  validateCardMovement,
  checkNumberAllowedWarning,
} from '@/utils/cardValidation';

// Re-export VehicleName for compatibility
export { VehicleName };

interface DeckLayoutProps {
  area?: CardArea | 'crew' | 'gear';
  showAlwaysDamageDeleteControls?: boolean;
  isFullScreen?: boolean;
}

export function DeckLayout({ area, showAlwaysDamageDeleteControls = false, isFullScreen = false }: DeckLayoutProps = {}) {
  const { currentDeck, addToDeck, canAddCardToDeck, updateCardArea, reorderCardInArea } =
    useCardStore();
  const [zoomedCard, setZoomedCard] = useState<CardType | null>(null);
  const [showZoom, setShowZoom] = useState(false);
  const { confirm, dialog: confirmationDialog } = useConfirmationDialog();

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

  if (!currentDeck) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No deck selected</p>
      </div>
    );
  }

  // Show the confirmation dialog
  const ConfirmationDialogPortal = () => {
    return typeof document !== 'undefined' ? createPortal(confirmationDialog, document.body) : null;
  }; // Helper function to create area drop targets
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
    // Helper to add multiple copies if needed, but only deduct cost once
    const addCopiesToDeckDnD = async (card: CardType, area: CardArea) => {
      const copiesToAdd = card.copies && card.copies > 1 ? card.copies : 1;
      let added = false;

      if (copiesToAdd > 0) {
        // First, check if the card can be added at all (before showing any warnings)
        // Use canAddCardToDeck directly to check if the card would pass validation
        const validationResult = canAddCardToDeck(card, area);

        if (!validationResult.allowed) {
          // If validation fails, handle the error and return early
          handleValidationError(validationResult, card.name, card.type, card.subtype);
          return false;
        }

        // Only after passing basic validation, check for numberAllowed warning
        const deckCards = currentDeck?.cards || [];
        const warning = checkNumberAllowedWarning(card, deckCards);

        // If adding would exceed the number allowed, show a confirmation dialog
        if (warning) {
          let message = `You already have ${warning.currentCount} copies of "${card.name}" on your vehicle, but you may only have ${warning.maxAllowed} physical copies of the card. Add anyway?`;

          // Enhanced message for crew cards to include subtype
          if (card.type === 'Crew' && card.subtype) {
            message = `You already have ${warning.currentCount} copies of "${card.name}" (${card.subtype}) on your vehicle, but you may only have ${warning.maxAllowed} physical copies of this card. Add anyway?`;
          }

          const confirmed = await confirm({
            title: 'Card Limit Warning',
            message,
            confirmText: 'Add Anyway',
            cancelText: 'Cancel',
          });

          if (!confirmed) {
            return false;
          }
        }

        // At this point validation has passed and warnings have been confirmed
        // Add the card to the deck
        addToDeck(card.id, area, true);
        showToast(`Added ${card.name} to your vehicle`, 'success');
        added = true;

        // Remaining copies: add directly, no cost/validation
        for (let i = 1; i < copiesToAdd; i++) {
          // Pass deductCost: false for extra copies
          addToDeck(card.id, area, false);
        }
      }
      return added;
    };
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
        drop: async (item: CardType & { source: 'collection' | 'deck' }) => {
          if (item.source === 'collection') {
            // Add all copies from collection to deck using the same logic as addCopiesToDeck
            const cardToAdd = collectionCards.find((c: CardType) => c.id === item.id);
            if (cardToAdd) {
              await addCopiesToDeckDnD(cardToAdd, area);
            }
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
      [area, collectionCards, currentDeck.cards] // <-- fix: wrap in a single array
    );

    // Card drop target for reordering within area
    const CardDropTarget = ({ card, children }: { card: CardType; children: React.ReactNode }) => {
      const [{ isOver, canDrop }, dropRef] = useDrop<
        CardType & { source: 'deck'; id: string },
        unknown,
        { isOver: boolean; canDrop: boolean }
      >(
        () => ({
          accept: 'CARD',
          canDrop: item => {
            // Only allow reordering if dragging from deck, same area, and not self
            return (
              item.source === 'deck' &&
              item.id !== card.id &&
              currentDeck.cards.find(c => c.id === item.id)?.area === card.area
            );
          },
          drop: item => {
            if (item.source === 'deck' && item.id !== card.id) {
              reorderCardInArea(item.id, card.id, card.area!);
            }
          },
          collect: monitor => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
          }),
        }),
        [card, currentDeck.cards] // <-- fix: wrap in a single array
      );
      return (
        <div
          ref={dropRef as unknown as React.LegacyRef<HTMLDivElement>}
          className={isOver && canDrop ? 'ring-2 ring-yellow-400' : ''}
        >
          {children}
        </div>
      );
    };

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
        <div className="absolute top-0 left-0 right-0 px-2 py-0.5 text-gray-300 text-sm font-medium opacity-70 pointer-events-auto text-center">
          <span>{label}</span>
          {/* Show armor display only for sides and when in fullscreen mode */}
          {isFullScreen && (area === CardArea.Front || area === CardArea.Back || area === CardArea.Left || area === CardArea.Right) && (
            <div className="absolute right-2 top-0">
              <ArmorDisplay side={area as 'front' | 'back' | 'left' | 'right'} />
            </div>
          )}
        </div>
        {/* Cards layout - special centering for Turret area */}
        <div
          className={`${area === CardArea.Turret ? 'flex justify-center items-center h-full' : 'flex flex-wrap gap-2'}`}
        >
          {areaCards.map(card => (
            <CardDropTarget key={card.id} card={card}>
              <Card
                card={card}
                isDraggable={true}
                isInCollection={false}
                onClickAction={() => handleCardClick(card)}
                showAlwaysDamageDeleteControls={showAlwaysDamageDeleteControls}
              />
            </CardDropTarget>
          ))}
          {/* Drop target for end of area (empty space) */}
          <div className="inline-block min-w-6 min-h-6">
            <DropEndTarget area={area} />
          </div>
        </div>
      </div>
    );
  };

  // Drop target for end of area (empty space)
  const DropEndTarget = ({ area }: { area: CardArea }) => {
    const [, dropRef] = useDrop<CardType & { source: 'deck'; id: string }, unknown, unknown>(
      () => ({
        accept: 'CARD',
        canDrop: item =>
          item.source === 'deck' && currentDeck.cards.find(c => c.id === item.id)?.area === area,
        drop: item => {
          reorderCardInArea(item.id, null, item.area); // Use the dragged card's area
        },
      }),
      [area, currentDeck.cards] // <-- fix: wrap in a single array
    );
    return <div ref={dropRef as unknown as React.LegacyRef<HTMLDivElement>} className="w-6 h-6" />;
  };

  // Helper function to render a single area (for mobile)
  if (area) {
    let areaEnum: CardArea | undefined = undefined;
    switch (area) {
      case 'crew':
        areaEnum = CardArea.Crew;
        break;
      case 'gearupgrade':
        areaEnum = CardArea.GearUpgrade;
        break;
      case 'front':
        areaEnum = CardArea.Front;
        break;
      case 'back':
        areaEnum = CardArea.Back;
        break;
      case 'left':
        areaEnum = CardArea.Left;
        break;
      case 'right':
        areaEnum = CardArea.Right;
        break;
      case 'turret':
        areaEnum = CardArea.Turret;
        break;
      default:
        areaEnum = undefined;
    }
    if (areaEnum) {
      return (
        <div className="h-full flex flex-col">
          {/* Only render the area drop target, no toggles or VehicleName/filter components in area view */}
          <AreaDropTarget
            area={areaEnum}
            label={
              areaEnum === CardArea.Crew
                ? 'Crew & Sidearms'
                : areaEnum === CardArea.GearUpgrade
                  ? 'Gear & Upgrades'
                  : areaEnum === CardArea.Front
                    ? 'Front Area'
                    : areaEnum === CardArea.Back
                      ? 'Back Area'
                      : areaEnum === CardArea.Left
                        ? 'Left Side'
                        : areaEnum === CardArea.Right
                          ? 'Right Side'
                          : areaEnum === CardArea.Turret
                            ? 'Turret'
                            : ''
            }
            className="flex-1"
          />
        </div>
      );
    }
  }

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
      <ConfirmationDialogPortal />
      <div
        id="deck-layout"
        className="h-full relative bg-cover bg-center bg-gray-900 rounded overflow-hidden"
      >
        {/* No direction indicators - using area labels instead */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-1">
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
                className="w-[90%] h-[90%] object-contain max-w-[90%] max-h-[90%]"
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
