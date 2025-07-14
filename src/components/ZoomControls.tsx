'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';

// Default zoom steps (in percentages)
const ZOOM_STEPS = [25, 33, 50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400, 500];
// Default zoom level index (100%)
const DEFAULT_ZOOM_INDEX = ZOOM_STEPS.indexOf(100);

export function ZoomControls() {
  const [currentZoom, setCurrentZoom] = useState(100);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);

  // Initialize zoom level from localStorage or browser default on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to get from localStorage first
      const savedZoom = localStorage.getItem('car-wars-6e-builder:zoomLevel');
      const zoomLevel = savedZoom ? parseInt(savedZoom) : Math.round(window.devicePixelRatio * 100);

      setCurrentZoom(zoomLevel);

      // Find the closest zoom level in our steps
      const closestIndex = ZOOM_STEPS.reduce(
        (prev, curr, idx) =>
          Math.abs(curr - zoomLevel) < Math.abs(ZOOM_STEPS[prev] - zoomLevel) ? idx : prev,
        DEFAULT_ZOOM_INDEX
      );

      setZoomIndex(closestIndex);

      // Apply the zoom when component mounts
      applyZoom(ZOOM_STEPS[closestIndex]);
    }
  }, []);

  // Function to zoom in (increase zoom level)
  const zoomIn = () => {
    if (zoomIndex < ZOOM_STEPS.length - 1) {
      const newIndex = zoomIndex + 1;
      setZoomIndex(newIndex);
      const newZoom = ZOOM_STEPS[newIndex];
      setCurrentZoom(newZoom);
      applyZoom(newZoom);
    }
  };

  // Function to zoom out (decrease zoom level)
  const zoomOut = () => {
    if (zoomIndex > 0) {
      const newIndex = zoomIndex - 1;
      setZoomIndex(newIndex);
      const newZoom = ZOOM_STEPS[newIndex];
      setCurrentZoom(newZoom);
      applyZoom(newZoom);
    }
  };

  // Apply zoom to the page
  const applyZoom = (zoomLevel: number) => {
    if (typeof document !== 'undefined') {
      const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
      const mainElement = document.querySelector('main');

      if (isFirefox && mainElement) {
        // Firefox specific approach using transform
        mainElement.setAttribute(
          'style',
          `transform: scale(${zoomLevel / 100}); transform-origin: center top; height: ${100 / (zoomLevel / 100)}vh;`
        );
      } else {
        // Chrome, Safari, Edge approach using zoom
        document.body.style.zoom = `${zoomLevel}%`;
      }

      // Store zoom preference
      localStorage.setItem('car-wars-6e-builder:zoomLevel', zoomLevel.toString());
    }
  };

  return (
    <div className="flex items-center gap-1 rounded px-1 py-0.5 border border-gray-600">
      <button
        onClick={zoomOut}
        className="text-gray-300 hover:text-white"
        title="Zoom Out"
        aria-label="Zoom Out"
        disabled={zoomIndex === 0}
      >
        <FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
      </button>
      <span className="text-xs font-mono whitespace-nowrap text-gray-200 mx-1">{currentZoom}%</span>
      <button
        onClick={zoomIn}
        className="text-gray-300 hover:text-white"
        title="Zoom In"
        aria-label="Zoom In"
        disabled={zoomIndex === ZOOM_STEPS.length - 1}
      >
        <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
      </button>
    </div>
  );
}
