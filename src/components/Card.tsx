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
import { faTrash, faPlus, faClone, faXmark } from '@fortawesome/free-solid-svg-icons';
import { deleteCardImage } from '@/utils/cardDelete';
import { useState } from 'react';

// Extended type for dragging with source information
interface DragItem extends CardType {
  source: 'collection' | 'deck';
}

interface CardProps {
  card: CardType;
  isDraggable?: boolean;
  isInCollection?: boolean;
}

export function Card({ card, isDraggable = true, isInCollection = true }: CardProps) {
  const { removeFromCollection, removeFromDeck, addToDeck, canAddCardToDeck } = useCardStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
    } else {
      // Display appropriate error message
      switch (validationResult.reason) {
        case 'duplicate_gear':
          alert(`You cannot equip multiple copies of the same gear card: "${card.name}"`);
          break;
        case 'same_subtype':
          if (validationResult.conflictingCard) {
            alert(
              `You cannot equip multiple gear cards of the same subtype: "${card.subtype}"\n` +
                `You already have "${validationResult.conflictingCard.name}" equipped.`
            );
          } else {
            alert(`You cannot equip multiple gear cards of the same subtype: "${card.subtype}"`);
          }
          break;
        case 'not_enough_points':
        default:
          alert('Not enough points to add this card to your deck!');
      }
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
        data-x={card.position?.x ?? undefined}
        data-y={card.position?.y ?? undefined}
        onClick={openPreview}
      >
        {' '}
        {/* Cost badge: only show when using placeholder image */}
        {(!card.imageUrl || card.imageUrl.includes('Blank_')) &&
          (['Sidearm', 'Crew', 'Gear'].includes(card.type) ? (
            <div
              className="absolute top-0 left-0 text-white text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full shadow border-2"
              style={{ backgroundColor: '#d21873', borderColor: '#d21873' }}
            >
              {(() => {
                const cost = (card.buildPointCost ?? 0) + (card.crewPointCost ?? 0);
                return cost;
              })()}
            </div>
          ) : (
            <div
              className="absolute top-0 right-0 text-green-900 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full shadow border-2"
              style={{ backgroundColor: '#a2e4d9', borderColor: '#a2e4d9' }}
            >
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
            <div className="absolute z-10 left-10 right-2 top-1 text-left pointer-events-none select-none">
              <span
                className="text-xs font-bold text-black break-words leading-tight block px-1"
                style={{ background: 'rgba(230, 230, 230, 0.77)', borderRadius: '0.25rem' }}
              >
                {card.name}
              </span>
            </div>
          ) : (
            <div className="absolute z-10 left-2 right-10 top-1 text-left pointer-events-none select-none">
              <span
                className="text-xs font-bold text-black break-words leading-tight block px-1"
                style={{ background: 'rgba(230, 230, 230, 0.77)', borderRadius: '0.25rem' }}
              >
                {card.name}
              </span>
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
        </button>
        {/* Add to Deck button - Only shown in collection view, larger, rounded square, perfectly centered, only on hover */}
        {isInCollection && (
          <button
            onClick={handleAddToDeck}
            className="absolute top-1/2 left-1/2 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{
              width: '2.7rem',
              height: '2.7rem',
              maxWidth: '70%',
              maxHeight: '70%',
              transform: 'translate(-50%, -50%)',
            }}
            title="Add to deck"
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
                    className="w-full h-auto object-contain max-h-[70vh] rounded-md shadow-md"
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
