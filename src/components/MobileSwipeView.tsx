import React, { useState } from 'react';
import { useCardStore } from '@/store/cardStore';
import { CardCollection } from '@/components/CardCollection';
import { DeckLayout } from '@/components/DeckLayout';
import { useCardCollectionFilters } from '@/app/CardCollectionFiltersWrapper';
import { CardCollectionFilters } from '@/components/CardCollectionFilters';
import { CardArea } from '@/types/types';
import { VehicleName } from '@/components/VehicleName';
import MobileNavMenu from '@/components/MobileNavMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faFilter } from '@fortawesome/free-solid-svg-icons';
import { MobilePointsSummary } from '@/components/MobilePointsSummary';

interface MobileSwipeViewProps {
  collectionCards: any[];
  onOpenSavedVehicles?: () => void;
}

const MobileSwipeView: React.FC<MobileSwipeViewProps> = ({
  collectionCards,
  onOpenSavedVehicles,
}) => {
  const mobileView = useCardStore(state => state.mobileView);
  const filterProps = useCardCollectionFilters(collectionCards);
  const [showFilters, setShowFilters] = React.useState(filterProps.filterPanelOpen);

  // Keep local showFilters in sync with filterProps
  React.useEffect(() => {
    setShowFilters(filterProps.filterPanelOpen);
  }, [filterProps.filterPanelOpen]);

  // No additional state needed for non-swipeable version

  // Render the appropriate view based on mobileView
  let content: React.ReactNode = null;
  switch (mobileView) {
    case 'collection':
      content = (
        <div className="h-full flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 flex flex-col gap-2 p-2">
            {/* Vehicle Name with Save/Load */}
            <div className="flex items-center justify-between">
              <VehicleName onOpenSavedVehicles={onOpenSavedVehicles} />
            </div>
            {/* Points Summary */}
            <div className="flex justify-center">
              <MobilePointsSummary />
            </div>{' '}
            {/* Filters - directly use the CardCollectionFilters component */}
            <div className="bg-gray-700 rounded">
              <CardCollectionFilters {...filterProps} />
            </div>
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

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Main content area - no animations */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">{content}</div>
      </div>

      {/* Mobile Navigation Menu */}
      <MobileNavMenu />
    </div>
  );
};

export default MobileSwipeView;
