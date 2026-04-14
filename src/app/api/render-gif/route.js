import fs from 'node:fs/promises';
import { renderGif } from '@/lib/ffmpeg';
import { jobPath } from '@/lib/jobs';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    const body = await request.json();
    const jobId = body?.jobId;
    const width = Math.max(120, Math.min(1080, Number(body?.width) || 540));
    const fps = Math.max(5, Math.min(30, Number(body?.fps) || 15));

    if (!jobId) {
      return Response.json({ error: 'missing jobId' }, { status: 400 });
    }
    const videoPath = jobPath(jobId, 'out.mp4');
    try {
      await fs.access(videoPath);
    } catch {
      return Response.json({ error: 'video not rendered yet' }, { status: 400 });
    }

    await renderGif({ jobId, width, fps });
    const gifUrl = `/api/file/${jobId}/out.gif?t=${Date.now()}`;
    return Response.json({ gifUrl });
  } catch (err) {
    console.error('[render-gif]', err);
    return Response.json({ error: err.message || 'gif render failed' }, { status: 500 });
  }
}
