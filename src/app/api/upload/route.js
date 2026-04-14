import path from 'node:path';
import fs from 'node:fs/promises';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { createJob, ensureJob, jobPath } from '@/lib/jobs';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

function extFor(mime, fallback) {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    case 'image/avif': return 'avif';
    default: return fallback || 'bin';
  }
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const files = form.getAll('file').filter((f) => typeof f === 'object' && 'arrayBuffer' in f);
    if (files.length === 0) {
      return Response.json({ error: 'no files' }, { status: 400 });
    }

    let jobId = form.get('jobId');
    if (typeof jobId !== 'string' || !jobId) {
      jobId = await createJob();
    } else {
      await ensureJob(jobId);
    }

    const out = [];
    for (const file of files) {
      if (!ACCEPTED.has(file.type)) continue;
      const id = nanoid(10);
      const ext = extFor(file.type, path.extname(file.name).replace('.', '') || 'bin');
      const srcPath = jobPath(jobId, 'src', `${id}.${ext}`);
      const thumbPath = jobPath(jobId, 'thumbs', `${id}.jpg`);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(srcPath, buf);

      const image = sharp(buf, { failOn: 'none' });
      const meta = await image.metadata();
      await sharp(buf, { failOn: 'none' })
        .resize({
          width: 400,
          height: 400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);

      out.push({
        id,
        originalName: file.name,
        width: meta.width || 0,
        height: meta.height || 0,
        thumbUrl: `/api/file/${jobId}/thumbs/${id}.jpg`,
        srcUrl: `/api/file/${jobId}/src/${id}.${ext}`,
      });
    }

    if (out.length === 0) {
      return Response.json({ error: 'no valid images' }, { status: 400 });
    }

    return Response.json({ jobId, frames: out });
  } catch (err) {
    console.error('[upload]', err);
    return Response.json({ error: err.message || 'upload failed' }, { status: 500 });
  }
}
