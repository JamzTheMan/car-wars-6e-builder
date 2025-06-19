import { Card, CardType } from "@/types/types";
import { parseCSV } from "./csvParser";

/**
 * Generate a placeholder image URL for a card
 * @param cardType The type of the card
 * @returns A URL for a placeholder image
 */
export function getPlaceholderImageUrl(cardType: CardType): string {
  // Using the Blank_ prefix placeholder images for each card type
  return `/assets/placeholders/Blank_${cardType}.png`;
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
 * Process a CSV file and convert it to card data
 * @param csvContent The content of the CSV file as a string
 * @param collectionCards Array of existing cards in the collection (used to find blank cards)
 * @returns An array of card objects (without IDs)
 */
export function processCSVToCards(csvContent: string, collectionCards: Card[] = []): Omit<Card, "id">[] {
  const records = parseCSV(csvContent);
  
  return records.map(record => {
    // Get the card type, defaulting to Weapon if invalid
    const typeString = record['Type'] || '';
    const cardType = Object.values(CardType).includes(typeString as CardType) 
      ? typeString as CardType 
      : CardType.Weapon;
    
    // Try to find a matching blank card to use as a template
    const blankCard = findBlankCard(cardType, collectionCards);
    
    // Use the blank card's image if available, otherwise use the placeholders
    const imageUrl = blankCard ? blankCard.imageUrl : getPlaceholderImageUrl(cardType);
    
    // Create a new card object
    return {
      name: record['Name'] || 'Unnamed Card',
      imageUrl: imageUrl,
      type: cardType,
      subtype: record['Subtype'] || '',
      buildPointCost: parseInt(record['Build Point Cost'] || '0') || 0,
      crewPointCost: parseInt(record['Crew Point Cost'] || '0') || 0,
      numberAllowed: parseInt(record['Number Allowed'] || '1') || 1,
      source: record['Source'] || ''
    };
  });
}
