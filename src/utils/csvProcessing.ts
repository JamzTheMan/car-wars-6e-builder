import { Card, CardType } from '@/types/types';
import { parseCSV } from './csvParser';

/**
 * Generate a placeholder image URL for a card
 * @param cardType The type of the card
 * @param subtype Optional subtype for specialized placeholders (like Driver or Gunner for Crew)
 * @returns A URL for a placeholder image
 */
export function getPlaceholderImageUrl(cardType: CardType, subtype?: string): string {
  // Special case for Crew cards with Driver or Gunner subtypes
  if (cardType === CardType.Crew && subtype) {
    if (subtype.toLowerCase() === 'driver') {
      return `/assets/placeholders/Blank_Crew_Driver.webp`;
    } else if (subtype.toLowerCase() === 'gunner') {
      return `/assets/placeholders/Blank_Crew_Gunner.webp`;
    }
  }

  // Default case using the Blank_ prefix placeholder images for each card type
  return `/assets/placeholders/Blank_${cardType}.webp`;
}

/**
 * Find a blank card from the collection to use as a template
 * @param cardType The type of card to find
 * @param collectionCards Array of existing cards in the collection
 * @returns A blank card if found, or undefined if not found
 */
export function findBlankCard(cardType: CardType, collectionCards: Card[]): Card | undefined {
  return collectionCards.find(card => card.name === `Blank_${cardType}`);
}

/**
 * Parse a name in the format Name_Subtype and extract the components
 * @param name The name that potentially has Name_Subtype format
 * @returns Object with parsed name and subtype, or just the original name if not in the format
 */
export function parseNameWithSubtype(name: string): { name: string; subtype?: string } {
  const underscoreMatch = name.match(/^(.+)_(.+)$/);
  if (underscoreMatch) {
    return {
      name: underscoreMatch[1],
      subtype: underscoreMatch[2],
    };
  }
  return { name };
}

/**
 * Check if an uploaded image exists for a given card name
 * This is a client-compatible version that uses the check-card-image API
 * @param cardName Name of the card to check for image
 * @param cardType Optional card type for more precise matching
 * @param cardSubtype Optional card subtype for more precise matching
 * @returns URL to the image if found, or undefined if not found
 */
async function findExistingCardImage(
  cardName: string,
  cardType?: CardType,
  cardSubtype?: string
): Promise<string | undefined> {
  try {
    // Skip API call in SSR mode
    if (typeof window === 'undefined') {
      return undefined;
    }

    const response = await fetch('/api/check-card-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cardName,
        cardType,
        cardSubtype,
      }),
    });

    if (!response.ok) {
      return undefined;
    }

    const result = await response.json();
    return result.exists ? result.imageUrl : undefined;
  } catch (error) {
    console.error('Error checking for existing card images:', error);
    return undefined;
  }
}

/**
 * Process a CSV file and convert it to card data
 * @param csvContent The content of the CSV file as a string
 * @param collectionCards Array of existing cards in the collection (used to find blank cards)
 * @returns A Promise resolving to an array of card objects (without IDs)
 */
export async function processCSVToCards(
  csvContent: string,
  collectionCards: Card[] = []
): Promise<Omit<Card, 'id'>[]> {
  const records = parseCSV(csvContent);

  // Process each record and collect the promises
  const cardPromises = records.map(async record => {
    // Get the card name and check for Name_Subtype format
    const rawName = record['Name'] || 'Unnamed Card';
    const parsedNameResult = parseNameWithSubtype(rawName);

    // Get the card type, defaulting to Weapon if invalid
    const typeString = record['Type'] || '';
    const cardType = Object.values(CardType).includes(typeString as CardType)
      ? (typeString as CardType)
      : CardType.Weapon;

    // Try to find a matching blank card to use as a template
    const blankCard = findBlankCard(cardType, collectionCards);

    // Determine subtype, with precedence:
    // 1. From Name_Subtype format if available
    // 2. From CSV Subtype field if available
    // 3. Empty string as fallback
    const subtype = parsedNameResult.subtype || record['Subtype'] || '';
    // Use the blank card's image if available, otherwise use the placeholders
    const defaultImageUrl = blankCard
      ? blankCard.imageUrl
      : getPlaceholderImageUrl(cardType, subtype);

    // Check for existing card images in the uploads directory
    // Pass card type and subtype for more accurate matching
    const existingImageUrl = await findExistingCardImage(parsedNameResult.name, cardType, subtype);

    // Also check if a card with the same name already exists in the collection
    const existingCard = collectionCards.find(card => {
      // Basic name match
      const nameMatch = card.name.toLowerCase() === parsedNameResult.name.toLowerCase();

      // For Crew cards, make sure we match the correct subtype (Driver vs Gunner)
      if (cardType === CardType.Crew && subtype) {
        return nameMatch && card.subtype.toLowerCase() === subtype.toLowerCase();
      }

      return nameMatch;
    });

    // Priority: 1. Existing uploaded image, 2. Existing card in collection, 3. Default placeholder
    const finalImageUrl =
      existingImageUrl || (existingCard ? existingCard.imageUrl : defaultImageUrl);

    // Process new fields
    // Copies: Number of copies given per purchase of points (default 1)
    const copies = record['Copies'] ? parseInt(record['Copies']) || 1 : 1;

    // Exclusive: Whether card is exclusive (only one can be used)
    const exclusive =
      record['Exclusive'] === 'y' ||
      record['Exclusive'] === 'yes' ||
      record['Exclusive'] === 'true';

    // Sides: Which sides of the car the card can be placed on (F, B, L, R)
    const sides = record['Sides'] || '';

    // Create a new card object
    const card = {
      name: parsedNameResult.name,
      imageUrl: finalImageUrl,
      type: cardType,
      subtype: subtype,
      buildPointCost: parseInt(record['Build Point Cost'] || '0') || 0,
      crewPointCost: parseInt(record['Crew Point Cost'] || '0') || 0,
      numberAllowed: parseInt(record['Number Allowed'] || '1') || 1,
      source: record['Source'] || '',
      copies: copies,
      exclusive: exclusive,
      sides: sides,
    };
    // Determine the source of the image for logging
    const imageSource = existingImageUrl
      ? 'Uploads Directory'
      : existingCard
        ? 'Collection Match'
        : 'Default Placeholder';

    console.log(
      `Processed card: ${card.name}, Type: ${card.type}, Subtype: ${card.subtype}, Image Source: ${imageSource}`
    );
    return card;
  });

  // Wait for all the card promises to resolve
  return Promise.all(cardPromises);
}
