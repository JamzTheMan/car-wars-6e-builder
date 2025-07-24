import { Card, CardArea } from '@/types/types';
import { useToast } from '@/components/Toast';

/**
 * Helper function to convert side codes (F,B,L,R) to their full names
 * @param sidesCodes String containing side codes (e.g. "FLR")
 * @returns Formatted string with full side names (e.g. "Front, Left, Right")
 */
function formatSideNames(sidesCodes: string): string {
  return sidesCodes
    .split('')
    .map(side => {
      switch (side.toUpperCase()) {
        case 'F':
          return 'Front';
        case 'B':
          return 'Back';
        case 'L':
          return 'Left';
        case 'R':
          return 'Right';
        case 'T':
          return 'Turret';
        default:
          return side;
      }
    })
    .join(' or ');
}

/**
 * Result of a card validation check
 */
export interface CardValidationResult {
  allowed: boolean;
  reason?:
    | 'duplicate_gear'
    | 'duplicate_sidearm'
    | 'duplicate_accessory'
    | 'duplicate_upgrade'
    | 'same_subtype'
    | 'not_enough_points'
    | 'crew_limit_reached'
    | 'structure_limit_reached'
    | 'weapon_cost_limit'
    | 'exclusive_limit_reached'
    | 'missing_prerequisite'
    | 'has_dependent_cards'
    | 'number_allowed_exceeded'
    | 'invalid_side';
  conflictingCard?: Card;
  crewType?: 'Driver' | 'Gunner';
  area?: CardArea;
  weaponCost?: number;
  pointLimit?: number;
  invalidSide?: string;
  currentCount?: number;
  maxAllowed?: number;
}

/**
 * Check if adding a card would exceed the number allowed limit
 * @param card The card to check
 * @param deckCards Current cards in the deck
 * @returns Object with warning info if limit would be exceeded, null otherwise
 */
export function checkNumberAllowedWarning(
  card: Card,
  deckCards: Card[]
): { currentCount: number; maxAllowed: number } | null {
  if (card.numberAllowed > 0) {
    // For Crew cards, we need to check both name AND subtype
    // This is because there can be crew cards with the same name but different subtypes (Driver/Gunner)
    let currentCount = 0;

    if (card.type === 'Crew') {
      // Count cards with same name AND same subtype
      currentCount = deckCards.filter(
        c =>
          c.name.toLowerCase() === card.name.toLowerCase() &&
          c.subtype?.toLowerCase() === card.subtype?.toLowerCase()
      ).length;
    } else {
      // For other cards, just check the name as before
      currentCount = deckCards.filter(c => c.name.toLowerCase() === card.name.toLowerCase()).length;
    }

    // If adding this card would exceed the limit
    if (currentCount >= card.numberAllowed) {
      return {
        currentCount,
        maxAllowed: card.numberAllowed,
      };
    }
  }
  return null;
}

/**
 * Validate a card against the current deck
 * @param card The card to validate
 * @param deckCards
 * @param pointLimits
 * @param pointsUsed
 * @returns Validation result
 */
export function validateCardForDeck(
  card: Card,
  deckCards: Card[],
  pointLimits: { buildPoints: number; crewPoints: number },
  pointsUsed: { buildPoints: number; crewPoints: number }
): CardValidationResult {
  // Check for prerequisite
  if (card.prerequisite && card.prerequisite.trim() !== '') {
    const hasPrerequisite = deckCards.some(
      c => c.name.toLowerCase() === card.prerequisite?.toLowerCase()
    );
    if (!hasPrerequisite) {
      return {
        allowed: false,
        reason: 'missing_prerequisite',
        conflictingCard: { ...card, name: card.prerequisite } as Card,
      };
    }
  }

  // Note: numberAllowed is now handled separately as a warning, not a blocking validation
  // See checkNumberAllowedWarning function

  // Calculate available points
  const availablePoints = {
    buildPoints: pointLimits.buildPoints - pointsUsed.buildPoints,
    crewPoints: pointLimits.crewPoints - pointsUsed.crewPoints,
  };

  // Check both build points and crew points
  let canAdd = true;

  if (card.buildPointCost > 0) {
    // Apply copies if available - for every point spent, you get 'copies' number of cards
    const effectiveBuildCost =
      card.copies && card.copies > 1 ? card.buildPointCost / card.copies : card.buildPointCost;
    canAdd = canAdd && availablePoints.buildPoints >= effectiveBuildCost;
  }

  if (card.crewPointCost > 0) {
    // Apply copies if available - for every point spent, you get 'copies' number of cards
    const effectiveCrewCost =
      card.copies && card.copies > 1 ? card.crewPointCost / card.copies : card.crewPointCost;
    canAdd = canAdd && availablePoints.crewPoints >= effectiveCrewCost;
  }

  // Not enough points
  if (!canAdd) {
    return { allowed: false, reason: 'not_enough_points' };
  }

  // Check if card is exclusive and the deck already has an exclusive card
  if (card.exclusive) {
    const hasExclusiveCard = deckCards.some(c => c.exclusive);
    if (hasExclusiveCard) {
      return { allowed: false, reason: 'exclusive_limit_reached' };
    }
  }

  // Special rule: Weapons that cost 6 or more cannot be equipped in games using less than pointLimit BP
  if (card.type === 'Weapon' && card.buildPointCost >= 6) {
    // Check if the current deck has less than pointLimit BP
    if (pointLimits.buildPoints < 24) {
      return {
        allowed: false,
        reason: 'weapon_cost_limit',
        weaponCost: card.buildPointCost,
        pointLimit: pointLimits.buildPoints,
      };
    }
  }

  // Special rules for Gear and Sidearm cards:
  if ((card.type === 'Gear' || card.type === 'Sidearm') && deckCards.length > 0) {
    // Get all cards of the same type currently in the deck
    const sameTypeCardsInDeck = deckCards.filter(c => c.type === card.type);

    // Rule 1: Cannot equip multiple copies of the same card by name
    // This is the primary check - if names match, it's a duplicate
    const hasSameNameCard = sameTypeCardsInDeck.some(c => c.name === card.name);

    // Rule 1b: For real images (not placeholders), check if they're the same
    // This handles custom uploaded cards that might have same image but different names
    const isCardPlaceholder =
      !card.imageUrl || card.imageUrl.includes('Blank_') || card.imageUrl.includes('placeholders/');

    let hasSameImage = false;

    // Only do the image check if the new card has a real (non-placeholder) image
    if (!isCardPlaceholder) {
      hasSameImage = sameTypeCardsInDeck.some(c => {
        const isDeckCardPlaceholder =
          !c.imageUrl || c.imageUrl.includes('Blank_') || c.imageUrl.includes('placeholders/');

        // Only compare when both are real images, not placeholders
        return !isDeckCardPlaceholder && c.imageUrl === card.imageUrl;
      });
    }

    if (hasSameNameCard || hasSameImage) {
      const reasonType = card.type === 'Gear' ? 'duplicate_gear' : 'duplicate_sidearm';
      return { allowed: false, reason: reasonType };
    }

    // Rule 2: Cannot equip a card with the same subtype as an existing card of the same type
    if (card.subtype && card.subtype.trim() !== '') {
      const conflictingCard = sameTypeCardsInDeck.find(
        c =>
          c.subtype &&
          c.subtype.trim() !== '' &&
          c.subtype.toLowerCase() === card.subtype.toLowerCase()
      );

      if (conflictingCard) {
        return { allowed: false, reason: 'same_subtype', conflictingCard };
      }
    }
  }

  // Special rules for Accessories: Cannot equip multiple accessories that share the same name
  if (card.type === 'Accessory' && deckCards.length > 0) {
    const accessoriesInDeck = deckCards.filter(c => c.type === 'Accessory');

    // Check for accessories with the same name
    const hasSameName = accessoriesInDeck.some(c => c.name === card.name);

    if (hasSameName) {
      return { allowed: false, reason: 'duplicate_accessory' };
    }
  }

  // Special rules for Upgrades: Cannot equip multiple upgrades that share the same name or subtype
  if (card.type === 'Upgrade' && deckCards.length > 0) {
    const upgradesInDeck = deckCards.filter(c => c.type === 'Upgrade');

    // Check for upgrades with the same name
    const hasSameName = upgradesInDeck.some(c => c.name === card.name);

    if (hasSameName) {
      return { allowed: false, reason: 'duplicate_upgrade' };
    }

    // Check for upgrades with the same subtype
    if (card.subtype && card.subtype.trim() !== '') {
      const conflictingCard = upgradesInDeck.find(
        c =>
          c.subtype &&
          c.subtype.trim() !== '' &&
          c.subtype.toLowerCase() === card.subtype.toLowerCase()
      );

      if (conflictingCard) {
        return { allowed: false, reason: 'same_subtype', conflictingCard };
      }
    }
  }

  // Special rules for Crew cards - limit to 1 Driver and 1 Gunner
  if (card.type === 'Crew' && deckCards.length > 0) {
    // Get all crew cards in the deck
    const crewCardsInDeck = deckCards.filter(c => c.type === 'Crew');

    // Check if the card is a driver or gunner
    if (card.subtype && card.subtype.trim() !== '') {
      const subtypeNormalized = card.subtype.trim().toLowerCase();

      // Check for Driver limit
      if (subtypeNormalized === 'driver') {
        const hasDriver = crewCardsInDeck.some(
          c => c.subtype && c.subtype.trim().toLowerCase() === 'driver'
        );

        if (hasDriver) {
          return {
            allowed: false,
            reason: 'crew_limit_reached',
            crewType: 'Driver',
          };
        }
      }

      // Check for Gunner limit
      if (subtypeNormalized === 'gunner') {
        const hasGunner = crewCardsInDeck.some(
          c => c.subtype && c.subtype.trim().toLowerCase() === 'gunner'
        );

        if (hasGunner) {
          return {
            allowed: false,
            reason: 'crew_limit_reached',
            crewType: 'Gunner',
          };
        }
      }
    }
  }

  // Special rules for Structure cards - limit to 1 structure card per side
  if (card.type === 'Structure' && deckCards.length > 0) {
    // Count total structure cards
    const totalStructures = deckCards.filter(c => c.type === 'Structure').length;

    // Check if already have 4 structure cards (maximum allowed)
    if (totalStructures >= 4) {
      return {
        allowed: false,
        reason: 'structure_limit_reached',
      };
    }

    // We can't check specific areas here since when checking if a card can be added,
    // we don't know which area it will be added to yet.
    // The actual area-specific validation will be done in the addToDeck and
    // DeckLayout's drop handler.
  }

  // Validation passed
  return { allowed: true };
}

/**
 * Validate side placement for a card
 * @param card The card to validate
 * @param targetArea The target area to place the card
 * @returns Validation result
 */
export function validateCardSidePlacement(card: Card, targetArea: CardArea): CardValidationResult {
  // Special validation for Turret area: ONLY cards with 't' in sides field can go there
  if (targetArea === CardArea.Turret) {
    // If card doesn't have sides or doesn't include 't', it can't go in the turret
    if (!card.sides || !card.sides.toLowerCase().includes('t')) {
      return {
        allowed: false,
        reason: 'invalid_side',
        invalidSide: card.sides ? card.sides.toUpperCase() : '',
      };
    }
  }

  // Check if the target area is allowed based on the card's sides field
  if (card.sides && card.sides.trim() !== '') {
    // Validate all vehicle area locations
    const isVehicleLocation = [
      CardArea.Front,
      CardArea.Back,
      CardArea.Left,
      CardArea.Right,
      CardArea.Turret,
    ].includes(targetArea);

    if (isVehicleLocation) {
      // Convert area to a single character for comparison (F, B, L, R, T)
      let areaChar = '';

      switch (targetArea) {
        case CardArea.Front:
          areaChar = 'F';
          break;
        case CardArea.Back:
          areaChar = 'B';
          break;
        case CardArea.Left:
          areaChar = 'L';
          break;
        case CardArea.Right:
          areaChar = 'R';
          break;
        case CardArea.Turret:
          areaChar = 'T';
          break;
      }

      // If area is not allowed by sides restriction, don't update
      if (areaChar && !card.sides.toUpperCase().includes(areaChar)) {
        return {
          allowed: false,
          reason: 'invalid_side',
          invalidSide: card.sides.toUpperCase(),
        };
      }
    }
  }

  // Check structure card limits (1 structure per side)
  if (card.type === 'Structure') {
    // This validation requires checking the deck state, so it should be done in the component
    // This is handled in the addToDeck and DeckLayout's drop handler.
  }

  // Validation passed
  return { allowed: true };
}

/**
 * React hook to handle card validation errors
 * @returns Function to handle validation errors
 */
export function useCardValidationErrors() {
  const { showToast } = useToast();

  // Handle validation errors with a proper error message based on the reason
  const handleValidationError = (
    validationResult: CardValidationResult,
    cardName: string,
    cardType: string,
    cardSubtype?: string
  ) => {
    // Skip if no validation result
    if (!validationResult) return;

    switch (validationResult.reason) {
      case 'missing_prerequisite':
        if (validationResult.conflictingCard) {
          showToast(
            `Cannot add ${cardName}. It requires ${validationResult.conflictingCard.name} to be in your vehicle first.`,
            'error'
          );
        } else {
          showToast(`Cannot add ${cardName}. It requires a prerequisite card.`, 'error');
        }
        break;
      // number_allowed_exceeded is now handled as a warning with confirmation, not a blocking error
      case 'duplicate_gear':
        showToast(`You can only equip one copy of each gear card.`, 'error');
        break;
      case 'duplicate_sidearm':
        showToast(`You cannot equip multiple copies of the same sidearm: "${cardName}"`, 'error');
        break;
      case 'duplicate_accessory':
        showToast(`You cannot equip multiple copies of the same accessory: "${cardName}"`, 'error');
        break;
      case 'duplicate_upgrade':
        showToast(`You cannot equip multiple copies of the same upgrade: "${cardName}"`, 'error');
        break;
      case 'weapon_cost_limit':
        showToast(
          `Weapons that cost 6+ BP can only be on vehicles that cost 24 or more BP (Division 6+).`,
          'error'
        );
        break;
      case 'crew_limit_reached':
        showToast(
          `You already have a ${validationResult.crewType} in your crew. Only one ${validationResult.crewType} is allowed.`,
          'error'
        );
        break;
      case 'structure_limit_reached':
        if (validationResult.area) {
          showToast(
            `You cannot add another structure card to the ${validationResult.area} of your car.`,
            'error'
          );
        } else {
          showToast(`You cannot add more than 4 structure cards to your car.`, 'error');
        }
        break;
      case 'exclusive_limit_reached':
        showToast(
          `You already have an exclusive card in your vehicle. Only one exclusive card is allowed.`,
          'error'
        );
        break;
      case 'invalid_side':
        if (validationResult.invalidSide) {
          // Convert side shorthand letters to full names
          const expandedSides = formatSideNames(validationResult.invalidSide);

          showToast(`This card can only be placed on specific sides: ${expandedSides}`, 'error');
        } else {
          showToast(`This card cannot be placed on this side of the vehicle.`, 'error');
        }
        break;
      case 'same_subtype':
        if (validationResult.conflictingCard) {
          const typeToShow = cardType.toLowerCase();
          showToast(
            `Cannot equip multiple ${typeToShow}s with same subtype: "${cardSubtype}" (already have "${validationResult.conflictingCard.name}")`,
            'error'
          );
        } else {
          const typeToShow = cardType.toLowerCase();
          showToast(
            `Cannot equip multiple ${typeToShow} cards of the same subtype: "${cardSubtype}"`,
            'error'
          );
        }
        break;
      case 'not_enough_points':
      default:
        showToast('Not enough points to add this card to your deck!', 'error');
    }
  };

  return { handleValidationError };
}

/**
 * Combined utility function to validate and process a card addition
 * This serves as a single entry point for all card validation and addition flows
 * @param card Card to validate and add
 * @param cardStore CardStore instance with canAddCardToDeck and addToDeck
 * @param targetArea Optional target area for the card
 * @param showToast Toast function to display messages
 * @param handleValidationError Function to handle validation error output
 * @returns True if the card was added successfully
 */
export function validateAndAddCard(
  card: Card,
  {
    canAddCardToDeck,
    addToDeck,
  }: {
    canAddCardToDeck: (card: Card, targetArea?: CardArea) => CardValidationResult;
    addToDeck: (cardId: string, area?: CardArea, deductCost?: boolean) => void;
  },
  targetArea?: CardArea,
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void,
  handleValidationError?: (
    validationResult: CardValidationResult,
    cardName: string,
    cardType: string,
    cardSubtype?: string
  ) => void
): Promise<boolean> {
  // Extra validation for Turret area - only cards with 't' in sides can go there
  if (targetArea === CardArea.Turret) {
    if (!card.sides || !card.sides.toLowerCase().includes('t')) {
      if (showToast) {
        showToast(
          `Only weapons marked for Turret mounting can be placed in the Turret position.`,
          'error'
        );
      }
      return Promise.resolve(false);
    }
  }

  // Use the central validation function - pass the target area to ensure structure limits are checked
  const validationResult = canAddCardToDeck(card, targetArea);

  // If validation passes, add the card to the deck
  if (validationResult.allowed) {
    addToDeck(card.id, targetArea, true);
    if (showToast) {
      showToast(`Added ${card.name} to your vehicle`, 'success');
    }
    return Promise.resolve(true);
  } else {
    // Use the validation error handler if available
    if (handleValidationError) {
      handleValidationError(validationResult, card.name, card.type, card.subtype);
    } else if (showToast) {
      // Fallback if no handler is provided but we have toast
      showToast(`Cannot add ${card.name} to your vehicle`, 'error');
    }
    return Promise.resolve(false);
  }
}

/**
 * Validate moving a card from one area to another in the deck
 * This is used when moving cards within a deck via drag and drop
 * @param card The card being moved
 * @param targetArea The target area to move to
 * @param currentDeck The current deck to check against
 * @param showToast Optional toast function to display messages
 * @returns True if the card can be moved, false otherwise
 */
export function validateCardMovement(
  card: Card,
  targetArea: CardArea,
  deckCards: Card[],
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
): boolean {
  // Turret validation - only cards with 't' in the sides field can go in the turret area
  if (targetArea === CardArea.Turret) {
    if (!card.sides || !card.sides.toLowerCase().includes('t')) {
      if (showToast) {
        showToast(
          `Only weapons marked for Turret mounting can be placed in the Turret position.`,
          'error'
        );
      }
      return false;
    }
  }

  // Structure card validation - check if there's already a structure in the target area
  if (card.type === 'Structure') {
    const hasStructureInArea = deckCards.some(
      c => c.type === 'Structure' && c.area === targetArea && c.id !== card.id
    );

    if (hasStructureInArea) {
      if (showToast) {
        showToast(
          `You cannot move this structure card to the ${targetArea} of your car as another structure is already placed there.`,
          'error'
        );
      }
      return false;
    }
  }

  // Side placement validation
  if (card.sides && card.sides.trim() !== '') {
    // Validate vehicle area locations (front, back, left, right, turret)
    const isVehicleLocation = [
      CardArea.Front,
      CardArea.Back,
      CardArea.Left,
      CardArea.Right,
      CardArea.Turret,
    ].includes(targetArea);

    if (isVehicleLocation) {
      // Convert area to a single character for comparison (F, B, L, R, T)
      let areaChar = '';

      switch (targetArea) {
        case CardArea.Front:
          areaChar = 'F';
          break;
        case CardArea.Back:
          areaChar = 'B';
          break;
        case CardArea.Left:
          areaChar = 'L';
          break;
        case CardArea.Right:
          areaChar = 'R';
          break;
        case CardArea.Turret:
          areaChar = 'T';
          break;
      }

      // If area is not allowed by sides restriction, don't update
      if (areaChar && !card.sides.toUpperCase().includes(areaChar)) {
        if (showToast) {
          // Convert side shorthand letters to full names
          const expandedSides = formatSideNames(card.sides);

          showToast(`This card can only be placed on specific sides: ${expandedSides}`, 'error');
        }
        return false;
      }
    }
  }

  // Validation passed
  return true;
}

/**
 * Validate if a card can be removed from the deck
 * This checks if any other card in the deck has this card as a prerequisite
 * @param cardToRemove The card to remove
 * @param deckCards All cards currently in the deck
 * @returns Validation result with allowed=true if the card can be removed
 */
export function validateCardRemoval(cardToRemove: Card, deckCards: Card[]): CardValidationResult {
  // Check if any card in the deck has this card as a prerequisite
  const dependentCard = deckCards.find(
    c => c.prerequisite && c.prerequisite.toLowerCase() === cardToRemove.name.toLowerCase()
  );

  if (dependentCard) {
    return {
      allowed: false,
      reason: 'has_dependent_cards',
      conflictingCard: dependentCard,
    };
  }

  return { allowed: true };
}
