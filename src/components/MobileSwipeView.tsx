import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCardStore } from '@/store/cardStore';
import { CardCollection } from '@/components/CardCollection';
import { DeckLayout } from '@/components/DeckLayout';
import { useCardCollectionFilters } from '@/app/CardCollectionFiltersWrapper';
import { CardCollectionFilters } from '@/components/CardCollectionFilters';
import { CardArea } from '@/types/types';
import { VehicleName } from '@/components/DeckLayout';

interface MobileSwipeViewProps {
  collectionCards: any[];
}

const MobileSwipeView: React.FC<MobileSwipeViewProps> = ({ collectionCards }) => {
  const mobileView = useCardStore(state => state.mobileView);
  const cycleMobileView = useCardStore(state => state.cycleMobileView);
  const filterProps = useCardCollectionFilters(collectionCards);
  const [showVehicleName, setShowVehicleName] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(filterProps.filterPanelOpen);

  // Keep local showFilters in sync with filterProps
  React.useEffect(() => {
    setShowFilters(filterProps.filterPanelOpen);
  }, [filterProps.filterPanelOpen]);

  // Helper to open filters and close vehicle name
  const handleOpenFilters = () => {
    setShowFilters(true);
    setShowVehicleName(false);
    filterProps.updateFilterPanelOpen(true);
  };
  // Helper to open vehicle name and close filters
  const handleOpenVehicleName = () => {
    setShowVehicleName(true);
    setShowFilters(false);
    filterProps.updateFilterPanelOpen(false);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => cycleMobileView('right'),
    onSwipedRight: () => cycleMobileView('left'),
    onSwipedUp: () => cycleMobileView('up'),
    onSwipedDown: () => cycleMobileView('down'),
    trackMouse: true, // for desktop testing
  });

  // Render the appropriate view based on mobileView
  let content: React.ReactNode = null;
  switch (mobileView) {
    case 'collection':
      content = (
        <div className="h-full flex flex-col">
          <div className="bg-gray-900 p-2 border-b border-gray-700">
            <div className="flex items-center">
              <div className="w-full flex-shrink-0">
                <CardCollectionFilters {...filterProps} />
                <button
                  className="flex ml-2 items-center justify-center text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded md:hidden"
                  onClick={() => setShowVehicleName(v => !v)}
                  aria-label="Toggle Vehicle Name"
                  type="button"
                >
                  {showVehicleName ? 'Hide Vehicle Name' : 'Show Vehicle Name'}
                </button>
              </div>
            </div>
            {showVehicleName && (
              <div className="mt-2 md:hidden">
                <VehicleName />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <CardCollection {...filterProps} />
          </div>
        </div>
      );
      break;
    case 'left':
      content = <DeckLayout area={CardArea.Left} />;
      break;
    case 'front':
      content = <DeckLayout area={CardArea.Front} />;
      break;
    case 'right':
      content = <DeckLayout area={CardArea.Right} />;
      break;
    case 'back':
      content = <DeckLayout area={CardArea.Back} />;
      break;
    case 'turret':
      content = <DeckLayout area={CardArea.Turret} />;
      break;
    case 'crew':
      content = <DeckLayout area={CardArea.Crew} />;
      break;
    case 'gear':
      content = <DeckLayout area={CardArea.GearUpgrade} />;
      break;
    case 'deck':
      content = <DeckLayout />;
      break;
    default:
      content = <CardCollection {...filterProps} />;
  }

  // Simple dot indicator for navigation
  const views = ['collection', 'left', 'front', 'right', 'back', 'turret', 'crew', 'gear', 'deck'];

  return (
    <div {...handlers} className="w-full h-full overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0">{content}</div>
      <div className="flex justify-center gap-2 py-2">
        {views.map(view => (
          <span
            key={view}
            className={`w-2 h-2 rounded-full ${mobileView === view ? 'bg-yellow-400' : 'bg-gray-600'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileSwipeView;
