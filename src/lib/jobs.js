import path from 'node:path';
import fs from 'node:fs/promises';
import { nanoid } from 'nanoid';

const DATA_ROOT = path.resolve(process.cwd(), 'data');

export async function ensureDataDir() {
  await fs.mkdir(DATA_ROOT, { recursive: true });
}

export async function createJob() {
  await ensureDataDir();
  const jobId = nanoid(12);
  const jobDir = path.join(DATA_ROOT, jobId);
  await fs.mkdir(path.join(jobDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(jobDir, 'thumbs'), { recursive: true });
  return jobId;
}

export async function ensureJob(jobId) {
  const jobDir = jobPath(jobId);
  await fs.mkdir(path.join(jobDir, 'src'), { recursive: true });
  await fs.mkdir(path.join(jobDir, 'thumbs'), { recursive: true });
  return jobDir;
}

export function jobPath(jobId, ...segs) {
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(jobId)) {
    throw new Error('invalid jobId');
  }
  const resolved = path.resolve(DATA_ROOT, jobId, ...segs);
  if (!resolved.startsWith(DATA_ROOT + path.sep)) {
    throw new Error('path traversal rejected');
  }
  return resolved;
}

export function resolveDataPath(parts) {
  const joined = path.resolve(DATA_ROOT, ...parts);
  if (!joined.startsWith(DATA_ROOT + path.sep)) {
    throw new Error('path traversal rejected');
  }
  return joined;
}

export { DATA_ROOT };
