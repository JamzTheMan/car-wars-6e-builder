'use client';

import { useRef, useEffect } from 'react';
import { useCardStore } from '@/store/cardStore';
import { Card as CardType, CardArea } from '@/types/types';

interface PrintViewProps {
  printMode: 'full' | 'simple';
  onClose: () => void;
}

export function PrintView({ printMode, onClose }: PrintViewProps) {
  const { currentDeck } = useCardStore();
  const printRef = useRef<HTMLDivElement>(null);
  const hasPrinted = useRef(false);

  // Group cards by area
  const cardsByArea =
    currentDeck?.cards.reduce(
      (acc, card) => {
        if (card.area) {
          if (!acc[card.area]) {
            acc[card.area] = [];
          }
          acc[card.area].push(card);
        }
        return acc;
      },
      {} as Record<string, CardType[]>
    ) || {};

  // Calculate division based on crew points
  const division = currentDeck?.pointLimits.crewPoints || 0;

  // Calculate total points used
  const totalBuildPoints = currentDeck?.pointsUsed.buildPoints || 0;
  const totalCrewPoints = currentDeck?.pointsUsed.crewPoints || 0;

  // Calculate armor points (same as division in AADA rules)
  const armorPoints = division;

  // Consolidated points breakdown
  const pointsSummary = `DIVISION ${division} [${totalCrewPoints} CP, ${totalBuildPoints} BP, ${armorPoints} AP]`;

  useEffect(() => {
    if (hasPrinted.current) {
      return;
    }

    // Set page orientation based on print mode
    const style = document.createElement('style');
    style.textContent = `
      @page {
        size: ${printMode === 'full' ? 'landscape' : 'portrait'};
        margin: 0.5cm;
      }
    `;
    document.head.appendChild(style);

    // We need to wait for the component to fully render before printing
    const printTimeout = setTimeout(() => {
      hasPrinted.current = true;
      window.print();

      // After printing, close the view (with a delay to ensure dialog is properly closed)
      setTimeout(() => {
        onClose();
      }, 100);
    }, 300);

    return () => {
      document.head.removeChild(style);
      clearTimeout(printTimeout);
    };
  }, [onClose, printMode]);

  if (!currentDeck) return null;

  // Handle beforeprint and afterprint events to better manage closing
  useEffect(() => {
    const handleAfterPrint = () => {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        onClose();
      }, 100);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onClose]);

  return (
    <div
      ref={printRef}
      className={`print-view ${printMode === 'full' ? 'print-full' : 'print-simple'}`}
    >
      {printMode === 'full' ? (
        <div className="print-full-layout">
          <div className="print-header">
            <h1>{currentDeck.name}</h1>
            <div className="print-points-summary">
              <p>{pointsSummary}</p>
            </div>
          </div>

          <div className="print-layout-grid">
            {/* Front Area */}
            <div className="print-area print-area-front">
              <h2>FRONT</h2>
              <div className="print-cards">
                {cardsByArea[CardArea.Front]?.map(card => (
                  <div key={card.id} className="print-card">
                    <img src={card.imageUrl} alt={card.name} />
                  </div>
                ))}
              </div>
            </div>

            {/* Crew Area */}
            <div className="print-area print-area-crew">
              <h2>CREW</h2>
              <div className="print-cards">
                {cardsByArea[CardArea.Crew]?.map(card => (
                  <div key={card.id} className="print-card">
                    <img src={card.imageUrl} alt={card.name} />
                  </div>
                ))}
              </div>
            </div>

            {/* Gear/Upgrade Area */}
            <div className="print-area print-area-gearupgrade">
              <h2>GEAR / UPGRADES</h2>
              <div className="print-cards">
                {cardsByArea[CardArea.GearUpgrade]?.map(card => (
                  <div key={card.id} className="print-card">
                    <img src={card.imageUrl} alt={card.name} />
                  </div>
                ))}
              </div>
            </div>

            {/* Left Area */}
            <div className="print-area print-area-left">
              <h2>LEFT</h2>
              <div className="print-cards">
                {cardsByArea[CardArea.Left]?.map(card => (
                  <div key={card.id} className="print-card">
                    <img src={card.imageUrl} alt={card.name} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Area */}
            <div className="print-area print-area-right">
              <h2>RIGHT</h2>
              <div className="print-cards">
                {cardsByArea[CardArea.Right]?.map(card => (
                  <div key={card.id} className="print-card">
                    <img src={card.imageUrl} alt={card.name} />
                  </div>
                ))}
              </div>
            </div>

            {/* Back Area */}
            <div className="print-area print-area-back">
              <h2>BACK</h2>
              <div className="print-cards">
                {cardsByArea[CardArea.Back]?.map(card => (
                  <div key={card.id} className="print-card">
                    <img src={card.imageUrl} alt={card.name} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="print-simple-layout">
          <div className="print-header">
            <h1>{currentDeck.name}</h1>
            <div className="print-points-summary">
              <p>{pointsSummary}</p>
            </div>
          </div>

          {/* Crew Section */}
          <div className="print-section">
            <h2>CREW</h2>
            <ul>
              {cardsByArea[CardArea.Crew]?.map(card => (
                <li key={card.id} className="card-list-item">
                  <div className="card-info">
                    <span className="card-name">{card.name}</span>
                    <span className="card-type">
                      ({card.type}
                      {card.subtype ? ` - ${card.subtype}` : ''})
                    </span>
                  </div>
                  <span className="card-points">{card.crewPointCost}</span>
                </li>
              ))}
              {!cardsByArea[CardArea.Crew]?.length && <li>No crew cards</li>}
            </ul>
          </div>

          {/* Gear/Upgrade Section */}
          <div className="print-section">
            <h2>GEAR / UPGRADES</h2>
            <ul>
              {cardsByArea[CardArea.GearUpgrade]?.map(card => (
                <li key={card.id} className="card-list-item">
                  <div className="card-info">
                    <span className="card-name">{card.name}</span>
                    <span className="card-type">
                      ({card.type}
                      {card.subtype ? ` - ${card.subtype}` : ''})
                    </span>
                  </div>
                  <span className="card-points">
                    {card.type === 'Gear' ? card.crewPointCost : card.buildPointCost}
                  </span>
                </li>
              ))}
              {!cardsByArea[CardArea.GearUpgrade]?.length && <li>No gear/upgrade cards</li>}
            </ul>
          </div>

          {/* Front Section */}
          <div className="print-section">
            <h2>FRONT</h2>
            <ul>
              {cardsByArea[CardArea.Front]?.map(card => (
                <li key={card.id} className="card-list-item">
                  <div className="card-info">
                    <span className="card-name">{card.name}</span>
                    <span className="card-type">
                      ({card.type}
                      {card.subtype ? ` - ${card.subtype}` : ''})
                    </span>
                  </div>
                  <span className="card-points">{card.buildPointCost}</span>
                </li>
              ))}
              {!cardsByArea[CardArea.Front]?.length && <li>No front cards</li>}
            </ul>
          </div>

          {/* Back Section */}
          <div className="print-section">
            <h2>BACK</h2>
            <ul>
              {cardsByArea[CardArea.Back]?.map(card => (
                <li key={card.id} className="card-list-item">
                  <div className="card-info">
                    <span className="card-name">{card.name}</span>
                    <span className="card-type">
                      ({card.type}
                      {card.subtype ? ` - ${card.subtype}` : ''})
                    </span>
                  </div>
                  <span className="card-points">{card.buildPointCost}</span>
                </li>
              ))}
              {!cardsByArea[CardArea.Back]?.length && <li>No back cards</li>}
            </ul>
          </div>

          {/* Left Section */}
          <div className="print-section">
            <h2>LEFT</h2>
            <ul>
              {cardsByArea[CardArea.Left]?.map(card => (
                <li key={card.id} className="card-list-item">
                  <div className="card-info">
                    <span className="card-name">{card.name}</span>
                    <span className="card-type">
                      ({card.type}
                      {card.subtype ? ` - ${card.subtype}` : ''})
                    </span>
                  </div>
                  <span className="card-points">{card.buildPointCost}</span>
                </li>
              ))}
              {!cardsByArea[CardArea.Left]?.length && <li>No left cards</li>}
            </ul>
          </div>

          {/* Right Section */}
          <div className="print-section">
            <h2>RIGHT</h2>
            <ul>
              {cardsByArea[CardArea.Right]?.map(card => (
                <li key={card.id} className="card-list-item">
                  <div className="card-info">
                    <span className="card-name">{card.name}</span>
                    <span className="card-type">
                      ({card.type}
                      {card.subtype ? ` - ${card.subtype}` : ''})
                    </span>
                  </div>
                  <span className="card-points">{card.buildPointCost}</span>
                </li>
              ))}
              {!cardsByArea[CardArea.Right]?.length && <li>No right cards</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
