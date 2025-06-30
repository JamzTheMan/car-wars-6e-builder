'use client';

import { useToast } from './Toast';
import { useCardStore } from '@/store/cardStore';
import { useState } from 'react';
import { useDrag } from 'react-dnd';
import {
  canCardTypeGoInArea,
  Card as CardType,
  CardArea,
  CardType as CardTypeEnum,
} from '@/types/types';
import { useCardValidationErrors, validateAndAddCard } from '@/utils/cardValidation';
import { deleteCardImage } from '@/utils/cardDelete';
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
  onClick,
  zoomed = false,
  onMouseEnter,
  onMouseLeave,
}: CardProps) {
  const { removeFromCollection, removeFromDeck, addToDeck, canAddCardToDeck } = useCardStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showQuickAdd] = useState(false);
  const { showToast } = useToast();
  const { handleValidationError } = useCardValidationErrors();

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
      if (
        confirm(
          `Are you sure you want to delete the card "${card.name}"? This will also remove any instances from your deck.`
        )
      ) {
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
      console.log('Removing card from deck:', card.id);
      // Just remove this instance from the deck
      removeFromDeck(card.id);
    }
  };
  const handleAddToDeck = (e: React.MouseEvent, area?: CardArea) => {
    e.stopPropagation();

    // Use the centralized validation and add function
    const cardAdded = validateAndAddCard(
      card,
      { canAddCardToDeck, addToDeck },
      area,
      showToast,
      handleValidationError
    );

    if (cardAdded) {
      setIsPreviewOpen(false); // Close the preview after adding
    }
  };

  const handleQuickAdd = (area: CardArea) => {
    // Use the centralized validation and add function
    validateAndAddCard(
      card,
      { canAddCardToDeck, addToDeck },
      area,
      showToast,
      handleValidationError
    );
  };
  const openPreview = () => {
    if (!isDragging && !isPreviewOpen) {
      setIsPreviewOpen(true);
    }
  };

  const closePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewOpen(false);
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
        <button
          onClick={handleDelete}
          className="absolute bottom-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded p-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title={isInCollection ? 'Delete card from collection' : 'Remove card from deck'}
        >
          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
        </button>{' '}
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
            className="bg-white bg-opacity-85 rounded-lg overflow-hidden shadow-2xl max-w-3xl max-h-[90vh] relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold text-gray-800">{card.name}</h3>
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
                <div className="w-full md:w-1/2 flex-shrink-0">
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-auto object-contain max-h-[77vh] rounded-md shadow-md"
                  />
                </div>
                <div className="w-full md:w-1/2 flex-shrink-0">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1 text-gray-700">Details:</h4>
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
                    {/* Conditionally show description if available */}
                    {card.description && (
                      <div className="mt-4">
                        <h4 className="text-lg font-semibold mb-1 text-gray-700">Description:</h4>
                        <p className="text-gray-600">{card.description}</p>
                      </div>
                    )}{' '}
                  </div>

                  {isInCollection && (
                    <div className="mt-4">
                      <h4 className="text-lg font-semibold mb-2 text-gray-700">Add to Car:</h4>
                      {(() => {
                        // Only show buttons for valid sides, similar to quick add overlay
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
                        const validAreas = Object.entries(areaMap)
                          .filter(([side]) => sides.includes(side))
                          .map(([, area]) => area);
                        // If no valid sides, fallback to all available areas
                        const areasToShow =
                          validAreas.length > 0 ? validAreas : getAvailableAreas(card.type);
                        return (
                          <div className="flex flex-col gap-2">
                            {areasToShow.map(area => (
                              <button
                                key={area}
                                onClick={e => handleAddToDeck(e, area)}
                                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 w-auto inline-flex max-w-[180px]"
                              >
                                <FontAwesomeIcon icon={faClone} />
                                {area === 'gearupgrade'
                                  ? 'Gear & Upgrades'
                                  : area.charAt(0).toUpperCase() + area.slice(1)}
                              </button>
                            ))}
                            {areasToShow.length === 0 && (
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
