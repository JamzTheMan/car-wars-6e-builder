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
  Turret = 'turret',
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
  copies: number; // Number of copies per purchase
  exclusive: boolean; // Only one exclusive card can be in a car
  sides: string; // Limits which sides the card can be placed on (F, B, L, R)
  prerequisite?: string; // Name of a card that must be in the deck before this card can be added
  associated?: string; // Name of an associated card that should be shown with this card
  description?: string; // Making it optional since existing cards may not have it
  area?: CardArea;
  position?: {
    x: number;
    y: number;
  };
  damage?: number; // Track damage on cards (from 0 to 9)
}

export interface PointLimits {
  buildPoints: number;
  crewPoints: number;
}

export interface PointsUsed {
  buildPoints: number;
  crewPoints: number;
}

export interface ArmorValues {
  front: { current: number; max: number; onFire?: boolean };
  back: { current: number; max: number; onFire?: boolean };
  left: { current: number; max: number; onFire?: boolean };
  right: { current: number; max: number; onFire?: boolean };
}

export type SpeedValue = 'R' | '0' | '1' | '2' | '3' | '4' | '5';

export interface VehicleControls {
  tires: number; // 0-10
  power: number; // 0-10
  speed: SpeedValue; // R, 0-5
}

export interface DeckLayout {
  id: string;
  name: string;
  division: string; // Add this field
  backgroundImage: string;
  cards: Card[];
  pointLimits: PointLimits;
  pointsUsed: PointsUsed;
  armor?: ArmorValues; // Track armor for each side/area
  vehicleControls?: VehicleControls; // Track tires, power, and speed
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
    case CardArea.Turret:
      return type === CardType.Weapon; // Turret area only accepts weapons with 't' in sides (checked in validation)
    default:
      return false;
  }
}
