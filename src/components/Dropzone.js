'use client';

import { useRef, useState } from 'react';

export default function Dropzone({ onFiles, disabled }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  function handleFiles(list) {
    const files = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) onFiles(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed ' +
        'text-center px-6 py-10 transition-colors select-none ' +
        (disabled
          ? 'cursor-not-allowed border-neutral-800 bg-neutral-900/40 text-neutral-500'
          : over
          ? 'cursor-pointer border-indigo-500 bg-indigo-500/5 text-neutral-100'
          : 'cursor-pointer border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700')
      }
    >
      <div className="text-base font-medium">
        Drop images here or click to select
      </div>
      <div className="text-sm text-neutral-500 mt-1">
        JPG, PNG, WebP, GIF, AVIF — multiple files supported
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
