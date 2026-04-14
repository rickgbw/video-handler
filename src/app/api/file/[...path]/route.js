import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { resolveDataPath } from '@/lib/jobs';

export const runtime = 'nodejs';

const MIME = {
  '.mp4': 'video/mp4',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

export async function GET(_request, { params }) {
  try {
    const { path: parts } = await params;
    if (!Array.isArray(parts) || parts.length === 0) {
      return new Response('bad path', { status: 400 });
    }
    if (parts.some((p) => p.includes('..') || p.includes('\0') || p.includes('/'))) {
      return new Response('bad path', { status: 400 });
    }

    const filePath = resolveDataPath(parts);
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return new Response('not found', { status: 404 });

    const ext = path.extname(filePath).toLowerCase();
    const stream = Readable.toWeb(fs.createReadStream(filePath));
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': String(stat.size),
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (err) {
    if (err?.code === 'ENOENT') return new Response('not found', { status: 404 });
    return new Response('error', { status: 400 });
  }
}
