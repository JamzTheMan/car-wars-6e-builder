import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cardsDir = path.join(process.cwd(), 'public', 'uploads', 'cards');
    
    // Check if the directory exists
    if (!fs.existsSync(cardsDir)) {
      return NextResponse.json({ 
        message: 'Cards directory does not exist',
        files: [] 
      });
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(cardsDir);
    
    // Map to URLs
    const fileUrls = files.map(file => `/uploads/cards/${file}`);
    
    return NextResponse.json({ 
      files: fileUrls,
      count: fileUrls.length
    });
  } catch (error) {
    console.error('Error listing card files:', error);
    return NextResponse.json(
      { error: 'Failed to list card files' },
      { status: 500 }
    );
  }
}
