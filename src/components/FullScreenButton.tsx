'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';

export function FullScreenButton({
  isFullScreen,
  toggleFullScreenAction,
}: {
  isFullScreen: boolean;
  toggleFullScreenAction: () => void;
}) {
  return (
    <button
      onClick={toggleFullScreenAction}
      className="text-gray-400 hover:text-gray-200"
      title={isFullScreen ? 'Exit Full Screen Mode' : 'Full Screen Mode (hides card collection)'}
      aria-label={isFullScreen ? 'Exit Full Screen Mode' : 'Full Screen Mode'}
    >
      <FontAwesomeIcon icon={isFullScreen ? faCompress : faExpand} className="h-5 w-5" />
    </button>
  );
}
