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
  Sidearm = 'Sidearm'
}

export const CardTypeCategories: Record<CardType, PointCategory> = {
  [CardType.Weapon]: 'BuildPoints',
  [CardType.Upgrade]: 'BuildPoints',
  [CardType.Accessory]: 'BuildPoints',
  [CardType.Structure]: 'BuildPoints',
  [CardType.Crew]: 'CrewPoints',
  [CardType.Gear]: 'CrewPoints',
  [CardType.Sidearm]: 'CrewPoints'
};

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
