"use client";

import { useEffect, useRef, useState } from "react";

// Thermal ramp: light blue -> dark blue -> green -> yellow -> red (hottest).
const RAMP = ["#48C0E7", "#79C0F8", "#00CF5A", "#F7C939", "#F6532B"];
const BACKGROUND = "#D7F0FF";

const ELEMENT_COUNT = 15;
const RADIUS = 140; // heat blob radius in px
const MAX_ALPHA = 1.0; // overlay opacity cap so elements stay visible

interface HeatElement {
  id: number;
  x: number; // fraction of container width, re-resolved on resize
  y: number; // fraction of container height
  contributionCount: number;
  avatarUrl: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function generateElements(): HeatElement[] {
  return Array.from({ length: ELEMENT_COUNT }, (_, i) => ({
    id: i + 1,
    x: 0.05 + Math.random() * 0.9,
    y: 0.05 + Math.random() * 0.9,
    contributionCount: Math.floor(Math.random() * 100) + 1,
    avatarUrl: `https://picsum.photos/seed/profile-${Math.floor(
      Math.random() * 1000,
    )}/64`,
  }));
}

// Dominant color via histogram bucketing: quantize to 4 bits/channel,
// skip near-white/near-black grays, weight buckets by saturation.
function extractDominantColor(img: HTMLImageElement): RGB | null {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0, size, size);
  const data = g.getImageData(0, 0, size, size).data;

  const buckets = new Map<
    number,
    { r: number; g: number; b: number; n: number; score: number }
  >();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const gr = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const max = Math.max(r, gr, b);
    const min = Math.min(r, gr, b);
    if (max - min < 20 && (max > 230 || max < 25)) continue;
    const key = ((r >> 4) << 8) | ((gr >> 4) << 4) | (b >> 4);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { r: 0, g: 0, b: 0, n: 0, score: 0 };
      buckets.set(key, bucket);
    }
    const sat = max === 0 ? 0 : (max - min) / max;
    bucket.r += r;
    bucket.g += gr;
    bucket.b += b;
    bucket.n++;
    bucket.score += 1 + sat;
  }

  let best: {
    r: number;
    g: number;
    b: number;
    n: number;
    score: number;
  } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.score > best.score) best = bucket;
  }
  if (!best) return null;
  return {
    r: Math.round(best.r / best.n),
    g: Math.round(best.g / best.n),
    b: Math.round(best.b / best.n),
  };
}

function mixWithWhite({ r, g, b }: RGB, t: number): string {
  const mix = (v: number) => Math.round(v + (255 - v) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// 256-entry color lookup table built from the ramp. Called client-side only
// (uses document), so it must not run at module load under SSR.
function buildLUT(): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  RAMP.forEach((hex, i) => grad.addColorStop(i / (RAMP.length - 1), hex));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 1);
  return g.getImageData(0, 0, 256, 1).data;
}

// Draw the accumulated heat field into `canvas`, sized to `w`x`h` (CSS px).
function renderHeat(
  canvas: HTMLCanvasElement,
  elements: HeatElement[],
  lut: Uint8ClampedArray,
  w: number,
  h: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || w === 0 || h === 0 || elements.length === 0) return;
  canvas.width = w;
  canvas.height = h;

  const maxCount = Math.max(...elements.map((e) => e.contributionCount));

  // 1) Accumulate intensity in the alpha channel: one soft radial blob per
  //    element, weighted by contributionCount relative to the max.
  ctx.clearRect(0, 0, w, h);
  for (const el of elements) {
    const cx = el.x * w;
    const cy = el.y * h;
    const weight = el.contributionCount / maxCount;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, RADIUS);
    grad.addColorStop(0, `rgba(0,0,0,${weight})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - RADIUS, cy - RADIUS, RADIUS * 2, RADIUS * 2);
  }

  // 2) Colorize: map accumulated alpha through the ramp LUT.
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a === 0) continue;
    const j = Math.min(255, a) * 4;
    px[i] = lut[j];
    px[i + 1] = lut[j + 1];
    px[i + 2] = lut[j + 2];
    px[i + 3] = Math.round(Math.min(255, a) * MAX_ALPHA);
  }
  ctx.putImageData(img, 0, 0);
}

interface TooltipState {
  el: HeatElement;
  x: number;
  y: number;
}

// A single element dot. Owns its avatar-derived color so each image can
// resolve independently without re-rendering the whole map.
function Dot({
  el,
  onHover,
  onMove,
  onLeave,
}: {
  el: HeatElement;
  onHover: (el: HeatElement, e: React.MouseEvent) => void;
  onMove: (e: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const [color, setColor] = useState<RGB | null>(null);

  useEffect(() => {
    const avatar = new Image();
    avatar.crossOrigin = "anonymous";
    avatar.src = el.avatarUrl;
    avatar.onload = () => setColor(extractDominantColor(avatar));
  }, [el.avatarUrl]);

  return (
    <div
      style={{
        position: "absolute",
        left: `${el.x * 100}%`,
        top: `${el.y * 100}%`,
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: `1px solid ${color ? `rgb(${color.r}, ${color.g}, ${color.b})` : "#0b0b0b"}`,
        background: color ? mixWithWhite(color, 0.75) : "transparent",
        transform: "translate(-50%, -50%)",
        zIndex: 2,
        cursor: "default",
      }}
      onMouseEnter={(e) => onHover(el, e)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    />
  );
}

export default function ActivityHeatMap() {
  const [elements, setElements] = useState<HeatElement[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lutRef = useRef<Uint8ClampedArray | null>(null);

  // Generate on mount (not during render) to avoid SSR/hydration mismatch.
  useEffect(() => {
    setElements(generateElements());
  }, []);

  // Redraw the heat layer whenever elements change or the container resizes.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    if (!lutRef.current) lutRef.current = buildLUT();

    const draw = () => {
      const { width, height } = container.getBoundingClientRect();
      renderHeat(canvas, elements, lutRef.current!, width, height);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [elements]);

  const handleHover = (el: HeatElement, e: React.MouseEvent) => {
    setTooltip({ el, x: e.clientX, y: e.clientY });
  };
  const handleMove = (e: React.MouseEvent) => {
    setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : t));
  };
  const handleLeave = () => setTooltip(null);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: BACKGROUND,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      {elements.map((el) => (
        <Dot
          key={el.id}
          el={el}
          onHover={handleHover}
          onMove={handleMove}
          onLeave={handleLeave}
        />
      ))}

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            zIndex: 5,
            background: "#fcfcfb",
            border: "1px solid rgba(11, 11, 11, 0.1)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            color: "#52514e",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <img
            src={tooltip.el.avatarUrl}
            alt=""
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "block",
              marginBottom: 4,
            }}
          />
          Element {tooltip.el.id} &middot;{" "}
          <strong style={{ color: "#0b0b0b", fontWeight: 600 }}>
            {tooltip.el.contributionCount}
          </strong>{" "}
          contributions
        </div>
      )}
    </div>
  );
}
