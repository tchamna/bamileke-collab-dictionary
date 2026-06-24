'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  options: readonly SearchableSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  icon?: ReactNode;
};

export function SearchableSelect({ value, options, onChange, ariaLabel, placeholder = 'Search...', className = '', icon }: SearchableSelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = options.find((option) => option.value === value);
  const displayValue = isOpen ? query : selectedOption?.label ?? value;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  function open() {
    setQuery('');
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.select(), 0);
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#657263]">{icon}</span> : null}
        <input
          ref={inputRef}
          value={displayValue}
          onFocus={open}
          onClick={open}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
            if (event.key === 'Enter' && filteredOptions[0]) {
              event.preventDefault();
              selectOption(filteredOptions[0].value);
            }
          }}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-controls={`${ariaLabel.replace(/\s+/g, '-').toLowerCase()}-options`}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-[#c4bba8] bg-white pr-10 text-base font-semibold text-[#20231f] shadow-sm outline-none transition focus:border-[#2f6b58] focus:ring-4 focus:ring-[#2f6b58]/10 ${
            icon ? 'pl-12' : 'pl-4'
          } h-full min-h-11`}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687064]" />
      </div>
      {isOpen ? (
        <div
          id={`${ariaLabel.replace(/\s+/g, '-').toLowerCase()}-options`}
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border border-[#d8d0bd] bg-white shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-[#ece6d8] bg-[#fbfaf6] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#687064]">
            <Search className="h-3.5 w-3.5" />
            Type to filter
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold ${
                      isSelected ? 'bg-[#e8efe8] text-[#295f4e]' : 'text-[#30372f] hover:bg-[#f4f3ed]'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-4 text-sm font-medium text-[#687064]">No matches</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
