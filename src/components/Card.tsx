'use client';

import { useDrag } from 'react-dnd';
import {
  Card as CardType,
  CardArea,
  CardType as CardTypeEnum,
  canCardTypeGoInArea,
} from '@/types/types';
import { useCardStore } from '@/store/cardStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faPlus,
  faClone,
  faXmark,
  faCaretUp,
  faCaretDown,
  faCaretLeft,
  faCaretRight,
} from '@fortawesome/free-solid-svg-icons';
import { deleteCardImage } from '@/utils/cardDelete';
import { useState } from 'react';
import { useToast } from './Toast';

// Extended type for dragging with source information
interface DragItem extends CardType {
  source: 'collection' | 'deck';
}

interface CardProps {
  card: CardType;
  isDraggable?: boolean;
  isInCollection?: boolean;
}

// Function to check if a card can be placed on car sides
function canBePlacedOnSides(cardType: CardTypeEnum): boolean {
  return cardType === 'Weapon' || cardType === 'Accessory' || cardType === 'Structure';
}

export function Card({ card, isDraggable = true, isInCollection = true }: CardProps) {
  const { removeFromCollection, removeFromDeck, addToDeck, canAddCardToDeck } = useCardStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { showToast } = useToast();

  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(
    () => ({
      type: 'CARD',
      item: { ...card, source: isInCollection ? 'collection' : 'deck' },
      collect: (monitor: any) => ({
        isDragging: !!monitor.isDragging(),
      }),
      canDrag: () => isDraggable && !isPreviewOpen,
    }),
    [card, isDraggable, isPreviewOpen]
  );

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
    const validationResult = canAddCardToDeck(card);
    if (validationResult.allowed) {
      addToDeck(card.id, area);
      setIsPreviewOpen(false); // Close the preview after adding
      showToast(`Added ${card.name} to your car`, 'success');
    } else {
      // Display appropriate error message
      switch (validationResult.reason) {
        case 'duplicate_gear':
          showToast(
            `You cannot equip multiple copies of the same gear card: "${card.name}"`,
            'error'
          );
          break;
        case 'duplicate_sidearm':
          showToast(
            `You cannot equip multiple copies of the same sidearm: "${card.name}"`,
            'error'
          );
          break;
        case 'duplicate_accessory':
          showToast(
            `You cannot equip multiple copies of the same accessory: "${card.name}"`,
            'error'
          );
          break;
        case 'duplicate_upgrade':
          showToast(
            `You cannot equip multiple copies of the same upgrade: "${card.name}"`,
            'error'
          );
          break;
        case 'weapon_cost_limit':
          showToast(
            `Weapons that cost 6+ BP cannot be used in games with ${validationResult.pointLimit} BP or less. This weapon costs ${validationResult.weaponCost} BP.`,
            'error'
          );
          break;
        case 'crew_limit_reached':
          showToast(
            `You already have a ${validationResult.crewType} in your crew. Only one ${validationResult.crewType} is allowed.`,
            'error'
          );
          break;
        case 'structure_limit_reached':
          if (validationResult.area) {
            showToast(
              `You cannot add another structure card to the ${validationResult.area} of your car.`,
              'error'
            );
          } else {
            showToast(`You cannot add more than 4 structure cards to your car.`, 'error');
          }
          break;
        case 'same_subtype':
          if (validationResult.conflictingCard) {
            const cardType = card.type.toLowerCase();
            showToast(
              `Cannot equip multiple ${cardType}s with same subtype: "${card.subtype}" (already have "${validationResult.conflictingCard.name}")`,
              'error'
            );
          } else {
            const cardType = card.type.toLowerCase();
            showToast(
              `Cannot equip multiple ${cardType} cards of the same subtype: "${card.subtype}"`,
              'error'
            );
          }
          break;
        case 'not_enough_points':
        default:
          showToast('Not enough points to add this card to your deck!', 'error');
      }
    }
  };

  const handleQuickAdd = (area: CardArea) => {
    const validationResult = canAddCardToDeck(card);
    if (validationResult.allowed) {
      addToDeck(card.id, area);
      showToast(`Added ${card.name} to ${area} of your car`, 'success');
    } else {
      // Re-use existing validation error handling
      handleValidationError(validationResult);
    }
  };

  const handleValidationError = (validationResult: ReturnType<typeof canAddCardToDeck>) => {
    // Re-use existing validation error logic
    switch (validationResult.reason) {
      case 'duplicate_gear':
        showToast(
          `You cannot equip multiple copies of the same gear card: "${card.name}"`,
          'error'
        );
        break;
      case 'duplicate_sidearm':
        showToast(`You cannot equip multiple copies of the same sidearm: "${card.name}"`, 'error');
        break;
      case 'duplicate_accessory':
        showToast(
          `You cannot equip multiple copies of the same accessory: "${card.name}"`,
          'error'
        );
        break;
      case 'duplicate_upgrade':
        showToast(`You cannot equip multiple copies of the same upgrade: "${card.name}"`, 'error');
        break;
      case 'weapon_cost_limit':
        showToast(
          `Weapons that cost 6+ BP cannot be used in games with ${validationResult.pointLimit} BP or less. This weapon costs ${validationResult.weaponCost} BP.`,
          'error'
        );
        break;
      case 'crew_limit_reached':
        showToast(
          `You already have a ${validationResult.crewType} in your crew. Only one ${validationResult.crewType} is allowed.`,
          'error'
        );
        break;
      case 'structure_limit_reached':
        if (validationResult.area) {
          showToast(
            `You cannot add another structure card to the ${validationResult.area} of your car.`,
            'error'
          );
        } else {
          showToast(`You cannot add more than 4 structure cards to your car.`, 'error');
        }
        break;
      case 'same_subtype':
        if (validationResult.conflictingCard) {
          const cardType = card.type.toLowerCase();
          showToast(
            `Cannot equip multiple ${cardType}s with same subtype: "${card.subtype}" (already have "${validationResult.conflictingCard.name}")`,
            'error'
          );
        } else {
          const cardType = card.type.toLowerCase();
          showToast(
            `Cannot equip multiple ${cardType} cards of the same subtype: "${card.subtype}"`,
            'error'
          );
        }
        break;
      case 'not_enough_points':
      default:
        showToast('Not enough points to add this card to your deck!', 'error');
    }
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

  const renderQuickAddButtons = () => {
    if (!isInCollection || !canBePlacedOnSides(card.type)) return null;

    return (
      <div
        className={`quick-add-overlay ${showQuickAdd ? 'opacity-100' : 'opacity-0'}`}
        onMouseEnter={() => setShowQuickAdd(true)}
        onMouseLeave={() => setShowQuickAdd(false)}
      >
        <div className="quick-add-container">
          {/* Front */}
          <button
            onClick={() => handleQuickAdd(CardArea.Front)}
            className="quick-add-button front"
            title="Add to Front"
          >
            {' '}
            <FontAwesomeIcon icon={faCaretUp} className="quick-add-icon" />
          </button>

          {/* Left */}
          <button
            onClick={() => handleQuickAdd(CardArea.Left)}
            className="quick-add-button left"
            title="Add to Left"
          >
            <FontAwesomeIcon icon={faCaretLeft} className="quick-add-icon" />
          </button>

          {/* Right */}
          <button
            onClick={() => handleQuickAdd(CardArea.Right)}
            className="quick-add-button right"
            title="Add to Right"
          >
            <FontAwesomeIcon icon={faCaretRight} className="quick-add-icon" />
          </button>

          {/* Back */}
          <button
            onClick={() => handleQuickAdd(CardArea.Back)}
            className="quick-add-button rear"
            title="Add to Rear"
          >
            <FontAwesomeIcon icon={faCaretDown} className="quick-add-icon" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        ref={node => {
          if (dragRef) {
            dragRef(node);
          }
        }}
        className={`relative w-32 h-48 rounded-lg shadow-lg overflow-hidden transition-transform ${
          isDragging ? 'opacity-50' : ''
        } ${isDraggable && !isPreviewOpen ? 'cursor-move' : 'cursor-default'} group ${
          card.position ? 'card-positioned' : ''
        }`}
        data-card-type={card.type}
        data-x={card.position?.x ?? undefined}
        data-y={card.position?.y ?? undefined}
        onClick={openPreview}
        onMouseEnter={() => setShowQuickAdd(true)}
        onMouseLeave={() => setShowQuickAdd(false)}
      >
        {isInCollection && canBePlacedOnSides(card.type) && (
          <div className={`quick-add-overlay z-20 ${showQuickAdd ? 'opacity-100' : 'opacity-0'}`}>
            <div className="quick-add-container">
              {/* Front */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleQuickAdd(CardArea.Front);
                }}
                className="quick-add-button front"
                title="Add to Front"
              >
                {' '}
                <FontAwesomeIcon icon={faCaretUp} className="quick-add-icon" />
              </button>

              {/* Left */}
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

              {/* Right */}
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

              {/* Back */}
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
            </div>
          </div>
        )}
        {/* Cost badge: only show when using placeholder image */}
        {(!card.imageUrl || card.imageUrl.includes('Blank_')) &&
          (['Sidearm', 'Crew', 'Gear'].includes(card.type) ? (
            <div className="card-cost-badge card-cost-badge-crew">
              {(() => {
                const cost = (card.buildPointCost ?? 0) + (card.crewPointCost ?? 0);
                return cost;
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
        <img
          src={card.imageUrl}
          alt={card.name}
          className="w-full h-full object-cover image-rendering-crisp min-h-[170px]"
        />
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
        {/* Add to Deck button - Only shown in collection view for cards that don't have quick-add buttons */}
        {isInCollection && !canBePlacedOnSides(card.type) && (
          <button onClick={handleAddToDeck} className="card-add-button" title="Add to deck">
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
                    </p>{' '}
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
                        const availableAreas = getAvailableAreas(card.type);
                        const vehicleLocations = [
                          CardArea.Front,
                          CardArea.Back,
                          CardArea.Left,
                          CardArea.Right,
                        ];
                        const vehicleButtons = availableAreas.filter(area =>
                          vehicleLocations.includes(area)
                        );
                        const otherButtons = availableAreas.filter(
                          area => !vehicleLocations.includes(area)
                        );

                        if (vehicleButtons.length > 1) {
                          // If we have multiple vehicle location buttons, use a grid layout
                          return (
                            <>
                              {/* Vehicle location buttons in a grid */}
                              <div className="flex flex-col gap-2">
                                {vehicleButtons.map(area => (
                                  <button
                                    key={area}
                                    onClick={e => handleAddToDeck(e, area)}
                                    className={`${getButtonClasses(availableAreas)} flex items-center justify-center gap-2 w-auto inline-flex max-w-[180px]`}
                                  >
                                    <FontAwesomeIcon icon={faClone} />
                                    {area.charAt(0).toUpperCase() + area.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </>
                          );
                        } else {
                          // Default vertical layout for all other buttons
                          return (
                            <div className="flex flex-col gap-2">
                              {availableAreas.map(area => (
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
                        }
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
