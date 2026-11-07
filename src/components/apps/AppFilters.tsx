import {Search, X} from 'lucide-react';
import type {RiskLevel} from '../../types';
import {FilterChips} from '../ui/FilterChips';
import {IconButton} from '../ui/IconButton';

export type RiskFilter = 'All' | RiskLevel;

const FILTERS: RiskFilter[] = ['All', 'High', 'Medium', 'Safe'];

export function AppFilters({
  query,
  onQueryChange,
  riskFilter,
  onRiskFilterChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  riskFilter: RiskFilter;
  onRiskFilterChange: (value: RiskFilter) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        />
        <label className="sr-only" htmlFor="app-search">
          Search applications
        </label>
        <input
          id="app-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search applications..."
          autoComplete="off"
          className="w-full min-h-11 bg-surface border border-line rounded-cf-md pl-11 pr-11 text-sm text-fg placeholder:text-fg-muted transition-[border-color,box-shadow] duration-[var(--cf-duration-fast)] ease-[var(--cf-ease)] focus:border-line-focus [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <span className="absolute right-1 top-1/2 -translate-y-1/2">
            <IconButton label="Clear search" onClick={() => onQueryChange('')}>
              <X size={16} />
            </IconButton>
          </span>
        ) : null}
      </div>

      <FilterChips
        options={FILTERS}
        value={riskFilter}
        onChange={onRiskFilterChange}
        aria-label="Filter applications by risk"
      />
    </div>
  );
}
