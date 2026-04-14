'use client';

export default function VideoPlayer({ videoUrl, aspect = { w: 9, h: 16 } }) {
  if (!videoUrl) return null;
  const isPortrait = aspect.h >= aspect.w;
  const frameStyle = {
    aspectRatio: `${aspect.w} / ${aspect.h}`,
    width: isPortrait ? 'min(360px, 100%)' : 'min(640px, 100%)',
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-lg overflow-hidden bg-black border border-neutral-800 shadow-lg"
        style={frameStyle}
      >
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          playsInline
          className="w-full h-full"
        />
      </div>
      <a
        href={videoUrl}
        download="video.mp4"
        className="inline-flex items-center gap-2 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-sm font-medium"
      >
        Download .mp4
      </a>
    </div>
  );
}
