import {FilterChips} from '../ui/FilterChips';

export type AlertFilter = 'All' | 'Open' | 'High' | 'Medium' | 'Resolved';

const FILTERS: AlertFilter[] = ['All', 'Open', 'High', 'Medium', 'Resolved'];

export function AlertFilters({
  value,
  onChange,
}: {
  value: AlertFilter;
  onChange: (value: AlertFilter) => void;
}) {
  return (
    <FilterChips
      options={FILTERS}
      value={value}
      onChange={onChange}
      aria-label="Filter alerts"
    />
  );
}
