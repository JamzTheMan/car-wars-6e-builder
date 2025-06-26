import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Card } from '@/types/types';

// Path to the JSON file that will store our global card collection
const cardsFilePath = path.join(process.cwd(), 'src', 'data', 'cards.json');

/**
 * Ensure the cards.json file exists, creating it with an empty array if it doesn't
 */
function ensureCardsFileExists() {
  if (!fs.existsSync(path.dirname(cardsFilePath))) {
    fs.mkdirSync(path.dirname(cardsFilePath), { recursive: true });
  }
  
  if (!fs.existsSync(cardsFilePath)) {
    fs.writeFileSync(cardsFilePath, JSON.stringify([], null, 2), {
      mode: 0o644 // Make the file readable by all, writable by owner
    });
  }
}

/**
 * Read the card collection from the JSON file
 * @returns Array of cards
 */
function readCards(): Card[] {
  ensureCardsFileExists();
  
  try {
    const data = fs.readFileSync(cardsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading cards file:', error);
    return [];
  }
}

/**
 * Write cards to the JSON file
 * @param cards Array of cards to write
 */
function writeCards(cards: Card[]) {
  ensureCardsFileExists();
  
  try {
    fs.writeFileSync(cardsFilePath, JSON.stringify(cards, null, 2), {
      mode: 0o644 // Make the file readable by all, writable by owner
    });
  } catch (error) {
    console.error('Error writing cards file:', error);
    throw error;
  }
}

/**
 * Helper function to sort cards by type, cost, and name
 */
function sortCards(cards: Card[]): Card[] {
  // Define custom order for card types
  const typeOrder = {
    'Crew': 1,
    'Sidearm': 3,
    'Gear': 4,
    'Accessory': 5,
    'Upgrade': 6,
    'Structure': 7,
    'Weapon': 8
  };

  return [...cards].sort((a, b) => {
    // Special handling for Crew cards to sort Driver before Gunner
    if (a.type === 'Crew' && b.type === 'Crew') {
      const aIsDriver = a.subtype?.toLowerCase() === 'driver';
      const bIsDriver = b.subtype?.toLowerCase() === 'driver';
      
      if (aIsDriver && !bIsDriver) return -1;
      if (!aIsDriver && bIsDriver) return 1;
    }
    
    // Sort by card type using custom order
    if (a.type !== b.type) {
      return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    }
    
    // For Upgrades: sort by subtype first, then cost
    if (a.type === 'Upgrade') {
      // First by subtype
      if (a.subtype !== b.subtype) {
        return (a.subtype || '').localeCompare(b.subtype || '');
      }
      
      // Then by cost
      const aCost = a.buildPointCost || a.crewPointCost || 0;
      const bCost = b.buildPointCost || b.crewPointCost || 0;
      if (aCost !== bCost) {
        return aCost - bCost;
      }
    } else {
      // For all other types: sort by cost first, then subtype
      const aCost = a.buildPointCost || a.crewPointCost || 0;
      const bCost = b.buildPointCost || b.crewPointCost || 0;
      if (aCost !== bCost) {
        return aCost - bCost;
      }
      
      // Then by subtype
      if (a.subtype !== b.subtype) {
        return (a.subtype || '').localeCompare(b.subtype || '');
      }
    }
    
    // Finally, sort by name
    return a.name.localeCompare(b.name);
  });
}

// GET /api/cards - Get all cards
export function GET() {
  try {
    const cards = readCards();
    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error getting cards:', error);
    return NextResponse.json({ error: 'Failed to get cards' }, { status: 500 });
  }
}

// POST /api/cards - Add a new card
export async function POST(request: NextRequest) {
  try {
    const cards = readCards();
    const newCard = await request.json();
    
    // Add ID if not provided
    if (!newCard.id) {
      newCard.id = crypto.randomUUID();
    }
    
    cards.push(newCard);
    
    // Sort cards before saving
    const sortedCards = sortCards(cards);
    writeCards(sortedCards);
    
    return NextResponse.json({ success: true, cards: sortedCards });
  } catch (error) {
    console.error('Error adding card:', error);
    return NextResponse.json({ error: 'Failed to add card' }, { status: 500 });
  }
}

// PUT /api/cards - Update or replace the entire collection
export async function PUT(request: NextRequest) {
  try {
    const newCards = await request.json();
    
    // Sort cards before saving
    const sortedCards = sortCards(newCards);
    writeCards(sortedCards);
    
    return NextResponse.json({ success: true, cards: sortedCards });
  } catch (error) {
    console.error('Error updating cards:', error);
    return NextResponse.json({ error: 'Failed to update cards' }, { status: 500 });
  }
}
