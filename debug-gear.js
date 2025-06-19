// Mock CardType
const CardType = {
  Gear: 'Gear'
};

// Create some test gear cards
const testGearCards = [
  {
    id: '1',
    name: 'Driving Gloves',
    imageUrl: '/test/driving-gloves.png',
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
    imageUrl: '/test/crash-helmet.png',
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
    imageUrl: '/test/racing-boots.png',
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
    imageUrl: '/test/crash-suit.png', 
    type: CardType.Gear,
    subtype: 'Body',
    buildPointCost: 0,
    crewPointCost: 2,
    numberAllowed: 1,
    source: 'Test',
  }
];

// Mock current deck with some gear cards already added
const mockDeckCards = [
  {
    id: '100',
    name: 'Driving Gloves',
    imageUrl: '/test/driving-gloves.png',
    type: CardType.Gear,
    subtype: 'Driving',
    buildPointCost: 0,
    crewPointCost: 1,
    numberAllowed: 1,
    source: 'Test',
  }
];

// Function to simulate the canAddCardToDeck logic from cardStore
function canAddCardToDeck(card, deckCards) {
  console.log(`Checking if can add card: ${card.name}, Type: ${card.type}, Subtype: ${card.subtype}`);
  
  // Get all gear cards currently in the deck
  const gearCardsInDeck = deckCards.filter(c => c.type === CardType.Gear);
  console.log(`Gear cards in deck: ${gearCardsInDeck.length}`);
  gearCardsInDeck.forEach(c => {
    console.log(`- ${c.name}, Subtype: ${c.subtype}`);
  });
  
  // Special rules for Gear cards only
  if (card.type === CardType.Gear && gearCardsInDeck.length > 0) {
    // Rule 1: Cannot equip multiple copies of the same gear card
    const hasSameGearCard = gearCardsInDeck.some(c => 
      c.name === card.name || // Same name
      (c.imageUrl && card.imageUrl && c.imageUrl === card.imageUrl) // Same image
    );
    
    if (hasSameGearCard) {
      console.log(`REJECTED: Duplicate gear card "${card.name}"`);
      return { allowed: false, reason: 'duplicate_gear' };
    }
    
    // Rule 2: Cannot equip a gear card with the same subtype as an existing gear card
    if (card.subtype) {
      const conflictingCard = gearCardsInDeck.find(c => 
        c.subtype && c.subtype === card.subtype
      );
      
      if (conflictingCard) {
        console.log(`REJECTED: Conflicting subtype "${card.subtype}" with card "${conflictingCard.name}"`);
        return { allowed: false, reason: 'same_subtype', conflictingCard };
      }
    }
  }

  console.log(`ALLOWED: Card "${card.name}" can be added to deck`);
  return { allowed: true };
}

// Test each card against the mock deck
console.log('=== TESTING GEAR CARD VALIDATION ===');
testGearCards.forEach(card => {
  console.log(`\nTrying to add: ${card.name} (${card.subtype})`);
  const result = canAddCardToDeck(card, mockDeckCards);
  console.log(`Result: ${result.allowed ? 'ALLOWED' : 'NOT ALLOWED'}, Reason: ${result.reason || 'N/A'}`);
  
  if (result.allowed) {
    // Simulate adding the card to the deck for the next test
    mockDeckCards.push({...card, id: `${parseInt(card.id) + 100}`});
  }
});

console.log('\nFinal deck contents:');
mockDeckCards.forEach(card => {
  console.log(`- ${card.name} (${card.subtype})`);
});
