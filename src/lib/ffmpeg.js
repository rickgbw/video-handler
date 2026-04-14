import path from 'node:path';
import fs from 'node:fs/promises';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { jobPath } from './jobs.js';
import { deriveDimensions } from './aspect.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const OUT_FPS = 30;

async function resolveSrcFile(jobId, frameId) {
  const srcDir = jobPath(jobId, 'src');
  const files = await fs.readdir(srcDir);
  const match = files.find((f) => f.startsWith(`${frameId}.`));
  if (!match) throw new Error(`source file missing for frame ${frameId}`);
  return path.join(srcDir, match);
}

function scalePadFilter(label, { fps = OUT_FPS, width, height } = {}) {
  const fpsClause = fps ? `fps=${fps},` : '';
  return (
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
    `setsar=1,${fpsClause}format=yuv420p[${label}]`
  );
}

function runFfmpeg(configure) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    configure(cmd);
    let lastErrLine = '';
    cmd
      .on('start', (line) => {
        console.log('[ffmpeg]', line);
      })
      .on('stderr', (line) => {
        lastErrLine = line;
      })
      .on('error', (err) => reject(new Error(`${err.message} | ${lastErrLine}`)))
      .on('end', () => resolve())
      .run();
  });
}

async function encodeConcat({ jobId, frames, crossfade, width, height }) {
  const outPath = jobPath(jobId, 'out.mp4');
  const srcPaths = await Promise.all(
    frames.map((f) => resolveSrcFile(jobId, f.id)),
  );

  return runFfmpeg((cmd) => {
    frames.forEach((f, i) => {
      cmd.input(srcPaths[i]).inputOptions(['-loop 1', `-t ${f.duration.toFixed(3)}`]);
    });

    const filters = [];
    frames.forEach((_, i) => {
      filters.push(`[${i}:v]${scalePadFilter(`v${i}`, { width, height })}`);
    });

    if (crossfade.enabled && frames.length >= 2) {
      const xd = crossfade.duration;
      let prev = 'v0';
      let cumDur = frames[0].duration;
      for (let i = 1; i < frames.length; i++) {
        const offset = Math.max(0, cumDur - xd);
        const out = i === frames.length - 1 ? 'vout' : `xf${i}`;
        filters.push(
          `[${prev}][v${i}]xfade=transition=fade:duration=${xd.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`,
        );
        cumDur = cumDur + frames[i].duration - xd;
        prev = out;
      }
    } else {
      const labels = frames.map((_, i) => `[v${i}]`).join('');
      filters.push(`${labels}concat=n=${frames.length}:v=1:a=0[vout]`);
    }

    cmd
      .complexFilter(filters)
      .outputOptions([
        '-map [vout]',
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-preset medium',
        '-crf 20',
        '-movflags +faststart',
        '-y',
      ])
      .output(outPath);
  }).then(() => outPath);
}

async function encodeFps({ jobId, frames, fps, width, height }) {
  const outPath = jobPath(jobId, 'out.mp4');
  const seqDir = jobPath(jobId, 'seq');
  await fs.rm(seqDir, { recursive: true, force: true });
  await fs.mkdir(seqDir, { recursive: true });

  const srcPaths = await Promise.all(
    frames.map((f) => resolveSrcFile(jobId, f.id)),
  );
  for (let i = 0; i < srcPaths.length; i++) {
    const n = String(i + 1).padStart(4, '0');
    const dest = path.join(seqDir, `frame_${n}.png`);
    await sharp(srcPaths[i], { failOn: 'none' }).png({ compressionLevel: 1 }).toFile(dest);
  }

  const pattern = path.join(seqDir, 'frame_%04d.png');
  return runFfmpeg((cmd) => {
    cmd
      .input(pattern)
      .inputOptions(['-framerate', String(fps)])
      .complexFilter([`[0:v]${scalePadFilter('vout', { fps: null, width, height })}`])
      .outputOptions([
        '-map [vout]',
        '-r', String(fps),
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-preset medium',
        '-crf 20',
        '-movflags +faststart',
        '-y',
      ])
      .output(outPath);
  }).then(async () => {
    await fs.rm(seqDir, { recursive: true, force: true });
    return outPath;
  });
}

export async function renderVideo(config) {
  const { jobId, timingMode, frames, uniformDuration, fps, crossfade, aspect } = config;
  if (!frames || frames.length < 1) throw new Error('need at least 1 frame');

  const { width, height } = deriveDimensions(aspect?.w ?? 9, aspect?.h ?? 16);

  if (timingMode === 'fps') {
    return encodeFps({ jobId, frames, fps, width, height });
  }
  const resolved = frames.map((f) => ({
    id: f.id,
    duration:
      timingMode === 'uniform'
        ? uniformDuration
        : Math.max(0.05, Number(f.duration) || uniformDuration),
  }));
  return encodeConcat({ jobId, frames: resolved, crossfade, width, height });
}

export async function renderGif({ jobId, width, fps }) {
  const videoPath = jobPath(jobId, 'out.mp4');
  const palettePath = jobPath(jobId, 'palette.png');
  const gifPath = jobPath(jobId, 'out.gif');

  await runFfmpeg((cmd) => {
    cmd
      .input(videoPath)
      .outputOptions([
        '-vf',
        `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
        '-y',
      ])
      .output(palettePath);
  });

  await runFfmpeg((cmd) => {
    cmd
      .input(videoPath)
      .input(palettePath)
      .complexFilter([
        `[0:v]fps=${fps},scale=${width}:-1:flags=lanczos[x]`,
        `[x][1:v]paletteuse`,
      ])
      .outputOptions(['-y'])
      .output(gifPath);
  });

  return gifPath;
}
