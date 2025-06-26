import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to the JSON file that stores the global card collection
const cardsFilePath = path.join(process.cwd(), 'src', 'data', 'cards.json');

// POST /api/cards/clear - Clear the entire card collection
export function POST() {
  try {
    // Ensure directory exists
    const dirPath = path.dirname(cardsFilePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write an empty array to the cards file
    fs.writeFileSync(cardsFilePath, JSON.stringify([], null, 2), {
      mode: 0o644 // Make the file readable by all, writable by owner
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing cards:', error);
    return NextResponse.json({ error: 'Failed to clear cards' }, { status: 500 });
  }
}
