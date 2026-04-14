export const SHORT_EDGE = 1080;
export const MAX_LONG_EDGE = 3840;

export const ASPECT_PRESETS = [
  { key: '9:16', label: '9:16 Vertical', w: 9, h: 16 },
  { key: '4:5', label: '4:5 Portrait', w: 4, h: 5 },
  { key: '1:1', label: '1:1 Square', w: 1, h: 1 },
  { key: '4:3', label: '4:3 Classic', w: 4, h: 3 },
  { key: '16:9', label: '16:9 Wide', w: 16, h: 9 },
  { key: '21:9', label: '21:9 Cinema', w: 21, h: 9 },
];

export function deriveDimensions(wRatio, hRatio) {
  const w = Math.max(1, Number(wRatio) || 1);
  const h = Math.max(1, Number(hRatio) || 1);
  let W, H;
  if (w >= h) {
    H = SHORT_EDGE;
    W = Math.round((SHORT_EDGE * w) / h);
  } else {
    W = SHORT_EDGE;
    H = Math.round((SHORT_EDGE * h) / w);
  }
  if (W > MAX_LONG_EDGE) {
    H = Math.round(H * (MAX_LONG_EDGE / W));
    W = MAX_LONG_EDGE;
  }
  if (H > MAX_LONG_EDGE) {
    W = Math.round(W * (MAX_LONG_EDGE / H));
    H = MAX_LONG_EDGE;
  }
  W -= W % 2;
  H -= H % 2;
  return { width: W, height: H };
}

export function matchPreset(w, h) {
  return ASPECT_PRESETS.find((p) => p.w === w && p.h === h)?.key || 'custom';
}
