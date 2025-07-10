import React, { useEffect, useRef, useState } from 'react';
import { useCardStore } from '@/store/cardStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearchMinus, faSearchPlus } from '@fortawesome/free-solid-svg-icons';

interface MobileZoomHandlerProps {
  children: React.ReactNode;
}

/**
 * A component that handles pinch-to-zoom gesture on mobile to toggle between
 * single card view and double card view in the card collection
 */
const MobileZoomHandler: React.FC<MobileZoomHandlerProps> = ({ children }) => {
  const setMobileCardZoomIn = useCardStore(state => state.setMobileCardZoomIn);
  const setMobileCardZoomOut = useCardStore(state => state.setMobileCardZoomOut);
  const mobileCardZoom = useCardStore(state => state.mobileCardZoom);
  const containerRef = useRef<HTMLDivElement>(null);

  // State to show zoom feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastZoomAction, setLastZoomAction] = useState<'in' | 'out' | null>(null);

  // Variables to track touch events
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const lastPinchTime = useRef<number>(0);
  const pinchThreshold = 30; // Minimum distance change required to trigger zoom
  const pinchDebounce = 300; // Milliseconds to wait before allowing another pinch

  // Calculate distance between two touch points
  const getDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Store the initial distance between fingers
        const distance = getDistance(e.touches);
        setInitialDistance(distance);

        // Prevent default to block browser zoom
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance !== null) {
        // Calculate current distance between fingers
        const currentDistance = getDistance(e.touches);
        const distanceDelta = currentDistance - initialDistance;

        const now = Date.now();
        if (
          Math.abs(distanceDelta) > pinchThreshold &&
          now - lastPinchTime.current > pinchDebounce
        ) {
          // Determine if pinching in (distance decreasing) or pinching out (distance increasing)
          if (distanceDelta < 0) {
            // Pinching out - always zoom out to double column
            setMobileCardZoomOut();
            setLastZoomAction('out');
          } else {
            // Pinching in - always zoom in to single column
            setMobileCardZoomIn();
            setLastZoomAction('in');
          }

          // Show feedback indicator
          setShowFeedback(true);
          setTimeout(() => setShowFeedback(false), 2000);

          // Reset initial distance and update timestamp
          setInitialDistance(null);
          lastPinchTime.current = now;

          // Prevent default browser zoom behavior
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      // Reset when touch ends
      setInitialDistance(null);
    };

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    // Clean up
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [initialDistance, setMobileCardZoomIn, setMobileCardZoomOut]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {children}
      {showFeedback && (
        <div className="pinch-feedback-indicator">
          <FontAwesomeIcon
            icon={lastZoomAction === 'in' ? faSearchPlus : faSearchMinus}
            className="mr-2"
          />
          {lastZoomAction === 'in' ? 'Zoomed In' : 'Zoomed Out'}
        </div>
      )}
    </div>
  );
};

export default MobileZoomHandler;
