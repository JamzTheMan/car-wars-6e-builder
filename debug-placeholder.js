// Mock CardType
const CardType = {
  Gear: 'Gear',
};

// Create some test gear cards with placeholder images
const testGearCards = [
  {
    id: '1',
    name: 'Driving Gloves',
    imageUrl: '/assets/placeholders/Blank_Gear.webp',
    type: CardType.Gear,
    subtype: 'Driving',
    buildPointCost: 0,
    crewPointCost: 1,
    numberAllowed: 1,
    source: 'Test',
  },
  {
    id: '2',
    name: 'Crash Helmet',
    imageUrl: '/assets/placeholders/Blank_Gear.webp',
    type: CardType.Gear,
    subtype: 'Head',
    buildPointCost: 0,
    crewPointCost: 1,
    numberAllowed: 1,
    source: 'Test',
  },
  {
    id: '3',
    name: 'Racing Boots',
    imageUrl: '/assets/placeholders/Blank_Gear.webp',
    type: CardType.Gear,
    subtype: 'Foot',
    buildPointCost: 0,
    crewPointCost: 1,
    numberAllowed: 1,
    source: 'Test',
  },
  {
    id: '4',
    name: 'Crash Suit',
    imageUrl: '/assets/placeholders/Blank_Gear.webp',
    type: CardType.Gear,
    subtype: 'Body',
    buildPointCost: 0,
    crewPointCost: 2,
    numberAllowed: 1,
    source: 'Test',
  },
];

// Mock current deck with some gear cards already added
const mockDeckCards = [
  {
    id: '100',
    name: 'Driving Gloves',
    imageUrl: '/assets/placeholders/Blank_Gear.webp',
    type: CardType.Gear,
    subtype: 'Driving',
    buildPointCost: 0,
    crewPointCost: 1,
    numberAllowed: 1,
    source: 'Test',
  },
];

// Updated function to simulate the canAddCardToDeck logic from cardStore
function canAddCardToDeck(card, deckCards) {
  console.log(
    `Checking if can add card: ${card.name}, Type: ${card.type}, Subtype: ${card.subtype}`
  );
  console.log(`Image URL: ${card.imageUrl}`);

  // Get all gear cards currently in the deck
  const gearCardsInDeck = deckCards.filter(c => c.type === CardType.Gear);
  console.log(`Gear cards in deck: ${gearCardsInDeck.length}`);
  gearCardsInDeck.forEach(c => {
    console.log(`- ${c.name}, Subtype: ${c.subtype}, Image: ${c.imageUrl}`);
  });

  // Special rules for Gear cards only
  if (card.type === CardType.Gear && gearCardsInDeck.length > 0) {
    // Log all image URLs being compared
    gearCardsInDeck.forEach(c => {
      console.log(`Comparing images: Card in deck: ${c.imageUrl} | New card: ${card.imageUrl}`);
      console.log(
        `Is placeholder? Deck card: ${c.imageUrl.includes('Blank_') || c.imageUrl.includes('placeholders/')} | New card: ${card.imageUrl.includes('Blank_') || card.imageUrl.includes('placeholders/')}`
      );
    });

    // Rule 1: Cannot equip multiple copies of the same gear card
    const hasSameGearCard = gearCardsInDeck.some(c => c.name === card.name);

    // Check if both have real (non-placeholder) images that match
    const hasSameImage = gearCardsInDeck.some(
      c =>
        c.imageUrl &&
        card.imageUrl &&
        c.imageUrl === card.imageUrl &&
        !c.imageUrl.includes('Blank_') &&
        !c.imageUrl.includes('placeholders/')
    );

    console.log(`Same name check: ${hasSameGearCard}`);
    console.log(`Same image check: ${hasSameImage}`);

    if (hasSameGearCard || hasSameImage) {
      console.log(`REJECTED: Duplicate gear card "${card.name}"`);
      return { allowed: false, reason: 'duplicate_gear' };
    }

    // Rule 2: Cannot equip a gear card with the same subtype as an existing gear card
    if (card.subtype && card.subtype.trim() !== '') {
      const conflictingCard = gearCardsInDeck.find(
        c =>
          c.subtype &&
          c.subtype.trim() !== '' &&
          c.subtype.toLowerCase() === card.subtype.toLowerCase()
      );

      if (conflictingCard) {
        console.log(
          `REJECTED: Conflicting subtype "${card.subtype}" with card "${conflictingCard.name}"`
        );
        return { allowed: false, reason: 'same_subtype', conflictingCard };
      } else {
        console.log(`No conflicting subtype found for "${card.subtype}"`);
      }
    } else {
      console.log('Card has no subtype, skipping subtype check');
    }
  }

  console.log(`ALLOWED: Card "${card.name}" can be added to deck`);
  return { allowed: true };
}

// Test each card against the mock deck
console.log('=== TESTING GEAR CARD VALIDATION ===');
console.log('=== TESTING WITH PLACEHOLDER IMAGES ===');
testGearCards.forEach(card => {
  console.log(`\nTrying to add: ${card.name} (${card.subtype})`);
  const result = canAddCardToDeck(card, mockDeckCards);
  console.log(
    `Result: ${result.allowed ? 'ALLOWED' : 'NOT ALLOWED'}, Reason: ${result.reason || 'N/A'}`
  );

  if (result.allowed) {
    // Simulate adding the card to the deck for the next test
    mockDeckCards.push({ ...card, id: `${parseInt(card.id) + 100}` });
  }
});

console.log('\nFinal deck contents:');
mockDeckCards.forEach(card => {
  console.log(`- ${card.name} (${card.subtype})`);
});
