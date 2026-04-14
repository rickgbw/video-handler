import { renderVideo } from '@/lib/ffmpeg';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      jobId,
      frames,
      timingMode = 'uniform',
      uniformDuration = 2,
      fps = 24,
      crossfade = { enabled: false, duration: 0.5 },
      aspect = { w: 9, h: 16 },
    } = body || {};

    if (!jobId || !Array.isArray(frames) || frames.length === 0) {
      return Response.json({ error: 'missing jobId or frames' }, { status: 400 });
    }
    if (!['uniform', 'per-image', 'fps'].includes(timingMode)) {
      return Response.json({ error: 'bad timingMode' }, { status: 400 });
    }

    const effectiveCrossfade =
      timingMode === 'fps' ? { enabled: false, duration: 0 } : {
        enabled: Boolean(crossfade.enabled),
        duration: Math.max(0.05, Math.min(5, Number(crossfade.duration) || 0.5)),
      };

    const safeFrames = frames.map((f) => ({
      id: String(f.id),
      duration: Math.max(0.05, Math.min(60, Number(f.duration) || uniformDuration)),
    }));

    const safeAspect = {
      w: Math.max(1, Math.min(100, Number(aspect?.w) || 9)),
      h: Math.max(1, Math.min(100, Number(aspect?.h) || 16)),
    };

    await renderVideo({
      jobId,
      frames: safeFrames,
      timingMode,
      uniformDuration: Math.max(0.05, Math.min(60, Number(uniformDuration) || 2)),
      fps: Math.max(1, Math.min(60, Number(fps) || 24)),
      crossfade: effectiveCrossfade,
      aspect: safeAspect,
    });

    const videoUrl = `/api/file/${jobId}/out.mp4?t=${Date.now()}`;
    return Response.json({ videoUrl });
  } catch (err) {
    console.error('[render]', err);
    return Response.json({ error: err.message || 'render failed' }, { status: 500 });
  }
}
