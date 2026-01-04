'use client';

import { useCardStore } from '@/store/cardStore';
import type { SpeedValue } from '@/types/types';

const SPEED_VALUES: SpeedValue[] = ['5', '4', '3', '2', '1', '0', 'R'];

interface VerticalSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

function VerticalSlider({ label, value, onChange, min = 0, max = 10, className = '' }: VerticalSliderProps) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => max - i);

  // Determine color based on label
  const getActiveColor = () => {
    if (label === 'TIRES') return 'bg-blue-500 text-white shadow-md';
    if (label === 'POWER') return 'bg-red-500 text-white shadow-md';
    return 'bg-yellow-500 text-black shadow-md';
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-white font-bold mb-0.5 text-shadow" style={{ fontSize: 'clamp(0.495rem, 1.32vh, 0.825rem)' }}>{label}</div>
      <div className="relative flex flex-col items-center bg-gray-800 bg-opacity-70 rounded border border-gray-600" style={{ padding: 'clamp(1.1px, 0.44vh, 6.6px)' }}>
        {values.map((val) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`flex items-center justify-center font-bold rounded transition-all ${
              value === val
                ? getActiveColor()
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            style={{
              width: 'clamp(17.6px, 2.42vh, 35.2px)',
              height: 'clamp(13.2px, 1.76vh, 30.8px)',
              fontSize: 'clamp(0.495rem, 1.32vh, 0.825rem)',
              marginBottom: val !== min ? 'clamp(0.55px, 0.33vh, 3.3px)' : '0',
            }}
          >
            {val}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SpeedSliderProps {
  value: SpeedValue;
  onChange: (value: SpeedValue) => void;
  className?: string;
}

function SpeedSlider({ value, onChange, className = '' }: SpeedSliderProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-white font-bold mb-0.5 text-shadow" style={{ fontSize: 'clamp(0.495rem, 1.32vh, 0.825rem)' }}>SPEED</div>
      <div className="relative flex flex-col items-center bg-gray-900 bg-opacity-80 rounded border border-gray-700"
           style={{
             background: 'linear-gradient(180deg, rgba(30,30,30,0.9) 0%, rgba(20,20,20,0.95) 100%)',
             padding: 'clamp(1.1px, 0.44vh, 6.6px)',
           }}>
        {/* Gear shift pattern */}
        {SPEED_VALUES.map((speed) => {
          const isReverse = speed === 'R';
          const isActive = value === speed;

          return (
            <button
              key={speed}
              onClick={() => onChange(speed)}
              className={`relative flex items-center justify-center font-bold rounded transition-all ${
                isActive
                  ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/50 scale-105'
                  : isReverse
                    ? 'bg-yellow-700 text-white hover:bg-yellow-600'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              style={{
                width: 'clamp(26.4px, 3.85vh, 61.6px)',
                height: 'clamp(19.8px, 2.75vh, 48.4px)',
                fontSize: 'clamp(0.55rem, 1.43vh, 0.935rem)',
                marginBottom: speed !== 'R' ? 'clamp(0.55px, 0.33vh, 3.3px)' : '0',
                border: isActive ? '1px solid white' : '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {speed}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VehicleControls() {
  const { currentDeck, setTires, setPower, setSpeed } = useCardStore();

  if (!currentDeck) {
    return null;
  }

  // Initialize default values if vehicleControls doesn't exist yet
  const controls = currentDeck.vehicleControls || { tires: 10, power: 10, speed: '2' as SpeedValue };
  const { tires, power, speed } = controls;


  return (
    <>
      {/* Left side: Tires and Power */}
      <div
        className="absolute top-1/2 transform -translate-y-1/2 flex pointer-events-auto"
        style={{
          left: 'clamp(4.4px, 1.32vh, 17.6px)',
          gap: 'clamp(2.2px, 0.88vh, 13.2px)'
        }}
      >
        <VerticalSlider
          label="TIRES"
          value={tires}
          onChange={setTires}
          min={0}
          max={10}
        />
        <VerticalSlider
          label="POWER"
          value={power}
          onChange={setPower}
          min={0}
          max={10}
        />
      </div>

      {/* Right side: Speed */}
      <div
        className="absolute top-1/2 transform -translate-y-1/2 pointer-events-auto"
        style={{
          right: 'clamp(4.4px, 1.32vh, 17.6px)'
        }}
      >
        <SpeedSlider
          value={speed}
          onChange={setSpeed}
        />
      </div>
    </>
  );
}
