'use client';

import { useEffect, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Card } from '@/components/Card';
import { useCardStore } from '@/store/cardStore';
import { Card as CardType, CardArea, canCardTypeGoInArea } from '@/types/types';
import { VehicleName } from './VehicleName';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faTrashAlt, faUpload } from '@fortawesome/free-solid-svg-icons';

// Re-export VehicleName for compatibility
export { VehicleName };

export function DeckLayoutMenu() {
  const { currentDeck, updateDeckBackground, updatePointLimits, collectionCards, addToCollection } =
    useCardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [buildPoints, setBuildPoints] = useState(currentDeck?.pointLimits.buildPoints ?? 0);
  const [crewPoints, setCrewPoints] = useState(currentDeck?.pointLimits.crewPoints ?? 0);
  const [division, setDivision] = useState(
    Math.ceil((currentDeck?.pointLimits.crewPoints ?? 0) / 4)
  );

  useEffect(() => {
    if (currentDeck) {
      setBuildPoints(currentDeck.pointLimits.buildPoints);
      setCrewPoints(currentDeck.pointLimits.crewPoints);
      // Set division based on crew points (since division = crew points in AADA rules)
      const crewValue = currentDeck.pointLimits.crewPoints;
      setDivision(crewValue > 0 && crewValue <= 12 ? crewValue : 1);
    }
  }, [currentDeck]);

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'backgrounds');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { path: imageUrl } = await response.json();
      updateDeckBackground(imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload background image. Please try again.');
    }
  };

  const handlePointsUpdate = () => {
    updatePointLimits({ buildPoints, crewPoints });
    // Update division to match the current point values if manually changed
    setDivision(crewPoints > 0 ? crewPoints : 1);
    setIsEditingPoints(false);
  };

  return (
    <div className="relative">
      <button
        className="p-2 hover:bg-gray-700 rounded-full"
        onClick={() => setIsEditingPoints(!isEditingPoints)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleBackgroundUpload}
        className="hidden"
      />

      {isEditingPoints && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-2">
              <h3 className="font-medium">Build & Crew Points</h3>
              <button
                onClick={() => setIsEditingPoints(false)}
                className="text-gray-400 hover:text-gray-200"
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
            </div>{' '}
            <div className="space-y-3">
              {/* AADA Division - Moved to the top */}
              <div>
                <label className="block text-sm font-medium mb-1">AADA Division</label>
                <select
                  value={division}
                  onChange={e => {
                    const value = parseInt(e.target.value);
                    setDivision(value);
                    setBuildPoints(value * 4);
                    setCrewPoints(value);
                  }}
                  className="w-full bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-1.5 text-sm"
                >
                  {[...Array(12).keys()].map(i => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <p className="text-gray-400 text-xs mt-1 italic">
                  Sets Crew Points & Armor to Division, and Build Points to 4 x Division.
                </p>
              </div>
              {/* Build Points Limit */}
              <div>
                <label className="block text-sm font-medium mb-1">Build Points Limit</label>
                <input
                  type="number"
                  min="0"
                  value={buildPoints}
                  onChange={e => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    setBuildPoints(value);
                    // Only update division if it matches the previous rule (build = 4*division)
                    if (crewPoints * 4 === buildPoints) {
                      setDivision(Math.ceil(value / 4));
                      setCrewPoints(Math.ceil(value / 4));
                    }
                  }}
                  className="w-full bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-1.5 text-sm"
                />
              </div>
              {/* Crew Points Limit */}
              <div>
                <label className="block text-sm font-medium mb-1">Crew Points Limit</label>
                <input
                  type="number"
                  min="0"
                  value={crewPoints}
                  onChange={e => {
                    const value = Math.max(0, parseInt(e.target.value) || 0);
                    setCrewPoints(value);
                    // Only update division if it matches the previous rule (crew = division)
                    if (crewPoints === division) {
                      setDivision(value);
                      setBuildPoints(value * 4);
                    }
                  }}
                  className="w-full bg-gray-700 border-gray-600 text-gray-100 border rounded px-3 py-1.5 text-sm"
                />
              </div>
              {/* Save Changes Button */}
              <button
                onClick={handlePointsUpdate}
                className="w-full bg-green-700 hover:bg-green-900 text-white px-4 py-2 rounded text-sm"
              >
                <FontAwesomeIcon icon={faSave} className="mr-2" /> Save Build Points
              </button>
              {/* Action Buttons - Moved to the bottom */}{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded text-sm"
              >
                <FontAwesomeIcon icon={faUpload} className="mr-2" /> Upload Background
              </button>
              {currentDeck?.backgroundImage && (
                <button
                  onClick={() => updateDeckBackground('')}
                  className="w-full bg-blue-600 hover:bg-blue-800 text-white px-4 py-2 rounded text-sm"
                >
                  Reset to Default Background
                </button>
              )}
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
        </div>
      )}
    </div>
  );
}

export function DeckLayout() {
  const { currentDeck, updateCardPosition, addToDeck, canAddCardToDeck, updateCardArea } =
    useCardStore();

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
          return 'bg-green-900 bg-opacity-20';
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
            // Add from collection to specific area
            const validationResult = canAddCardToDeck(item);
            if (validationResult.allowed) {
              addToDeck(item.id, area);
            } else {
              // Display appropriate error message
              switch (validationResult.reason) {
                case 'duplicate_gear':
                  alert(`You cannot equip multiple copies of the same gear card: "${item.name}"`);
                  break;
                case 'duplicate_sidearm':
                  alert(`You cannot equip multiple copies of the same sidearm: "${item.name}"`);
                  break;
                case 'crew_limit_reached':
                  alert(
                    `You already have a ${validationResult.crewType} in your crew. Only one ${validationResult.crewType} is allowed.`
                  );
                  break;
                case 'same_subtype':
                  if (validationResult.conflictingCard) {
                    const cardType = item.type.toLowerCase();
                    alert(
                      `You cannot equip multiple ${cardType} cards of the same subtype: "${item.subtype}"\n` +
                        `You already have "${validationResult.conflictingCard.name}" equipped.`
                    );
                  } else {
                    const cardType = item.type.toLowerCase();
                    alert(
                      `You cannot equip multiple ${cardType} cards of the same subtype: "${item.subtype}"`
                    );
                  }
                  break;
                case 'not_enough_points':
                default:
                  alert('Not enough points to add this card to your deck!');
              }
            }
          } else if (item.source === 'deck') {
            // Move card between areas
            updateCardArea(item.id, area);
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
        className={`${className} ${getAreaColor()} rounded-md overflow-y-auto p-3 border-2 
          ${isOver ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : 'border-gray-600 hover:border-gray-500'} 
          transition-all duration-200 backdrop-blur-sm`}
      >
        {' '}
        <div className="text-gray-300 text-sm font-medium mb-2 text-center opacity-70">{label}</div>
        <div className="grid gap-x-1 gap-y-2 grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
          {areaCards.map(card => (
            <Card key={card.id} card={card} isDraggable={true} isInCollection={false} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 h-full relative">
      <div
        id="deck-layout"
        className="h-full relative bg-cover bg-center bg-gray-900 rounded overflow-hidden"
        style={{
          backgroundImage: currentDeck.backgroundImage
            ? `url(${currentDeck.backgroundImage})`
            : `url(/assets/placeholders/Dashboard.webp)`,
        }}
      >
        {' '}
        {/* No direction indicators - using area labels instead */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-3 p-4">
          {' '}
          {/* Top row */}
          <AreaDropTarget area={CardArea.Crew} label="Crew & Sidearms" className="h-full" />
          <AreaDropTarget area={CardArea.Front} label="Front Area" className="h-full" />
          <AreaDropTarget area={CardArea.GearUpgrade} label="Gear & Upgrades" className="h-full" />
          {/* Middle and bottom rows - full height columns for Left and Right */}
          <AreaDropTarget area={CardArea.Left} label="Left Side" className="row-span-2 h-full" />
          {/* Center row is for the dashboard image */}
          <div className="row-span-1">{/* Empty space for dashboard graphic */}</div>
          <AreaDropTarget area={CardArea.Right} label="Right Side" className="row-span-2 h-full" />
          {/* Bottom center has the Back area */}
          <AreaDropTarget area={CardArea.Back} label="Rear Area" className="h-full" />
        </div>
      </div>
    </div>
  );
}
