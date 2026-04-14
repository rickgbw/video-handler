'use client';

export default function ToggleGroup({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              'px-3 py-1.5 text-sm rounded-md transition-colors ' +
              (active
                ? 'bg-indigo-500 text-white'
                : 'text-neutral-300 hover:bg-neutral-800')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
