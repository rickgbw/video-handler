'use client';

import { useState } from 'react';
import Dropzone from '@/components/Dropzone';
import AspectControls from '@/components/AspectControls';
import TimingControls from '@/components/TimingControls';
import FrameGrid from '@/components/FrameGrid';
import VideoPlayer from '@/components/VideoPlayer';
import GifPanel from '@/components/GifPanel';

const DEFAULT_DURATION = 2;

export default function Page() {
  const [jobId, setJobId] = useState(null);
  const [frames, setFrames] = useState([]);
  const [timingMode, setTimingMode] = useState('uniform');
  const [uniformDuration, setUniformDuration] = useState(DEFAULT_DURATION);
  const [fps, setFps] = useState(24);
  const [crossfade, setCrossfade] = useState({ enabled: false, duration: 0.5 });
  const [aspect, setAspect] = useState({ w: 9, h: 16 });
  const [videoUrl, setVideoUrl] = useState(null);
  const [gifUrl, setGifUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  async function handleFiles(files) {
    setStatus('uploading');
    setError(null);
    try {
      const form = new FormData();
      if (jobId) form.append('jobId', jobId);
      for (const f of files) form.append('file', f);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'upload failed');
      setJobId(data.jobId);
      const withDur = data.frames.map((f) => ({ ...f, duration: uniformDuration }));
      setFrames((prev) => [...prev, ...withDur]);
      setStatus('idle');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  function removeFrame(id) {
    setFrames((prev) => prev.filter((f) => f.id !== id));
  }

  function updateDuration(id, duration) {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, duration } : f)));
  }

  async function renderVideo() {
    if (!jobId || frames.length === 0) return;
    setStatus('rendering');
    setError(null);
    setGifUrl(null);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          frames: frames.map((f) => ({ id: f.id, duration: f.duration })),
          timingMode,
          uniformDuration,
          fps,
          crossfade,
          aspect,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'render failed');
      setVideoUrl(data.videoUrl);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  const canRender = frames.length >= 1 && status !== 'rendering' && status !== 'uploading';
  const busy = status === 'rendering' || status === 'uploading';

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Image → Video (9:16)</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Upload images, arrange them, and encode a vertical video. Optional GIF export.
            </p>
          </div>
          {jobId && (
            <div className="text-xs text-neutral-500 font-mono">job {jobId}</div>
          )}
        </header>

        <Dropzone onFiles={handleFiles} disabled={busy} />

        <AspectControls aspect={aspect} setAspect={setAspect} />

        <TimingControls
          timingMode={timingMode}
          setTimingMode={setTimingMode}
          uniformDuration={uniformDuration}
          setUniformDuration={setUniformDuration}
          fps={fps}
          setFps={setFps}
          crossfade={crossfade}
          setCrossfade={setCrossfade}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={renderVideo}
            disabled={!canRender}
            className="rounded-md bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {status === 'rendering' ? 'Rendering…' : 'Generate Video'}
          </button>
          {status === 'uploading' && (
            <span className="text-sm text-neutral-400">Uploading…</span>
          )}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>

        {videoUrl && (
          <section className="flex flex-col md:flex-row items-start gap-6 pt-2">
            <VideoPlayer videoUrl={videoUrl} aspect={aspect} />
            <GifPanel
              jobId={jobId}
              gifUrl={gifUrl}
              aspect={aspect}
              onGenerated={(url) => setGifUrl(url)}
            />
          </section>
        )}

        <section className="space-y-3 pt-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-medium">Frames</h2>
            <span className="text-sm text-neutral-500">({frames.length})</span>
          </div>
          <FrameGrid
            frames={frames}
            setFrames={setFrames}
            showDuration={timingMode === 'per-image'}
            aspect={aspect}
            onRemove={removeFrame}
            onDurationChange={updateDuration}
          />
        </section>

        <footer className="pt-8 pb-4 text-xs text-neutral-600 border-t border-neutral-900">
          Output 1080×1920 H.264 · GIF via palettegen/paletteuse.
        </footer>
      </div>
    </main>
  );
}
