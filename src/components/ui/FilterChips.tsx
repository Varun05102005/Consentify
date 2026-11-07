const CHIP_CLASS =
  'cf-press min-h-11 rounded-cf-md px-2 text-xs font-semibold border';

const CHIP_SELECTED = 'bg-brand text-fg-on-accent border-brand';
const CHIP_IDLE = 'bg-surface text-fg-secondary border-line hover:bg-canvas-subtle';

function gridClass(count: number): string {
  if (count === 5) {
    return 'grid grid-cols-6 gap-2';
  }
  if (count === 4) {
    return 'grid grid-cols-4 gap-2';
  }
  if (count === 3) {
    return 'grid grid-cols-3 gap-2';
  }
  return 'flex flex-wrap gap-2';
}

function spanClass(count: number, index: number): string {
  if (count === 5) {
    return index < 3 ? 'col-span-2' : 'col-span-3';
  }
  return '';
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
}) {
  const count = options.length;

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={gridClass(count)}>
      {options.map((option, index) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`${CHIP_CLASS} w-full text-center ${spanClass(count, index)} ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
