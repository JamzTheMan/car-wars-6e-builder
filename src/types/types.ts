export type PointCategory = 'BuildPoints' | 'CrewPoints';

export enum CardType {
  // Build Point Cards
  Weapon = 'Weapon',
  Upgrade = 'Upgrade',
  Accessory = 'Accessory',
  Structure = 'Structure',

  // Crew Point Cards
  Crew = 'Crew',
  Gear = 'Gear',
  Sidearm = 'Sidearm',
}

export const CardTypeCategories: Record<CardType, PointCategory> = {
  [CardType.Weapon]: 'BuildPoints',
  [CardType.Upgrade]: 'BuildPoints',
  [CardType.Accessory]: 'BuildPoints',
  [CardType.Structure]: 'BuildPoints',
  [CardType.Crew]: 'CrewPoints',
  [CardType.Gear]: 'CrewPoints',
  [CardType.Sidearm]: 'CrewPoints',
};

// No hard-coded subtypes - we'll derive them from the card collection

export enum CardArea {
  Crew = 'crew',
  GearUpgrade = 'gearupgrade',
  Front = 'front',
  Back = 'back',
  Left = 'left',
  Right = 'right',
}

export interface Card {
  id: string;
  name: string;
  imageUrl: string;
  type: CardType;
  subtype: string;
  buildPointCost: number;
  crewPointCost: number;
  numberAllowed: number;
  source: string;
  description?: string; // Making it optional since existing cards may not have it
  area?: CardArea;
  position?: {
    x: number;
    y: number;
  };
}

export interface PointLimits {
  buildPoints: number;
  crewPoints: number;
}

export interface PointsUsed {
  buildPoints: number;
  crewPoints: number;
}

export interface DeckLayout {
  id: string;
  name: string;
  backgroundImage: string;
  cards: Card[];
  pointLimits: PointLimits;
  pointsUsed: PointsUsed;
}

// Helper function to check if a card type can be placed in an area
export function canCardTypeGoInArea(type: CardType, area: CardArea): boolean {
  switch (area) {
    case CardArea.Crew:
      return type === CardType.Crew || type === CardType.Sidearm;
    case CardArea.GearUpgrade:
      return type === CardType.Gear || type === CardType.Upgrade;
    case CardArea.Front:
    case CardArea.Back:
    case CardArea.Left:
    case CardArea.Right:
      return type === CardType.Weapon || type === CardType.Accessory || type === CardType.Structure;
    default:
      return false;
  }
}
