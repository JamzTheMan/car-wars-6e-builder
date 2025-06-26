import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Card } from '@/types/types';

// Path to the JSON file that will store our global card collection
const cardsFilePath = path.join(process.cwd(), 'src', 'data', 'cards.json');

/**
 * Read the card collection from the JSON file
 * @returns Array of cards
 */
function readCards(): Card[] {
  try {
    if (!fs.existsSync(cardsFilePath)) {
      return [];
    }
    
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
  try {
    // Ensure directory exists
    if (!fs.existsSync(path.dirname(cardsFilePath))) {
      fs.mkdirSync(path.dirname(cardsFilePath), { recursive: true });
    }
    
    fs.writeFileSync(cardsFilePath, JSON.stringify(cards, null, 2), {
      mode: 0o644 // Make the file readable by all, writable by owner
    });
  } catch (error) {
    console.error('Error writing cards file:', error);
    throw error;
  }
}

// GET /api/cards/[id] - Get a specific card by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
){
  try {
    const id = await params.id;
    const cards = readCards();
    const card = cards.find(card => card.id === id);
    
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    return NextResponse.json(card);
  } catch (error) {
    console.error('Error getting card:', error);
    return NextResponse.json({ error: 'Failed to get card' }, { status: 500 });
  }
}

// DELETE /api/cards/[id] - Delete a specific card by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
){
  try {
    const id = await params.id;
    const cards = readCards();
    const filteredCards = cards.filter(card => card.id !== id);
    
    if (filteredCards.length === cards.length) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    writeCards(filteredCards);
    
    return NextResponse.json({ success: true, cards: filteredCards });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}

// PATCH /api/cards/[id] - Update a specific card by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
){  try {
    const id = await params.id;
    const cards = readCards();
    const updatedCardData = await request.json();
    
    const cardIndex = cards.findIndex(card => card.id === id);
    
    if (cardIndex === -1) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    
    // Update card while preserving its ID
    cards[cardIndex] = {
      ...cards[cardIndex],
      ...updatedCardData,
      id // Ensure ID remains unchanged
    };
    
    writeCards(cards);
    
    return NextResponse.json({ success: true, card: cards[cardIndex] });
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}
