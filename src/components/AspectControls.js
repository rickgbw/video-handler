'use client';

import { ASPECT_PRESETS, deriveDimensions, matchPreset } from '@/lib/aspect';

export default function AspectControls({ aspect, setAspect }) {
  const activeKey = matchPreset(aspect.w, aspect.h);
  const { width, height } = deriveDimensions(aspect.w, aspect.h);

  function pickPreset(preset) {
    setAspect({ w: preset.w, h: preset.h });
  }

  const isCustom = activeKey === 'custom';

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-400 mr-1">Aspect:</span>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_PRESETS.map((p) => {
            const active = p.key === activeKey;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => pickPreset(p)}
                className={
                  'flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border transition-colors ' +
                  (active
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800')
                }
              >
                <RatioIcon w={p.w} h={p.h} active={active} />
                <span>{p.label}</span>
              </button>
            );
          })}
          <span
            className={
              'px-2.5 py-1.5 text-xs rounded-md border transition-colors ' +
              (isCustom
                ? 'bg-indigo-500 border-indigo-500 text-white'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500')
            }
            title="Edit the width/height fields below to use a custom ratio"
          >
            Custom
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 pt-1">
        <Field label="Width ratio" className="w-24">
          <input
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={aspect.w}
            onChange={(e) => setAspect({ ...aspect, w: Number(e.target.value) || 1 })}
          />
        </Field>
        <span className="pb-1.5 text-neutral-500">×</span>
        <Field label="Height ratio" className="w-24">
          <input
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={aspect.h}
            onChange={(e) => setAspect({ ...aspect, h: Number(e.target.value) || 1 })}
          />
        </Field>
        <div className="pb-1 text-xs text-neutral-500 ml-2">
          Output: <span className="text-neutral-300 font-mono">{width}×{height}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, className, children }) {
  return (
    <label className="block text-xs uppercase tracking-wide text-neutral-400">
      <div className="mb-1">{label}</div>
      <div className={className}>{children}</div>
    </label>
  );
}

function RatioIcon({ w, h, active }) {
  const maxDim = 14;
  const rw = w >= h ? maxDim : Math.round((maxDim * w) / h);
  const rh = h >= w ? maxDim : Math.round((maxDim * h) / w);
  return (
    <span
      aria-hidden
      className={
        'inline-block rounded-[2px] border ' +
        (active ? 'bg-white/20 border-white/40' : 'bg-neutral-700 border-neutral-600')
      }
      style={{ width: `${rw}px`, height: `${rh}px` }}
    />
  );
}
