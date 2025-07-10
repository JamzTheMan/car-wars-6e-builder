'use client';

import React, { useEffect, useState } from 'react';
import { useCardStore } from '@/store/cardStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquareCaretDown } from '@fortawesome/free-solid-svg-icons';

export const MobilePointsSummary: React.FC = () => {
  const { currentDeck, setDeck, updatePointLimits } = useCardStore();
  if (!currentDeck) return null;
  const { pointsUsed, pointLimits, division } = currentDeck;

  const [localDivision, setLocalDivision] = useState<number>(
    division && division !== 'custom'
      ? parseInt(division)
      : Math.ceil((pointLimits.crewPoints ?? 0) / 4)
  );

  useEffect(() => {
    if (currentDeck) {
      const crewValue = currentDeck.pointLimits.crewPoints;
      setLocalDivision(crewValue > 0 ? crewValue : 1);
    }
  }, [currentDeck]);

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const numValue = parseInt(value);
    setLocalDivision(numValue);
    if (currentDeck) {
      setDeck({
        ...currentDeck,
        division: String(numValue),
        pointLimits: {
          ...currentDeck.pointLimits,
          buildPoints: numValue * 4,
          crewPoints: numValue,
        },
      });
    }
    updatePointLimits({ buildPoints: numValue * 4, crewPoints: numValue });
  };

  return (
    <div className="flex space-x-2 text-xs text-gray-300">
      <span className="bg-yellow-950 border border-yellow-900 rounded px-2 py-0.5 relative">
        AADA:{' '}
        <select
          value={localDivision}
          onChange={handleDivisionChange}
          className="font-bold bg-transparent text-white-200 focus:outline-none pr-3.5 appearance-none text-center"
          aria-label="AADA Division"
          title="AADA Division"
        >
          {[...Array(12).keys()].map(i => (
            <option key={i + 1} value={i + 1} className="text-black">
              {i + 1}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white-300 text-xs">
          <FontAwesomeIcon icon={faSquareCaretDown} />
        </span>
      </span>
      <span className="bg-blue-900 border border-blue-700 rounded px-2 py-0.5">
        CP:{' '}
        <span className="font-bold text-white-200">
          {pointsUsed.crewPoints} / {pointLimits.crewPoints}
        </span>
      </span>
      <span className="bg-red-900 border border-red-700 rounded px-2 py-0.5">
        BP:{' '}
        <span className="font-bold text-white-200">
          {pointsUsed.buildPoints} / {pointLimits.buildPoints}
        </span>
      </span>
    </div>
  );
};
