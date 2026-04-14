'use client';

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import FrameCard from './FrameCard';

export default function FrameGrid({ frames, setFrames, showDuration, aspect, onRemove, onDurationChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = frames.findIndex((f) => f.id === active.id);
    const newIndex = frames.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setFrames(arrayMove(frames, oldIndex, newIndex));
  }

  if (frames.length === 0) {
    return (
      <div className="text-sm text-neutral-500 py-6 text-center">
        No frames yet — upload some images above.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={frames.map((f) => f.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {frames.map((f, i) => (
            <FrameCard
              key={f.id}
              frame={f}
              index={i}
              showDuration={showDuration}
              aspect={aspect}
              onRemove={onRemove}
              onDurationChange={onDurationChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
