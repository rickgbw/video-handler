'use client';

import { useEffect, useRef, useState } from 'react';
import Dropzone from '@/components/Dropzone';
import AspectControls from '@/components/AspectControls';
import TimingControls from '@/components/TimingControls';
import FrameGrid from '@/components/FrameGrid';
import VideoPlayer from '@/components/VideoPlayer';
import GifPanel from '@/components/GifPanel';
import { renderVideo, renderGif, getFfmpeg } from '@/lib/ffmpegClient';

const DEFAULT_DURATION = 2;

let uid = 0;
const nextId = () => `f${Date.now().toString(36)}${(uid++).toString(36)}`;

function loadDims(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export default function Page() {
  const [frames, setFrames] = useState([]);
  const [timingMode, setTimingMode] = useState('uniform');
  const [uniformDuration, setUniformDuration] = useState(DEFAULT_DURATION);
  const [fps, setFps] = useState(24);
  const [crossfade, setCrossfade] = useState({ enabled: false, duration: 0.5 });
  const [aspect, setAspect] = useState({ w: 9, h: 16 });
  const [videoUrl, setVideoUrl] = useState(null);
  const [gifUrl, setGifUrl] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const logBuf = useRef([]);

  useEffect(() => {
    // Revoke object URLs on unmount
    return () => {
      for (const f of frames) URL.revokeObjectURL(f.previewUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (gifUrl) URL.revokeObjectURL(gifUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files) {
    setError(null);
    const added = [];
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      const { width, height } = await loadDims(previewUrl);
      added.push({
        id: nextId(),
        file,
        previewUrl,
        originalName: file.name,
        width,
        height,
        duration: uniformDuration,
      });
    }
    setFrames((prev) => [...prev, ...added]);
  }

  function removeFrame(id) {
    setFrames((prev) => {
      const victim = prev.find((f) => f.id === id);
      if (victim) URL.revokeObjectURL(victim.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function updateDuration(id, duration) {
    setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, duration } : f)));
  }

  function onLog(message) {
    logBuf.current.push(message);
    if (logBuf.current.length > 200) logBuf.current.shift();
    // Surface the last significant line as progress text
    if (/frame=|time=|Output #|Stream #/.test(message)) {
      setProgress(message.slice(0, 140));
    }
  }

  async function handleRenderVideo() {
    if (frames.length === 0) return;
    setStatus('rendering');
    setProgress('Loading ffmpeg…');
    setError(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setVideoUrl(null);
    setGifUrl(null);
    try {
      const { url } = await renderVideo(
        { frames, timingMode, uniformDuration, fps, crossfade, aspect },
        onLog,
      );
      setVideoUrl(url);
      setProgress('');
      setStatus('done');
    } catch (err) {
      console.error(err);
      setError(err.message || 'render failed');
      setStatus('idle');
      setProgress('');
    }
  }

  async function handleRenderGif(width, gifFps) {
    setStatus('rendering-gif');
    setProgress('Rendering GIF…');
    setError(null);
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    setGifUrl(null);
    try {
      const { url } = await renderGif({ width, fps: gifFps }, onLog);
      setGifUrl(url);
      setProgress('');
      setStatus('done');
      return url;
    } catch (err) {
      console.error(err);
      setError(err.message || 'gif failed');
      setStatus('idle');
      setProgress('');
      throw err;
    }
  }

  const canRender = frames.length >= 1 && status === 'idle';
  const busy = status === 'rendering' || status === 'rendering-gif';

  // Preload ffmpeg on first interaction so first render isn't as slow
  function warmFfmpeg() {
    getFfmpeg(onLog).catch(() => {});
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Image → Video</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Upload images, arrange them, encode a video in your browser. Nothing leaves your device.
            </p>
          </div>
        </header>

        <div onMouseEnter={warmFfmpeg}>
          <Dropzone onFiles={handleFiles} disabled={busy} />
        </div>

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
            onClick={handleRenderVideo}
            disabled={!canRender}
            className="rounded-md bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {status === 'rendering' ? 'Rendering…' : 'Generate Video'}
          </button>
          {busy && progress && (
            <span className="text-xs text-neutral-500 font-mono truncate max-w-md">
              {progress}
            </span>
          )}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>

        {videoUrl && (
          <section className="flex flex-col md:flex-row items-start gap-6 pt-2">
            <VideoPlayer videoUrl={videoUrl} aspect={aspect} />
            <GifPanel
              gifUrl={gifUrl}
              aspect={aspect}
              renderGif={handleRenderGif}
              disabled={busy}
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
          Everything runs locally via ffmpeg.wasm — your images never leave the browser.
        </footer>
      </div>
    </main>
  );
}
