'use client';

import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { CardType } from '@/types/types';

interface CardUploadContextType {
  newCardType: CardType;
  newCardSubtype: string;
  newBuildPointCost: number;
  newCrewPointCost: number;
  newNumberAllowed: number;
  newSource: string;
  setNewCardType: (type: CardType) => void;
  setNewCardSubtype: (subtype: string) => void;
  setNewBuildPointCost: (cost: number) => void;
  setNewCrewPointCost: (cost: number) => void;
  setNewNumberAllowed: (number: number) => void;
  setNewSource: (source: string) => void;
}

interface CardUploadState {
  cardType: CardType;
  cardSubtype: string;
  buildPointCost: number;
  crewPointCost: number;
  numberAllowed: number;
  source: string;
}

const STORAGE_KEY = 'card-upload-preferences';

const CardUploadContext = createContext<CardUploadContextType | undefined>(undefined);

export function useCardUpload() {
  const context = useContext(CardUploadContext);
  if (!context) {
    throw new Error('useCardUpload must be used within a CardUploadProvider');
  }
  return context;
}

interface CardUploadProviderProps {
  children: ReactNode;
}

export function CardUploadProvider({ children }: CardUploadProviderProps) {
  const [newCardType, setNewCardTypeState] = useState<CardType>(CardType.Weapon);
  const [newCardSubtype, setNewCardSubtypeState] = useState<string>('');
  const [newBuildPointCost, setNewBuildPointCostState] = useState<number>(0);
  const [newCrewPointCost, setNewCrewPointCostState] = useState<number>(0);
  const [newNumberAllowed, setNewNumberAllowedState] = useState<number>(1);
  const [newSource, setNewSourceState] = useState<string>('');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPreferences = localStorage.getItem(STORAGE_KEY);
        if (savedPreferences) {
          const parsedPreferences: CardUploadState = JSON.parse(savedPreferences);
          setNewCardTypeState(parsedPreferences.cardType);
          setNewCardSubtypeState(parsedPreferences.cardSubtype || '');
          setNewBuildPointCostState(parsedPreferences.buildPointCost || 0);
          setNewCrewPointCostState(parsedPreferences.crewPointCost || 0);
          setNewNumberAllowedState(parsedPreferences.numberAllowed || 1);
          setNewSourceState(parsedPreferences.source || '');
        }
      } catch (e) {
        console.error('Failed to load card upload preferences:', e);
      }
      setIsHydrated(true);
    }
  }, []);
  // Save the current state to local storage
  const savePreferences = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            cardType: newCardType,
            cardSubtype: newCardSubtype,
            buildPointCost: newBuildPointCost,
            crewPointCost: newCrewPointCost,
            numberAllowed: newNumberAllowed,
            source: newSource,
          })
        );
      } catch (e) {
        console.error('Failed to save card preferences:', e);
      }
    }
  };

  // Custom setters that persist changes to localStorage
  const setNewCardType = (type: CardType) => {
    setNewCardTypeState(type);
    savePreferences();
  };

  const setNewCardSubtype = (subtype: string) => {
    setNewCardSubtypeState(subtype);
    savePreferences();
  };

  const setNewBuildPointCost = (cost: number) => {
    setNewBuildPointCostState(cost);
    savePreferences();
  };

  const setNewCrewPointCost = (cost: number) => {
    setNewCrewPointCostState(cost);
    savePreferences();
  };

  const setNewNumberAllowed = (number: number) => {
    setNewNumberAllowedState(number);
    savePreferences();
  };

  const setNewSource = (source: string) => {
    setNewSourceState(source);
    savePreferences();
  };
  // Don't render children until hydration is complete to avoid hydration mismatch
  return (
    <CardUploadContext.Provider
      value={{
        newCardType,
        newCardSubtype,
        newBuildPointCost,
        newCrewPointCost,
        newNumberAllowed,
        newSource,
        setNewCardType,
        setNewCardSubtype,
        setNewBuildPointCost,
        setNewCrewPointCost,
        setNewNumberAllowed,
        setNewSource,
      }}
    >
      {isHydrated ? children : null}
    </CardUploadContext.Provider>
  );
}
