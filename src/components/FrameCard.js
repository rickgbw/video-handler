'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function FrameCard({
  frame,
  index,
  showDuration,
  aspect = { w: 9, h: 16 },
  onRemove,
  onDurationChange,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: frame.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden group"
    >
      <div
        className="cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div
          className="w-full bg-black flex items-center justify-center"
          style={{ aspectRatio: `${aspect.w} / ${aspect.h}` }}
        >
          <img
            src={frame.previewUrl}
            alt={frame.originalName}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>
        <div className="px-2 py-1.5 text-xs text-neutral-400 flex items-center justify-between">
          <span>#{index + 1}</span>
          <span className="text-neutral-500">
            {frame.width}×{frame.height}
          </span>
        </div>
      </div>

      {showDuration && (
        <div className="px-2 pb-2">
          <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-1">
            Duration (s)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={frame.duration}
            onChange={(e) => onDurationChange(frame.id, Number(e.target.value))}
          />
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(frame.id);
        }}
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 hover:bg-red-500 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}
