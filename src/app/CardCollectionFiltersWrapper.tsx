import React, { useEffect, useMemo, useState } from 'react';
import { CardCollectionFilters } from '@/components/CardCollectionFilters';
import { getUserPreferences, saveFilterPreferences } from '@/utils/userPreferences';

export function useCardCollectionFilters(cards: any[]) {
  // Filter states - default values will be replaced by user preferences
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterCardTypes, setFilterCardTypes] = useState<string[]>([]);
  const [filterSubtypes, setFilterSubtypes] = useState<string[]>([]);
  const [filterCardName, setFilterCardName] = useState<string>('');
  const [filterMinCost, setFilterMinCost] = useState<number>(0);
  const [filterMaxCost, setFilterMaxCost] = useState<number>(8);
  const [filterSources, setFilterSources] = useState<string[]>([]);

  useEffect(() => {
    const userPrefs = getUserPreferences();
    const { filterPreferences } = userPrefs;
    setFilterPanelOpen(filterPreferences.filterPanelOpen);
    setFilterCardTypes(filterPreferences.filterCardTypes);
    setFilterSubtypes(filterPreferences.filterSubtypes);
    setFilterCardName(filterPreferences.filterCardName);
    setFilterMinCost(filterPreferences.filterMinCost);
    setFilterMaxCost(filterPreferences.filterMaxCost);
    setFilterSources(filterPreferences.filterSources);
  }, []);

  // Custom setters that save preferences
  const updateFilterPanelOpen = (value: boolean) => {
    setFilterPanelOpen(value);
    saveFilterPreferences({ filterPanelOpen: value });
  };
  const updateFilterCardTypes = (value: string[]) => {
    setFilterCardTypes(value);
    saveFilterPreferences({ filterCardTypes: value });
  };
  const updateFilterSubtypes = (value: string[]) => {
    setFilterSubtypes(value);
    saveFilterPreferences({ filterSubtypes: value });
  };
  const updateFilterCardName = (value: string) => {
    setFilterCardName(value);
    saveFilterPreferences({ filterCardName: value });
  };
  const updateFilterMinCost = (value: number) => {
    setFilterMinCost(value);
    saveFilterPreferences({ filterMinCost: value });
  };
  const updateFilterMaxCost = (value: number) => {
    setFilterMaxCost(value);
    saveFilterPreferences({ filterMaxCost: value });
  };
  const updateFilterSources = (value: string[]) => {
    setFilterSources(value);
    saveFilterPreferences({ filterSources: value });
  };

  // Get unique subtypes organized by their corresponding card type
  const subtypesByCardType = useMemo(() => {
    const subtypeToCardTypeMap: Record<string, string> = {};
    const result: Record<string, string[]> = {
      Weapon: [],
      Upgrade: [],
      Accessory: [],
      Structure: [],
      Crew: [],
      Gear: [],
      Sidearm: [],
    };
    cards.forEach(card => {
      if (card.subtype && card.subtype.trim() !== '' && card.type) {
        if (!subtypeToCardTypeMap[card.subtype]) {
          subtypeToCardTypeMap[card.subtype] = card.type;
        }
      }
    });
    Object.entries(subtypeToCardTypeMap).forEach(([subtype, cardType]) => {
      if (!result[cardType].includes(subtype)) {
        result[cardType].push(subtype);
      }
    });
    Object.keys(result).forEach(type => {
      result[type].sort();
    });
    return result;
  }, [cards]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    cards.forEach(card => {
      if (card.source && card.source.trim() !== '') {
        sources.add(card.source);
      }
    });
    return Array.from(sources).sort();
  }, [cards]);

  // Filter cards based on filter criteria
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (filterCardTypes.length > 0 && !filterCardTypes.includes(card.type)) {
        return false;
      }
      if (filterSubtypes.length > 0 && (!card.subtype || !filterSubtypes.includes(card.subtype))) {
        return false;
      }
      if (
        filterCardName.trim() !== '' &&
        (!card.name || !card.name.toLowerCase().includes(filterCardName.toLowerCase()))
      ) {
        return false;
      }
      const effectiveCost = Math.max(
        card.buildPointCost !== undefined ? card.buildPointCost : 0,
        card.crewPointCost !== undefined ? card.crewPointCost : 0
      );
      if (effectiveCost < filterMinCost || effectiveCost > filterMaxCost) {
        return false;
      }
      if (filterSources.length > 0 && (!card.source || !filterSources.includes(card.source))) {
        return false;
      }
      return true;
    });
  }, [
    cards,
    filterCardTypes,
    filterSubtypes,
    filterCardName,
    filterMinCost,
    filterMaxCost,
    filterSources,
  ]);

  const resetFilters = () => {
    updateFilterCardTypes([]);
    updateFilterSubtypes([]);
    updateFilterCardName('');
    updateFilterMinCost(0);
    updateFilterMaxCost(8);
    updateFilterSources([]);
  };

  return {
    filterPanelOpen,
    updateFilterPanelOpen,
    filterCardTypes,
    updateFilterCardTypes,
    filterSubtypes,
    updateFilterSubtypes,
    filterCardName,
    updateFilterCardName,
    filterMinCost,
    updateFilterMinCost,
    filterMaxCost,
    updateFilterMaxCost,
    filterSources,
    updateFilterSources,
    resetFilters,
    filteredCards,
    filteredCardsCount: filteredCards.length,
    totalCardsCount: cards.length,
    subtypesByCardType,
    uniqueSources,
  };
}

export function CardCollectionFiltersWrapper({ cards }: { cards: any[] }) {
  const filterProps = useCardCollectionFilters(cards);
  return <CardCollectionFilters {...filterProps} />;
}
