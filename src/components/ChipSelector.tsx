import { useState, useRef, useEffect } from 'react';

interface ChipSelectorProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  groupedOptions?: { [group: string]: { value: string; label: string }[] };
}

export function ChipSelector({
  label,
  options,
  selectedValues,
  onChange,
  groupedOptions,
}: ChipSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleOption = (value: string) => {
    const newSelected = [...selectedValues];
    const index = newSelected.indexOf(value);

    if (index === -1) {
      // Add value if not already selected
      newSelected.push(value);
    } else {
      // Remove value if already selected
      newSelected.splice(index, 1);
    }

    onChange(newSelected);
  };

  const removeChip = (value: string) => {
    onChange(selectedValues.filter(v => v !== value));
  };

  // Get label for a value
  const getLabelForValue = (value: string): string => {
    // First check in flat options
    const option = options.find(opt => opt.value === value);
    if (option) return option.label;

    // Then check in grouped options
    if (groupedOptions) {
      for (const group in groupedOptions) {
        const groupOption = groupedOptions[group].find(opt => opt.value === value);
        if (groupOption) return groupOption.label;
      }
    }

    return value; // Fallback to the value itself
  };

  return (
    <div className="w-full space-y-2">
      <label className="font-medium text-sm">{label}</label>

      {/* Selected chips display */}
      <div
        className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-700 border border-gray-600 rounded cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedValues.length === 0 && (
          <div className="text-gray-400 text-sm">Select {label}...</div>
        )}

        {selectedValues.map(value => (
          <div
            key={value}
            className="flex items-center bg-blue-600 text-white text-xs py-1 px-2 rounded-full"
          >
            <span>{getLabelForValue(value)}</span>
            <button
              className="ml-1 text-white hover:text-gray-200 focus:outline-none"
              onClick={e => {
                e.stopPropagation();
                removeChip(value);
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Dropdown options */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg w-64 max-h-64 overflow-auto"
        >
          {groupedOptions
            ? // Grouped options
              Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group}>
                  <div className="px-3 py-1 bg-gray-700 font-medium text-xs uppercase tracking-wide text-gray-300">
                    {group}
                  </div>
                  {groupOptions.map(option => (
                    <div
                      key={option.value}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-700 ${
                        selectedValues.includes(option.value) ? 'bg-gray-700 font-medium' : ''
                      }`}
                      onClick={() => toggleOption(option.value)}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${
                            selectedValues.includes(option.value)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-500'
                          }`}
                        >
                          {selectedValues.includes(option.value) && (
                            <svg viewBox="0 0 16 16" className="w-3 h-3 text-white">
                              <path
                                fill="currentColor"
                                d="M13.854 4.854a.5.5 0 0 1 0 .707l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.707L6.5 11.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm">{option.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            : // Flat options list
              options.map(option => (
                <div
                  key={option.value}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-700 ${
                    selectedValues.includes(option.value) ? 'bg-gray-700 font-medium' : ''
                  }`}
                  onClick={() => toggleOption(option.value)}
                >
                  <div className="flex items-center">
                    <div
                      className={`w-4 h-4 border rounded mr-2 flex items-center justify-center ${
                        selectedValues.includes(option.value)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-500'
                      }`}
                    >
                      {selectedValues.includes(option.value) && (
                        <svg viewBox="0 0 16 16" className="w-3 h-3 text-white">
                          <path
                            fill="currentColor"
                            d="M13.854 4.854a.5.5 0 0 1 0 .707l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.707L6.5 11.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{option.label}</span>
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
