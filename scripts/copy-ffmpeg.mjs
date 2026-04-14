// Copies ffmpeg.wasm ESM assets from node_modules into public/ffmpeg so the
// browser can load them same-origin (avoids cross-origin Worker + CORP issues).
// Run on postinstall and prebuild so both `npm install` and Vercel builds populate it.
import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd());
const publicDir = path.join(root, 'public', 'ffmpeg');

const targets = [
  {
    from: path.join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'esm'),
    to: path.join(publicDir, 'ffmpeg'),
  },
  {
    from: path.join(root, 'node_modules', '@ffmpeg', 'util', 'dist', 'esm'),
    to: path.join(publicDir, 'util'),
  },
  {
    from: path.join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm'),
    to: path.join(publicDir, 'core'),
  },
];

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

for (const { from, to } of targets) {
  await cp(from, to, { recursive: true });
  // Strip .d.ts and .map files from the public copy — they aren't needed
  // at runtime and bloat the deploy.
  const entries = await readdir(to, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && (e.name.endsWith('.d.ts') || e.name.endsWith('.map') || e.name.endsWith('.d.mts'))) {
      await rm(path.join(to, e.name));
    }
  }
}

console.log(`[copy-ffmpeg] populated ${publicDir}`);
