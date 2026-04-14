'use client';

import { deriveDimensions } from './aspect';

// Self-hosted ffmpeg.wasm assets. Files are copied into /public/ffmpeg/ at install time
// so everything is same-origin — avoids cross-origin Worker restrictions and lets this
// deploy to any static host (Vercel, Netlify, GitHub Pages) with no special headers.
// The dynamic imports are written as absolute URLs + webpackIgnore so Turbopack doesn't
// try to statically analyze @ffmpeg/ffmpeg's internal dynamic imports at build time.
const FFMPEG_ESM = '/ffmpeg/ffmpeg/index.js';
const UTIL_ESM = '/ffmpeg/util/index.js';
const CORE_BASE = '/ffmpeg/core';

const OUT_FPS = 30;

let ffmpegInstance = null;
let loadPromise = null;

export async function getFfmpeg(onLog) {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import(/* webpackIgnore: true */ FFMPEG_ESM),
      import(/* webpackIgnore: true */ UTIL_ESM),
    ]);

    const ff = new FFmpeg();
    if (onLog) {
      ff.on('log', ({ message }) => onLog(message));
    }
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegInstance = ff;
    return ff;
  })();

  return loadPromise;
}

function extFor(mime) {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    case 'image/avif': return 'avif';
    default: return 'bin';
  }
}

async function clearMemfs(ff) {
  try {
    const entries = await ff.listDir('/');
    for (const e of entries) {
      if (e.name === '.' || e.name === '..') continue;
      if (e.isDir) continue;
      try { await ff.deleteFile('/' + e.name); } catch {}
    }
  } catch {}
}

function scalePad(label, { width, height, fps = OUT_FPS }) {
  const fpsClause = fps ? `fps=${fps},` : '';
  return (
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
    `setsar=1,${fpsClause}format=yuv420p[${label}]`
  );
}

async function writeInputs(ff, frames) {
  const names = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const ext = extFor(f.file.type);
    const name = `in_${i}.${ext}`;
    const buf = new Uint8Array(await f.file.arrayBuffer());
    await ff.writeFile(name, buf);
    names.push(name);
  }
  return names;
}

async function writeConcatList(ff, frames, names, perFrameDuration) {
  const lines = ['ffconcat version 1.0'];
  for (let i = 0; i < frames.length; i++) {
    lines.push(`file '${names[i]}'`);
    const d = perFrameDuration != null ? perFrameDuration : Number(frames[i].duration) || 1;
    lines.push(`duration ${d.toFixed(4)}`);
  }
  // concat demuxer quirk: last file needs to be repeated without duration
  lines.push(`file '${names[names.length - 1]}'`);
  await ff.writeFile('concat.txt', new TextEncoder().encode(lines.join('\n') + '\n'));
}

async function runCrossfade(ff, frames, names, { width, height, crossfade }) {
  const args = [];
  for (let i = 0; i < frames.length; i++) {
    args.push('-loop', '1', '-t', Number(frames[i].duration).toFixed(3), '-i', names[i]);
  }

  const filters = [];
  for (let i = 0; i < frames.length; i++) {
    filters.push(`[${i}:v]${scalePad(`v${i}`, { width, height })}`);
  }

  const xd = crossfade.duration;
  let prev = 'v0';
  let cum = Number(frames[0].duration);
  for (let i = 1; i < frames.length; i++) {
    const offset = Math.max(0, cum - xd);
    const out = i === frames.length - 1 ? 'vout' : `xf${i}`;
    filters.push(
      `[${prev}][v${i}]xfade=transition=fade:duration=${xd.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`,
    );
    cum = cum + Number(frames[i].duration) - xd;
    prev = out;
  }

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'ultrafast',
    '-crf', '22',
    '-movflags', '+faststart',
    '-y', 'out.mp4',
  );
  await ff.exec(args);
}

async function runConcatDemuxer(ff, { width, height, forceFps }) {
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-filter_complex', `[0:v]${scalePad('vout', { width, height, fps: forceFps || OUT_FPS })}`,
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'ultrafast',
    '-crf', '22',
    '-movflags', '+faststart',
    '-y', 'out.mp4',
  ];
  if (forceFps) {
    args.splice(args.indexOf('-map'), 0, '-r', String(forceFps));
  }
  await ff.exec(args);
}

export async function renderVideo({ frames, timingMode, uniformDuration, fps, crossfade, aspect }, onLog) {
  if (!frames || frames.length < 1) throw new Error('need at least 1 frame');
  const { width, height } = deriveDimensions(aspect?.w ?? 9, aspect?.h ?? 16);
  const ff = await getFfmpeg(onLog);
  await clearMemfs(ff);

  const normalizedFrames = frames.map((f) => ({
    ...f,
    duration:
      timingMode === 'uniform'
        ? Number(uniformDuration) || 2
        : timingMode === 'fps'
          ? 1 / (Number(fps) || 24)
          : Math.max(0.05, Number(f.duration) || uniformDuration || 2),
  }));

  const names = await writeInputs(ff, normalizedFrames);

  if (timingMode !== 'fps' && crossfade?.enabled && normalizedFrames.length >= 2) {
    await runCrossfade(ff, normalizedFrames, names, { width, height, crossfade });
  } else if (timingMode === 'fps') {
    await writeConcatList(ff, normalizedFrames, names, 1 / (Number(fps) || 24));
    await runConcatDemuxer(ff, { width, height, forceFps: Number(fps) || 24 });
  } else {
    await writeConcatList(ff, normalizedFrames, names, null);
    await runConcatDemuxer(ff, { width, height });
  }

  const data = await ff.readFile('out.mp4');
  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  return { blob, url: URL.createObjectURL(blob) };
}

export async function renderGif({ width, fps }, onLog) {
  const ff = await getFfmpeg(onLog);

  await ff.exec([
    '-i', 'out.mp4',
    '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
    '-y', 'palette.png',
  ]);

  await ff.exec([
    '-i', 'out.mp4',
    '-i', 'palette.png',
    '-filter_complex', `[0:v]fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
    '-y', 'out.gif',
  ]);

  const data = await ff.readFile('out.gif');
  const blob = new Blob([data.buffer], { type: 'image/gif' });
  return { blob, url: URL.createObjectURL(blob) };
}
