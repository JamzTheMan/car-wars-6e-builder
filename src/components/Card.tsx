'use client';

import { useToast } from './Toast';
import { useCardStore } from '@/store/cardStore';
import { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import {
  canCardTypeGoInArea,
  Card as CardType,
  CardArea,
  CardType as CardTypeEnum,
} from '@/types/types';
import {
  useCardValidationErrors,
  validateAndAddCard,
  checkNumberAllowedWarning,
} from '@/utils/cardValidation';
import { deleteCardImage } from '@/utils/cardDelete';
import { useConfirmationDialog } from './useConfirmationDialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCaretDown,
  faCaretLeft,
  faCaretRight,
  faCaretUp,
  faClone,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

// Extended type for dragging with source information
interface DragItem extends CardType {
  source: 'collection' | 'deck';
}

interface CardProps {
  card: CardType;
  isDraggable?: boolean;
  isInCollection?: boolean;
  isDebug?: boolean;
  onClick?: () => void;
  zoomed?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

// Function to check if a card can be placed on car sides
function canBePlacedOnSides(cardType: CardTypeEnum): boolean {
  return cardType === 'Weapon' || cardType === 'Accessory' || cardType === 'Structure';
}

// Function to check if a card can be placed in turret (has 't' in sides field)
function canBePlacedInTurret(card: CardType): boolean {
  return card.type === 'Weapon' && card.sides && card.sides.toLowerCase().includes('t');
}

// Function to determine if the card should show side buttons or just a simple "Add to Deck" button
export function Card({
  card,
  isDraggable = true,
  isInCollection = true,
  isDebug = false,
  onClick,
  zoomed = false,
  onMouseEnter,
  onMouseLeave,
}: CardProps) {
  const {
    removeFromCollection,
    removeFromDeck,
    addToDeck,
    canAddCardToDeck,
    canRemoveFromDeck,
    currentDeck,
  } = useCardStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showQuickAdd] = useState(false);
  const [associatedCard, setAssociatedCard] = useState<CardType | null>(null);
  const [showingAssociatedCard, setShowingAssociatedCard] = useState(false);
  const { showToast } = useToast();
  const { handleValidationError } = useCardValidationErrors();
  const { confirm, dialog: confirmationDialog } = useConfirmationDialog();

  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>({
    type: 'CARD',
    item: { ...card, source: isInCollection ? 'collection' : 'deck' },
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging(),
    }),
    // No dependency array needed; React DnD will update on item changes
  });

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isInCollection) {
      // When in collection, ask for confirmation as it will remove all instances from the deck too
      const confirmed = await confirm({
        message: `Are you sure you want to delete the card "${card.name}"? This will also remove any instances from your deck.`,
      });

      if (confirmed) {
        console.log('Deleting card from collection:', card);
        try {
          // First delete the physical image file
          console.log('Deleting image file:', card.imageUrl);
          const success = await deleteCardImage(card.imageUrl);

          if (!success) {
            console.error('Failed to delete image file:', card.imageUrl);
            alert(
              'Failed to delete the image file, but the card will be removed from your collection.'
            );
          } else {
            console.log('Image file deleted successfully');
          }

          // Then remove from collection state
          console.log('Removing card from collection state:', card.id);
          removeFromCollection(card.id);
        } catch (error) {
          console.error('Error during card deletion:', error);
          alert('An error occurred while deleting the card.');
        }
      }
    } else {
      // Check if the card can be removed (no dependent cards)
      const validationResult = canRemoveFromDeck(card.id);

      if (
        !validationResult.allowed &&
        validationResult.reason === 'has_dependent_cards' &&
        validationResult.conflictingCard
      ) {
        showToast(
          `Cannot remove ${card.name} because ${validationResult.conflictingCard.name} depends on it. Remove ${validationResult.conflictingCard.name} first.`,
          'error'
        );
        return;
      }

      // Remove x copies if card.copies > 1, otherwise just one
      const copiesToRemove = card.copies && card.copies > 1 ? card.copies : 1;
      removeFromDeck(card.id, copiesToRemove);
    }
  };

  // Helper to add multiple copies if needed, but only deduct cost once
  const addCopiesToDeck = async (area?: CardArea) => {
    const copiesToAdd = card.copies && card.copies > 1 ? card.copies : 1;
    let added = false;

    if (copiesToAdd > 0) {
      // Check for numberAllowed warning first
      const deckCards = currentDeck?.cards || [];
      const warning = checkNumberAllowedWarning(card, deckCards);

      // If adding would exceed the number allowed, show a confirmation dialog
      if (warning) {
        const confirmed = await confirm({
          title: 'Card Limit Warning',
          message: `You already have ${warning.currentCount} copies of "${card.name}" on your vehicle, but you may only have ${warning.maxAllowed} physical copies of the card. Add anyway?`,
          confirmText: 'Add Anyway',
          cancelText: 'Cancel',
        });

        if (!confirmed) {
          return false;
        }
      }

      // First copy: validate and deduct cost
      const cardAdded = await validateAndAddCard(
        card,
        { canAddCardToDeck, addToDeck },
        area,
        showToast,
        handleValidationError
      );

      if (cardAdded) {
        added = true;

        // Remaining copies: add directly, no cost/validation
        for (let i = 1; i < copiesToAdd; i++) {
          // Pass deductCost: false for extra copies
          addToDeck(card.id, area, false);
        }
      }
    }
    return added;
  };

  const handleAddToDeck = async (e: React.MouseEvent, area?: CardArea) => {
    e.stopPropagation();
    const added = await addCopiesToDeck(area);
    if (added) {
      setIsPreviewOpen(false); // Close the preview after adding
    }
  };

  const handleQuickAdd = async (area: CardArea) => {
    await addCopiesToDeck(area);
  };
  const openPreview = () => {
    if (!isDragging && !isPreviewOpen) {
      setIsPreviewOpen(true);

      // If the card has an associated field, try to find that card's image
      if (card.associated && card.associated.trim() !== '') {
        fetchAssociatedCard(card.associated);
      } else {
        setAssociatedCard(null);
      }
    }
  };

  // Function to fetch associated card image
  const fetchAssociatedCard = async (associatedCardName: string) => {
    try {
      const response = await fetch('/api/check-card-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardName: card.name, // Original card name for context
          associatedName: associatedCardName, // The associated card we're looking for
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.exists) {
          // Create a simplified card object for the associated card
          setAssociatedCard({
            id: `associated-${Date.now()}`,
            name: associatedCardName,
            imageUrl: result.imageUrl,
            type: CardTypeEnum.Accessory, // Default type, doesn't matter for display only
            subtype: '',
            buildPointCost: 0,
            crewPointCost: 0,
            numberAllowed: 0,
            source: '',
            copies: 1,
            exclusive: false,
            sides: '',
          });
        } else {
          setAssociatedCard(null);
        }
      }
    } catch (error) {
      console.error('Error fetching associated card:', error);
      setAssociatedCard(null);
    }
  };

  const closePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewOpen(false);
    setAssociatedCard(null);
    setShowingAssociatedCard(false);
  };
  const swapCards = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowingAssociatedCard(!showingAssociatedCard);
  };

  // Function to get available areas for a card based on its type
  const getAvailableAreas = (cardType: CardTypeEnum): CardArea[] => {
    const allAreas = Object.values(CardArea);
    return allAreas.filter(area => canCardTypeGoInArea(cardType, area));
  };

  // Function to check if the areas include vehicle locations
  const hasVehicleLocations = (areas: CardArea[]): boolean => {
    const vehicleLocations = [CardArea.Front, CardArea.Back, CardArea.Left, CardArea.Right];
    return areas.some(area => vehicleLocations.includes(area)) && areas.length > 1;
  };
  // Function to determine button layout and size
  const getButtonClasses = (areas: CardArea[]): string => {
    // Common button styles
    const baseClasses = 'bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded';

    // If we have multiple vehicle locations, make them a more appropriate width
    if (hasVehicleLocations(areas)) {
      return `${baseClasses} w-auto`;
    }

    return baseClasses;
  };

  return (
    <>
      {confirmationDialog}
      <div
        ref={node => {
          if (dragRef) {
            dragRef(node);
          }
        }}
        className={`relative w-39 rounded-lg shadow-lg overflow-hidden transition-transform ${
          isDragging ? 'opacity-50' : ''
        } ${isDraggable && !isPreviewOpen ? 'cursor-move' : 'cursor-default'} group ${
          card.position ? 'card-positioned' : ''
        } ${zoomed ? 'z-[100] scale-400 shadow-2xl border-4 border-yellow-400 transition-transform duration-200' : ''}`}
        data-card-type={card.type}
        data-x={card.position?.x ?? undefined}
        data-y={card.position?.y ?? undefined}
        onClick={
          onClick
            ? e => {
                e.stopPropagation();
                onClick();
              }
            : openPreview
        }
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={zoomed ? { pointerEvents: 'auto' } : {}}
      >
        {/* For regular side-placement cards */}
        {isInCollection &&
          canBePlacedOnSides(card.type) &&
          (!canBePlacedInTurret(card) || card.sides.length > 1) && (
            <div className={`quick-add-overlay z-20 ${showQuickAdd ? 'opacity-100' : 'opacity-0'}`}>
              <div className="quick-add-container">
                {/* Only show buttons for valid placement options, default to FLRB if sides is empty */}
                {(() => {
                  const sides =
                    card.sides && card.sides.trim() !== '' ? card.sides.toUpperCase() : 'FLRB';
                  return (
                    <>
                      {sides.includes('F') && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAdd(CardArea.Front);
                          }}
                          className="quick-add-button front"
                          title="Add to Front"
                        >
                          <FontAwesomeIcon icon={faCaretUp} className="quick-add-icon" />
                        </button>
                      )}
                      {sides.includes('L') && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAdd(CardArea.Left);
                          }}
                          className="quick-add-button left"
                          title="Add to Left"
                        >
                          <FontAwesomeIcon icon={faCaretLeft} className="quick-add-icon" />
                        </button>
                      )}
                      {sides.includes('R') && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAdd(CardArea.Right);
                          }}
                          className="quick-add-button right"
                          title="Add to Right"
                        >
                          <FontAwesomeIcon icon={faCaretRight} className="quick-add-icon" />
                        </button>
                      )}
                      {sides.includes('B') && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAdd(CardArea.Back);
                          }}
                          className="quick-add-button rear"
                          title="Add to Rear"
                        >
                          <FontAwesomeIcon icon={faCaretDown} className="quick-add-icon" />
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        {/* Cost badge: only show when using placeholder image */}
        {(!card.imageUrl || card.imageUrl.includes('Blank_')) &&
          (['Sidearm', 'Crew', 'Gear'].includes(card.type) ? (
            <div className="card-cost-badge card-cost-badge-crew">
              {(() => {
                return (card.buildPointCost ?? 0) + (card.crewPointCost ?? 0);
              })()}
            </div>
          ) : (
            <div className="card-cost-badge card-cost-badge-other">
              {(() => {
                const cost = (card.buildPointCost ?? 0) + (card.crewPointCost ?? 0);
                return cost;
              })()}
            </div>
          ))}
        <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
        {/* Card name at the top, only if using a placeholder or no image */}
        {(!card.imageUrl || card.imageUrl.includes('Blank_')) &&
          (['Sidearm', 'Crew', 'Gear'].includes(card.type) ? (
            <div className="card-title card-title-crew">
              <span>{card.name}</span>
            </div>
          ) : (
            <div className="card-title card-title-other">
              <span>{card.name}</span>
            </div>
          ))}
        {/* Card type and subtype at the bottom, only if using a placeholder or no image */}
        {(!card.imageUrl || card.imageUrl.includes('Blank_')) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-90 text-gray-100 p-2">
            <div className="text-xs text-gray-300">
              {card.type} {card.subtype ? `- ${card.subtype}` : ''}
            </div>
          </div>
        )}
        {/* Delete button only visible on hover, always bottom right */}
        {(!isInCollection || isDebug) && (
          <button
            onClick={handleDelete}
            className="absolute bottom-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded p-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            title={isInCollection ? 'Delete card from collection' : 'Remove card from deck'}
          >
            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          </button>
        )}{' '}
        {/* Add to Deck button for cards that don't have side placement options */}
        {isInCollection && !canBePlacedOnSides(card.type) && (
          <button onClick={handleAddToDeck} className="card-add-button" title="Add to deck">
            <FontAwesomeIcon icon={faClone} className="w-6 h-6" />
          </button>
        )}
        {/* Add to Turret button for turret-only cards */}
        {isInCollection &&
          canBePlacedInTurret(card) &&
          (!card.sides || card.sides.length === 1) && (
            <button
              onClick={e => {
                e.stopPropagation();
                handleQuickAdd(CardArea.Turret);
              }}
              className="card-add-button"
              title="Add to turret"
            >
              <FontAwesomeIcon icon={faClone} className="w-6 h-6" />
            </button>
          )}
      </div>{' '}
      {/* Card Preview Modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white bg-opacity-85 rounded-lg overflow-hidden shadow-2xl max-w-3xl max-h-[90vh] overflow-y-auto relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                {showingAssociatedCard && associatedCard ? associatedCard.name : card.name}
              </h3>
              <button
                onClick={closePreview}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close preview"
              >
                <FontAwesomeIcon icon={faXmark} className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Card Display Area */}
                <div className="w-full md:w-1/2 flex-shrink-0 relative">
                  {/* Without Associated Card - Standard Display */}
                  {!associatedCard && (
                    <div className="flex items-center justify-center">
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-auto object-contain max-h-[77vh] rounded-md shadow-md"
                      />
                    </div>
                  )}

                  {/* With Associated Card - Stacked Card Display */}
                  {associatedCard && (
                    <div className="card-stack-container">
                      {/* Main Card - Positioned absolutely to allow proper stacking */}
                      <div
                        onClick={swapCards}
                        className={`card-stack absolute cursor-pointer ${
                          !showingAssociatedCard
                            ? 'z-20 top-0 left-0 right-0'
                            : 'z-10 top-0 left-0 rotate-3'
                        }`}
                      >
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className={`w-full h-auto object-contain max-h-[77vh] rounded-lg shadow-lg ${
                            showingAssociatedCard ? 'opacity-80' : 'opacity-100'
                          }`}
                        />
                      </div>

                      {/* Associated Card */}
                      <div
                        onClick={swapCards}
                        className={`card-stack absolute cursor-pointer ${
                          showingAssociatedCard
                            ? 'z-20 top-0 -left-[50%] right-0'
                            : 'z-10 -left-[48%] rotate-3'
                        }`}
                      >
                        <img
                          src={associatedCard.imageUrl}
                          alt={associatedCard.name}
                          className={`w-full h-auto object-contain max-h-[77vh] rounded-lg shadow-lg ${
                            !showingAssociatedCard ? 'opacity-90' : 'opacity-100'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Details Area */}
                <div className="w-full md:w-1/2 flex-shrink-0">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1 text-gray-700">Details:</h4>
                    {showingAssociatedCard && associatedCard ? (
                      // Associated Card Details
                      <>
                        <p className="text-gray-600">
                          <span className="font-medium">Type:</span> {associatedCard.type}
                        </p>
                        {associatedCard.subtype && (
                          <p className="text-gray-600">
                            <span className="font-medium">Subtype:</span> {associatedCard.subtype}
                          </p>
                        )}
                        <p className="text-gray-600">
                          <span className="font-medium">Cost:</span>{' '}
                          {(associatedCard.buildPointCost ?? 0) +
                            (associatedCard.crewPointCost ?? 0)}{' '}
                          points
                        </p>
                        {/* Description for associated card if available */}
                        {associatedCard.description && (
                          <div className="mt-4">
                            <h4 className="text-lg font-semibold mb-1 text-gray-700">
                              Description:
                            </h4>
                            <p className="text-gray-600">{associatedCard.description}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      // Main Card Details
                      <>
                        <p className="text-gray-600">
                          <span className="font-medium">Type:</span> {card.type}
                        </p>
                        {card.subtype && (
                          <p className="text-gray-600">
                            <span className="font-medium">Subtype:</span> {card.subtype}
                          </p>
                        )}
                        <p className="text-gray-600">
                          <span className="font-medium">Cost:</span>{' '}
                          {(card.buildPointCost ?? 0) + (card.crewPointCost ?? 0)} points
                        </p>
                        {/* Display copies information if greater than 1 */}
                        {card.copies && card.copies > 1 && (
                          <p className="text-gray-600">
                            <span className="font-medium">Copies per purchase:</span> {card.copies}
                          </p>
                        )}
                        {/* Display exclusive status if true */}
                        {card.exclusive && (
                          <p className="text-gray-600">
                            <span className="font-medium">Exclusive:</span> Yes
                          </p>
                        )}
                        {/* Description for main card if available */}
                        {card.description && (
                          <div className="mt-4">
                            <h4 className="text-lg font-semibold mb-1 text-gray-700">
                              Description:
                            </h4>
                            <p className="text-gray-600">{card.description}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {isInCollection && (
                    <div className="mt-4">
                      <h4 className="text-lg font-semibold mb-2 text-gray-700">Add to Car:</h4>
                      {(() => {
                        // Get the available areas based on card type
                        const availableAreas = getAvailableAreas(card.type);

                        // For cards that can be placed on sides (weapons, accessories, structures)
                        // filter by the specified sides
                        if (canBePlacedOnSides(card.type)) {
                          const sides =
                            card.sides && card.sides.trim() !== ''
                              ? card.sides.toUpperCase()
                              : 'FLRB';
                          const areaMap: { [key: string]: CardArea } = {
                            F: CardArea.Front,
                            L: CardArea.Left,
                            R: CardArea.Right,
                            B: CardArea.Back,
                            T: CardArea.Turret,
                          };
                          const validSideAreas = Object.entries(areaMap)
                            .filter(([side]) => sides.includes(side))
                            .map(([, area]) => area);

                          if (validSideAreas.length > 0) {
                            // If we have valid sides, show those
                            return (
                              <div className="flex flex-col gap-2">
                                {validSideAreas.map(area => (
                                  <button
                                    key={area}
                                    onClick={e => handleAddToDeck(e, area)}
                                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 w-auto inline-flex max-w-[180px]"
                                  >
                                    <FontAwesomeIcon icon={faClone} />
                                    {area.charAt(0).toUpperCase() + area.slice(1)}
                                  </button>
                                ))}
                              </div>
                            );
                          }
                        }

                        // For crew, sidearms, gear, and upgrades - show the appropriate area buttons
                        return (
                          <div className="flex flex-col gap-2">
                            {availableAreas.map(area => (
                              <button
                                key={area}
                                onClick={e => handleAddToDeck(e, area)}
                                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 w-auto inline-flex max-w-[180px]"
                              >
                                <FontAwesomeIcon icon={faClone} />
                                {area === CardArea.GearUpgrade
                                  ? 'Gear & Upgrades'
                                  : area === CardArea.Crew
                                    ? 'Crew & Sidearms'
                                    : area.charAt(0).toUpperCase() + area.slice(1)}
                              </button>
                            ))}
                            {availableAreas.length === 0 && (
                              <button
                                onClick={e => handleAddToDeck(e)}
                                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 w-auto inline-flex max-w-[180px]"
                              >
                                <FontAwesomeIcon icon={faClone} />
                                Add to Car
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
