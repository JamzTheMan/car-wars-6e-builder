import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreen, faDesktop } from '@fortawesome/free-solid-svg-icons';

// A component that allows users to switch between mobile and desktop views manually
// This is useful for testing and development purposes
const DeviceModeSwitcher: React.FC<{
  onModeChange?: (isMobile: boolean) => void;
}> = ({ onModeChange }) => {
  // Default to browser width detection
  const [forceMobile, setForceMobile] = useState<boolean | null>(null);

  // When mode changes, call the handler
  useEffect(() => {
    if (forceMobile !== null && onModeChange) {
      onModeChange(forceMobile);
    }
  }, [forceMobile, onModeChange]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 rounded-full shadow-lg border border-gray-700 overflow-hidden">
      <div className="flex">
        <button
          className={`p-3 ${forceMobile === true ? 'bg-yellow-500 text-black' : 'text-gray-400'}`}
          onClick={() => setForceMobile(true)}
          title="Force Mobile View"
        >
          <FontAwesomeIcon icon={faMobileScreen} className="text-lg" />
        </button>
        <button
          className={`p-3 ${forceMobile === null ? 'bg-blue-500 text-black' : 'text-gray-400'}`}
          onClick={() => setForceMobile(null)}
          title="Auto Detect View"
        >
          <span className="text-xs px-1">Auto</span>
        </button>
        <button
          className={`p-3 ${forceMobile === false ? 'bg-green-500 text-black' : 'text-gray-400'}`}
          onClick={() => setForceMobile(false)}
          title="Force Desktop View"
        >
          <FontAwesomeIcon icon={faDesktop} className="text-lg" />
        </button>
      </div>
    </div>
  );
};

export default DeviceModeSwitcher;
