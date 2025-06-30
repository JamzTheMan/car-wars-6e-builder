import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faChevronUp, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { ChipSelector } from '@/components/ChipSelector';
import { CardTypeCategories } from '@/types/types';

interface CardCollectionFiltersProps {
  filterPanelOpen: boolean;
  updateFilterPanelOpen: (value: boolean) => void;
  filterCardTypes: string[];
  updateFilterCardTypes: (value: string[]) => void;
  filterSubtypes: string[];
  updateFilterSubtypes: (value: string[]) => void;
  filterCardName: string;
  updateFilterCardName: (value: string) => void;
  filterMinCost: number;
  updateFilterMinCost: (value: number) => void;
  filterMaxCost: number;
  updateFilterMaxCost: (value: number) => void;
  filterSources: string[];
  updateFilterSources: (value: string[]) => void;
  resetFilters: () => void;
  filteredCardsCount: number;
  totalCardsCount: number;
  subtypesByCardType: Record<string, string[]>;
  uniqueSources: string[];
}

export const CardCollectionFilters: React.FC<CardCollectionFiltersProps> = ({
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
  filteredCardsCount,
  totalCardsCount,
  subtypesByCardType,
  uniqueSources,
}) => {
  return (
    <div className="p-2 -mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => updateFilterPanelOpen(!filterPanelOpen)}
            className="flex items-center text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            <FontAwesomeIcon
              icon={filterPanelOpen ? faChevronUp : faFilter}
              className="mr-2 h-3 w-3"
            />
            {filterPanelOpen ? 'Hide Filters' : 'Filter Cards'}
            {(filterCardTypes.length > 0 ||
              filterSubtypes.length > 0 ||
              filterSources.length > 0) && (
              <span className="ml-2 bg-blue-600 px-1.5 py-0.5 rounded-full text-xs">Active</span>
            )}
          </button>
        </div>

        <div className="flex items-center">
          {(filterCardTypes.length > 0 ||
            filterSubtypes.length > 0 ||
            filterCardName.trim() !== '' ||
            filterSources.length > 0 ||
            filterMinCost !== 0 ||
            filterMaxCost !== 8) && (
            <>
              <span className="text-gray-400 mr-2">
                {filteredCardsCount} of {totalCardsCount} cards
              </span>
              <button
                onClick={resetFilters}
                className="text-gray-400 hover:text-red-600"
                title="Clear all filters"
                aria-label="Clear all filters"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {filterPanelOpen && (
        <div className="flex flex-col space-y-3 p-3 bg-gray-800 rounded border border-gray-700 mb-3">
          <p className="text-xs text-gray-400 mb-2">
            <span className="font-medium">Tip:</span> Click the filters to open dropdowns, select
            options, and click the × on chips to remove selections.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Card Type Filter - Chip Selector */}
            <div className="relative">
              <ChipSelector
                label="Card Type"
                selectedValues={filterCardTypes}
                onChange={updateFilterCardTypes}
                options={[]}
                groupedOptions={{
                  'Build Point Cards': Object.entries(CardTypeCategories)
                    .filter(([_, category]) => category === 'BuildPoints')
                    .map(([type]) => ({ value: type, label: type })),
                  'Crew Point Cards': Object.entries(CardTypeCategories)
                    .filter(([_, category]) => category === 'CrewPoints')
                    .map(([type]) => ({ value: type, label: type })),
                }}
              />
            </div>
            {/* Subtype Filter - Chip Selector */}
            <div className="relative">
              <ChipSelector
                label="Subtype"
                selectedValues={filterSubtypes}
                onChange={updateFilterSubtypes}
                options={[]}
                groupedOptions={Object.entries(subtypesByCardType).reduce(
                  (acc, [type, subtypes]) => {
                    if (subtypes.length === 0) return acc;
                    acc[`${type} Subtypes`] = subtypes.map(subtype => ({
                      value: subtype,
                      label: subtype,
                    }));
                    return acc;
                  },
                  {} as Record<string, { value: string; label: string }[]>
                )}
              />
            </div>
            {/* Source Filter - Chip Selector */}
            <div className="relative">
              <ChipSelector
                label="Source"
                selectedValues={filterSources}
                onChange={updateFilterSources}
                options={uniqueSources.map(source => ({
                  value: source,
                  label: source,
                }))}
              />
            </div>
            {/* Card Name and Cost Filter on same line */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col md:flex-row md:space-x-4">
              {/* Card Name Filter - Text Input */}
              <div className="flex-1 w-full md:w-1/2 mb-3 md:mb-0">
                <label className="font-medium text-sm mb-1 block">Card Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by card name..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filterCardName}
                    onChange={e => updateFilterCardName(e.target.value)}
                  />
                  {filterCardName && (
                    <button
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => updateFilterCardName('')}
                      aria-label="Clear card name filter"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Cost Filter (Build or Crew Point Cost) - Dual Range Slider */}
              <div className="flex-1 w-full md:w-1/2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-sm">Cost Range</label>
                </div>

                <div className="mt-2 px-1 opacity-100">
                  <div className="flex justify-between mb-1 text-xs text-gray-400">
                    <div className="flex items-center">
                      <span className="w-4 text-center">{filterMinCost}</span>
                      <span className="ml-1">BP/CP</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-4 text-center">{filterMaxCost}</span>
                      <span className="ml-1">BP/CP</span>
                    </div>
                  </div>

                  <div className="relative h-7">
                    {/* Min Cost Slider */}
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      value={filterMinCost}
                      onChange={e => {
                        const value = Number(e.target.value);
                        updateFilterMinCost(Math.min(value, filterMaxCost));
                      }}
                      className="absolute w-full bg-gray-700 h-2 rounded-lg appearance-none cursor-pointer"
                      id="min-cost-range"
                      aria-label="Minimum cost filter"
                      title="Minimum cost filter"
                    />

                    {/* Max Cost Slider */}
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="1"
                      value={filterMaxCost}
                      onChange={e => {
                        const value = Number(e.target.value);
                        updateFilterMaxCost(Math.max(value, filterMinCost));
                      }}
                      className="absolute w-full bg-transparent h-2 rounded-lg appearance-none cursor-pointer"
                      id="max-cost-range"
                      aria-label="Maximum cost filter"
                      title="Maximum cost filter"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
