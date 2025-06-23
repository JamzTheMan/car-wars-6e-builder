import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Normalize a filename for comparison by removing spaces, underscores, and other special characters
 * This helps match filenames regardless of spacing/formatting differences
 */
function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[_\-\s]+/g, '') // Remove spaces, underscores, hyphens
    .replace(/[^a-z0-9]/g, ''); // Remove any non-alphanumeric characters
}

/**
 * API route to check if a card image exists in the uploads directory
 * POST /api/check-card-image
 */
export async function POST(request: Request) {
  try {
    const { cardName } = await request.json();
    
    if (!cardName) {
      return NextResponse.json({ exists: false });
    }
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'cards');
    
    // Skip if the directory doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ exists: false });
    }
    
    // Get all files in the uploads directory
    const files = fs.readdirSync(uploadsDir);
    
    // Look for files that match the card name (case insensitive)
    const cardNameLower = cardName.toLowerCase();
    
    // Create versions with different space/underscore formats
    const cardNameWithUnderscores = cardNameLower.replace(/ /g, '_');
    const cardNameWithSpaces = cardNameLower.replace(/_/g, ' ');
    
    // Create a normalized version for fuzzy matching
    const normalizedCardName = normalizeForComparison(cardName);
    
    // First check for exact matches (with all possible space/underscore variations)
    const exactMatch = files.find(file => {
      // Remove extension and compare
      const fileName = path.basename(file, path.extname(file)).toLowerCase();
      return fileName === cardNameLower || 
             fileName === cardNameWithUnderscores || 
             fileName === cardNameWithSpaces;
    });
    
    if (exactMatch) {
      return NextResponse.json({ 
        exists: true, 
        imageUrl: `/uploads/cards/${exactMatch}` 
      });
    }
    
    // If no exact match, try normalized matching for better fuzzy matching
    const normalizedMatch = files.find(file => {
      const fileName = path.basename(file, path.extname(file));
      return normalizeForComparison(fileName) === normalizedCardName;
    });
    
    if (normalizedMatch) {
      return NextResponse.json({
        exists: true,
        imageUrl: `/uploads/cards/${normalizedMatch}`
      });
    }
    
    // Also check for files that start with the card name (like Name_Subtype.webp)
    const partialMatch = files.find(file => {
      const fileName = path.basename(file, path.extname(file)).toLowerCase();
      // Check if starts with name and followed by underscore
      // Try all possible space/underscore variations
      return fileName.startsWith(`${cardNameLower}_`) || 
             fileName.startsWith(`${cardNameWithUnderscores}_`) || 
             fileName.startsWith(`${cardNameWithSpaces}_`);
    });
    
    if (partialMatch) {
      return NextResponse.json({ 
        exists: true, 
        imageUrl: `/uploads/cards/${partialMatch}` 
      });
    }
    
    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Error checking for card image:', error);
    return NextResponse.json({ exists: false, error: 'Failed to check card image' });
  }
}
