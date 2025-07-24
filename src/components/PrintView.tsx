'use client';

import { useRef, useEffect } from 'react';
import { useCardStore } from '@/store/cardStore';
import { Card as CardType, CardArea } from '@/types/types';

interface PrintViewProps {
  printMode: 'full' | 'simple';
  onCloseAction: () => void;
}

export function PrintView({ printMode, onCloseAction }: PrintViewProps) {
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
    // Inject Orbitron font for print and screen
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css?family=Orbitron:700&display=swap';
    document.head.appendChild(fontLink);

    if (hasPrinted.current) {
      return;
    }

    // Set page orientation and maximize space usage
    const style = document.createElement('style');
    style.textContent = `
      @page {
        size: ${printMode === 'full' ? 'landscape' : 'portrait'};
        margin: 0.4cm 3cm;
      }
      
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          box-sizing: border-box !important;
        }
        .print-view {
          width: 100vw !important;
          height: 100vh !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          padding: 0.1cm !important;
          margin: 0 !important;
          font-size: 8pt !important;
          background: white !important;
        }
        /* Maximum compact view - no wasted space */
        li, div, span {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1 !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Print
    const printTimeout = setTimeout(() => {
      hasPrinted.current = true;
      window.scrollTo(0, 0);
      window.print();

      // Close after printing
      setTimeout(onCloseAction, 200);
    }, 300);

    return () => {
      document.head.removeChild(fontLink);
      document.head.removeChild(style);
      clearTimeout(printTimeout);
    };
  }, [onCloseAction, printMode]);

  // Handle afterprint event
  useEffect(() => {
    const handleAfterPrint = () => {
      onCloseAction();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onCloseAction]);

  if (!currentDeck) return null;

  // Full layout view with images
  if (printMode === 'full') {
    return (
      <div
        className="print-view print-full"
        ref={printRef}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          padding: '0.1cm',
          margin: 0,
          background: 'white',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            margin: 0,
            marginBottom: '10px',
            fontSize: '14pt',
            fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          {currentDeck.name}
        </h1>
        <p style={{ textAlign: 'center', fontWeight: 'bold', margin: 0, marginBottom: '15px' }}>
          {pointsSummary}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '10px' }}>
          {/* Left side */}
          <div style={{ border: '1px solid #ccc', padding: '5px' }}>
            <h2 style={{ textAlign: 'left', color: '#900', margin: '0 0 5px 0' }}>LEFT</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {cardsByArea[CardArea.Left]?.map(card => (
                <div key={card.id} style={{ width: '100%', marginBottom: '5px' }}>
                  <img src={card.imageUrl} alt={card.name} style={{ width: '100%' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Center */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ border: '1px solid #ccc', padding: '5px' }}>
              <h2 style={{ textAlign: 'center', color: '#900', margin: '0 0 5px 0' }}>FRONT</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {cardsByArea[CardArea.Front]?.map(card => (
                  <div key={card.id} style={{ width: '48%', marginBottom: '5px' }}>
                    <img src={card.imageUrl} alt={card.name} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '5px' }}>
              <h2 style={{ textAlign: 'center', color: '#900', margin: '0 0 5px 0' }}>CREW</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {cardsByArea[CardArea.Crew]?.map(card => (
                  <div key={card.id} style={{ width: '48%', marginBottom: '5px' }}>
                    <img src={card.imageUrl} alt={card.name} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '5px' }}>
              <h2 style={{ textAlign: 'center', color: '#900', margin: '0 0 5px 0' }}>
                GEAR / UPGRADES
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {cardsByArea[CardArea.GearUpgrade]?.map(card => (
                  <div key={card.id} style={{ width: '48%', marginBottom: '5px' }}>
                    <img src={card.imageUrl} alt={card.name} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid #ccc', padding: '5px' }}>
              <h2 style={{ textAlign: 'center', color: '#900', margin: '0 0 5px 0' }}>BACK</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {cardsByArea[CardArea.Back]?.map(card => (
                  <div key={card.id} style={{ width: '48%', marginBottom: '5px' }}>
                    <img src={card.imageUrl} alt={card.name} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side */}
          <div style={{ border: '1px solid #ccc', padding: '5px' }}>
            <h2 style={{ textAlign: 'center', color: '#900', margin: '0 0 5px 0' }}>RIGHT</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {cardsByArea[CardArea.Right]?.map(card => (
                <div key={card.id} style={{ width: '100%', marginBottom: '5px' }}>
                  <img src={card.imageUrl} alt={card.name} style={{ width: '100%' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Simple text-only layout
  return (
    <div
      className="print-view print-simple"
      ref={printRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        padding: '0.1cm',
        margin: 0,
        background: 'white',
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          margin: 0,
          fontSize: '14pt',
          fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
          letterSpacing: '1.5px',
        }}
      >
        {currentDeck.name}
      </h1>
      <p style={{ textAlign: 'center', fontWeight: 'bold', margin: 0, fontSize: '10pt' }}>
        {pointsSummary}
      </p>

      {/* Crew Section */}
      <div style={{ marginBottom: '7px' }}>
        <h2
          style={{
            textAlign: 'center',
            color: '#900',
            margin: '0 0 3px 0',
            fontSize: '12pt',
            fontWeight: 'bold',
            fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          CREW
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cardsByArea[CardArea.Crew]?.map(card => (
            <li
              key={card.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0 0 1px 0',
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <span
                  style={{
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginRight: '2px',
                    fontSize: '8pt',
                  }}
                >
                  {card.name}
                </span>
                <span style={{ color: '#444', fontStyle: 'italic', fontSize: '7pt' }}>
                  ({card.type}
                  {card.subtype ? ` - ${card.subtype}` : ''})
                </span>
              </div>
              <div
                style={{
                  flexGrow: 1,
                  height: '1px',
                  borderBottom: '1px dotted #999',
                  margin: '0 2px',
                }}
              ></div>
              <span
                style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: '20px',
                  fontSize: '8pt',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {card.crewPointCost}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Gear/Upgrade Section */}
      <div style={{ marginBottom: '7px' }}>
        <h2
          style={{
            textAlign: 'center',
            color: '#900',
            margin: '0 0 3px 0',
            fontSize: '12pt',
            fontWeight: 'bold',
            fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          GEAR / UPGRADES
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cardsByArea[CardArea.GearUpgrade]?.map(card => (
            <li
              key={card.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0 0 1px 0',
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <span
                  style={{
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginRight: '2px',
                    fontSize: '8pt',
                  }}
                >
                  {card.name}
                </span>
                <span style={{ color: '#444', fontStyle: 'italic', fontSize: '7pt' }}>
                  ({card.type}
                  {card.subtype ? ` - ${card.subtype}` : ''})
                </span>
              </div>
              <div
                style={{
                  flexGrow: 1,
                  height: '1px',
                  borderBottom: '1px dotted #999',
                  margin: '0 2px',
                }}
              ></div>
              <span
                style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: '20px',
                  fontSize: '8pt',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {card.type === 'Gear' ? card.crewPointCost : card.buildPointCost}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Front Section */}
      <div style={{ marginBottom: '7px' }}>
        <h2
          style={{
            textAlign: 'center',
            color: '#900',
            margin: '0 0 3px 0',
            fontSize: '12pt',
            fontWeight: 'bold',
            fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          FRONT
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cardsByArea[CardArea.Front]?.map(card => (
            <li
              key={card.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0 0 1px 0',
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <span
                  style={{
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginRight: '2px',
                    fontSize: '8pt',
                  }}
                >
                  {card.name}
                </span>
                <span style={{ color: '#444', fontStyle: 'italic', fontSize: '7pt' }}>
                  ({card.type}
                  {card.subtype ? ` - ${card.subtype}` : ''})
                </span>
              </div>
              <div
                style={{
                  flexGrow: 1,
                  height: '1px',
                  borderBottom: '1px dotted #999',
                  margin: '0 2px',
                }}
              ></div>
              <span
                style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: '20px',
                  fontSize: '8pt',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {card.buildPointCost}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Back Section */}
      <div style={{ marginBottom: '7px' }}>
        <h2
          style={{
            textAlign: 'center',
            color: '#900',
            margin: '0 0 3px 0',
            fontSize: '12pt',
            fontWeight: 'bold',
            fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          BACK
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cardsByArea[CardArea.Back]?.map(card => (
            <li
              key={card.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0 0 1px 0',
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <span
                  style={{
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginRight: '2px',
                    fontSize: '8pt',
                  }}
                >
                  {card.name}
                </span>
                <span style={{ color: '#444', fontStyle: 'italic', fontSize: '7pt' }}>
                  ({card.type}
                  {card.subtype ? ` - ${card.subtype}` : ''})
                </span>
              </div>
              <div
                style={{
                  flexGrow: 1,
                  height: '1px',
                  borderBottom: '1px dotted #999',
                  margin: '0 2px',
                }}
              ></div>
              <span
                style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: '20px',
                  fontSize: '8pt',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {card.buildPointCost}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Left Section */}
      <div style={{ marginBottom: '7px' }}>
        <h2
          style={{
            textAlign: 'center',
            color: '#900',
            margin: '0 0 3px 0',
            fontSize: '12pt',
            fontWeight: 'bold',
            fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          LEFT
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cardsByArea[CardArea.Left]?.map(card => (
            <li
              key={card.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0 0 1px 0',
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <span
                  style={{
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginRight: '2px',
                    fontSize: '8pt',
                  }}
                >
                  {card.name}
                </span>
                <span style={{ color: '#444', fontStyle: 'italic', fontSize: '7pt' }}>
                  ({card.type}
                  {card.subtype ? ` - ${card.subtype}` : ''})
                </span>
              </div>
              <div
                style={{
                  flexGrow: 1,
                  height: '1px',
                  borderBottom: '1px dotted #999',
                  margin: '0 2px',
                }}
              ></div>
              <span
                style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: '20px',
                  fontSize: '8pt',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {card.buildPointCost}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right Section */}
      <div style={{ marginBottom: '7px' }}>
        <h2
          style={{
            textAlign: 'center',
            color: '#900',
            margin: '0 0 3px 0',
            fontSize: '12pt',
            fontWeight: 'bold',
            fontFamily: "'Orbitron', 'Audiowide', 'Exo', 'Segoe UI', 'Arial', sans-serif",
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          RIGHT
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cardsByArea[CardArea.Right]?.map(card => (
            <li
              key={card.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0 0 1px 0',
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <span
                  style={{
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginRight: '2px',
                    fontSize: '8pt',
                  }}
                >
                  {card.name}
                </span>
                <span style={{ color: '#444', fontStyle: 'italic', fontSize: '7pt' }}>
                  ({card.type}
                  {card.subtype ? ` - ${card.subtype}` : ''})
                </span>
              </div>
              <div
                style={{
                  flexGrow: 1,
                  height: '1px',
                  borderBottom: '1px dotted #999',
                  margin: '0 2px',
                }}
              ></div>
              <span
                style={{
                  fontWeight: 'bold',
                  textAlign: 'center',
                  minWidth: '20px',
                  fontSize: '8pt',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                {card.buildPointCost}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
