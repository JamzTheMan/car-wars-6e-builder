'use client';

import { useDrag } from 'react-dnd';
import { Card as CardType, CardArea } from '@/types/types';
import { useCardStore } from '@/store/cardStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { deleteCardImage } from '@/utils/cardDelete';

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
  const { removeFromCollection, removeFromDeck, addToDeck, canAddCardToDeck } = useCardStore();  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: 'CARD',
    item: { ...card, source: isInCollection ? 'collection' : 'deck' },
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => isDraggable,
  }), [card, isDraggable]);
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isInCollection) {
      // When in collection, ask for confirmation as it will remove all instances from the deck too
      if (confirm(`Are you sure you want to delete the card "${card.name}"? This will also remove any instances from your deck.`)) {
        console.log('Deleting card from collection:', card);
        try {
          // First delete the physical image file
          console.log('Deleting image file:', card.imageUrl);
          const success = await deleteCardImage(card.imageUrl);
          
          if (!success) {
            console.error('Failed to delete image file:', card.imageUrl);
            alert('Failed to delete the image file, but the card will be removed from your collection.');
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
  
  const handleAddToDeck = () => {
    if (canAddCardToDeck(card)) {
      addToDeck(card.id);
    } else {
      alert('Not enough points to add this card to your deck!');
    }
  };
  return (    
    <div
      ref={(node) => {
        if (dragRef) {
          dragRef(node);
        }
      }}
      className={`relative w-32 h-48 rounded-lg shadow-lg overflow-hidden transition-transform ${
        isDragging ? 'opacity-50' : ''
      } ${isDraggable ? 'cursor-move' : 'cursor-default'} group`}
      style={{
        transform: card.position ? `translate(${card.position.x}px, ${card.position.y}px)` : undefined,
      }}
    >      <img
        src={card.imageUrl}
        alt={card.name}
        className="w-full h-full object-cover"
      />
        {/* Delete button */}
      <button 
        onClick={handleDelete}
        className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white rounded-bl p-1 m-1 opacity-0 group-hover:opacity-100 transition-opacity"
        title={isInCollection ? "Delete card from collection" : "Remove card from deck"}
      >
        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
      </button>
      
      {/* Add to Deck button - Only shown in collection view */}
      {isInCollection && (
        <button
          onClick={handleAddToDeck}
          className="absolute top-0 left-0 bg-green-600 hover:bg-green-700 text-white rounded-br p-1 m-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Add to deck"
        >
          <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
        </button>
      )}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-90 text-gray-100 p-2">
        <div className="text-sm font-bold">{card.name}</div>
        <div className="text-xs text-gray-300">
          {card.type} {card.subtype ? `- ${card.subtype}` : ''}
        </div>
        <div className="text-xs flex justify-between">
          {card.buildPointCost > 0 && (
            <span className="text-blue-300">BP: {card.buildPointCost}</span>
          )}
          {card.crewPointCost > 0 && (
            <span className="text-green-300">CP: {card.crewPointCost}</span>
          )}
          {card.source && (
            <span className="text-gray-400 text-xs truncate ml-1" title={card.source}>
              {card.source}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
