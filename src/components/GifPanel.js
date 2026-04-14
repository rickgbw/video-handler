'use client';

import { useState } from 'react';

export default function GifPanel({ renderGif, onGenerated, gifUrl, aspect = { w: 9, h: 16 }, disabled }) {
  const [width, setWidth] = useState(540);
  const [fps, setFps] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const url = await renderGif(width, fps);
      if (onGenerated) onGenerated(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3 w-full max-w-[360px]">
      <div className="text-sm font-medium text-neutral-200">GIF export</div>
      <div className="flex gap-3">
        <label className="block text-xs uppercase tracking-wide text-neutral-400 flex-1">
          <div className="mb-1">Width (px)</div>
          <input
            type="number"
            min="120"
            max="1080"
            step="10"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-neutral-400 flex-1">
          <div className="mb-1">FPS</div>
          <input
            type="number"
            min="5"
            max="30"
            step="1"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={loading || disabled}
        className="w-full rounded-md bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Rendering GIF…' : gifUrl ? 'Regenerate GIF' : 'Generate GIF'}
      </button>
      {error && <div className="text-xs text-red-400">{error}</div>}

      {gifUrl && (
        <div className="pt-3 border-t border-neutral-800 space-y-2">
          <div
            className="rounded-md overflow-hidden bg-black border border-neutral-800"
            style={{ aspectRatio: `${aspect.w} / ${aspect.h}` }}
          >
            <img
              key={gifUrl}
              src={gifUrl}
              alt="GIF preview"
              className="w-full h-full object-contain"
            />
          </div>
          <a
            href={gifUrl}
            download="video.gif"
            className="block text-center rounded-md bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-sm font-medium"
          >
            Download .gif
          </a>
        </div>
      )}
    </div>
  );
}
