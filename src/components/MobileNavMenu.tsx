import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarSide,
  faLayerGroup,
  faCircleDot,
  faGear,
  faUserGroup,
  faArrowUp,
  faArrowDown,
  faRotate,
  faTableCells,
} from '@fortawesome/free-solid-svg-icons';
import { useCardStore } from '@/store/cardStore';

// Define the navigation items
const navItems = [
  { id: 'collection', label: 'Collection', icon: faLayerGroup },
  { id: 'left', label: 'Left', icon: faCarSide },
  { id: 'front', label: 'Front', icon: faArrowUp },
  { id: 'right', label: 'Right', icon: faCarSide },
  { id: 'back', label: 'Back', icon: faArrowDown },
  { id: 'turret', label: 'Turret', icon: faRotate },
  { id: 'crew', label: 'Crew', icon: faUserGroup },
  { id: 'gear', label: 'Gear', icon: faGear },
  { id: 'deck', label: 'Deck', icon: faTableCells },
];

interface MobileNavMenuProps {
  compact?: boolean;
}

const MobileNavMenu: React.FC<MobileNavMenuProps> = ({ compact = false }) => {
  const mobileView = useCardStore(state => state.mobileView);
  const setMobileView = useCardStore(state => state.setMobileView);

  return (
    <div className={`w-full bg-gray-800 border-t border-gray-700 ${compact ? 'py-1' : 'py-2'}`}>
      <div className="flex justify-between overflow-x-auto hide-scrollbar px-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setMobileView(item.id as any)}
            className={`flex flex-col items-center ${compact ? 'px-2 py-1' : 'px-3 py-2'} rounded-md transition-colors ${
              mobileView === item.id
                ? 'text-yellow-400 bg-gray-700'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
            aria-label={item.label}
          >
            <FontAwesomeIcon
              icon={item.icon}
              className={compact ? 'text-sm' : 'text-lg'}
              flip={item.id === 'right' ? 'horizontal' : undefined}
            />
            <span className={`text-xs mt-1 ${compact ? 'sr-only' : ''}`}>{item.label}</span>
            {mobileView === item.id && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileNavMenu;
