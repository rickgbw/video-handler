'use client';

import ToggleGroup from './ToggleGroup';

export default function TimingControls({
  timingMode,
  setTimingMode,
  uniformDuration,
  setUniformDuration,
  fps,
  setFps,
  crossfade,
  setCrossfade,
}) {
  const fpsMode = timingMode === 'fps';
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-neutral-400">Timing:</span>
        <ToggleGroup
          value={timingMode}
          onChange={setTimingMode}
          options={[
            { value: 'uniform', label: 'Uniform' },
            { value: 'per-image', label: 'Per-image' },
            { value: 'fps', label: 'FPS' },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {timingMode === 'uniform' && (
          <Field label="Seconds per frame">
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={uniformDuration}
              onChange={(e) => setUniformDuration(Number(e.target.value))}
            />
          </Field>
        )}
        {timingMode === 'per-image' && (
          <div className="text-sm text-neutral-400">
            Set a per-frame duration on each thumbnail below. The value above applies to newly
            uploaded frames.
            <div className="mt-2 max-w-[200px]">
              <Field label="Default (s)">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={uniformDuration}
                  onChange={(e) => setUniformDuration(Number(e.target.value))}
                />
              </Field>
            </div>
          </div>
        )}
        {timingMode === 'fps' && (
          <Field label="Frames per second">
            <input
              type="number"
              step="1"
              min="1"
              max="60"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
            />
          </Field>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-neutral-800">
        <label className={'flex items-center gap-2 text-sm ' + (fpsMode ? 'opacity-50' : '')}>
          <input
            type="checkbox"
            checked={crossfade.enabled && !fpsMode}
            disabled={fpsMode}
            onChange={(e) => setCrossfade({ ...crossfade, enabled: e.target.checked })}
            className="h-4 w-4 accent-indigo-500"
          />
          <span>Crossfade</span>
        </label>
        <Field label="Fade duration (s)" disabled={!crossfade.enabled || fpsMode}>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="5"
            value={crossfade.duration}
            disabled={!crossfade.enabled || fpsMode}
            onChange={(e) => setCrossfade({ ...crossfade, duration: Number(e.target.value) })}
          />
        </Field>
        {fpsMode && (
          <span className="text-xs text-neutral-500">
            Crossfade disabled in FPS mode
          </span>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, disabled }) {
  return (
    <label className={'block text-xs uppercase tracking-wide text-neutral-400 ' + (disabled ? 'opacity-50' : '')}>
      <div className="mb-1">{label}</div>
      <div className="w-32">{children}</div>
    </label>
  );
}
