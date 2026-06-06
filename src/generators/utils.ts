import type { SerializedColor } from '../types';
import type { ExportOptions } from './types';

export function toSlug(name: string): string {
  return name
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function toCamelCase(name: string): string {
  const slug = toSlug(name);
  const camel = slug.replace(/-([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
  return /^\d/.test(camel) ? `_${camel}` : camel;
}

function hexChannel(n: number): string {
  return Math.round(n * 255).toString(16).padStart(2, '0');
}

export function colorToHex(c: SerializedColor): string {
  const rgb = `#${hexChannel(c.r)}${hexChannel(c.g)}${hexChannel(c.b)}`;
  return c.a === 1 ? rgb : `${rgb}${hexChannel(c.a)}`;
}

export function colorToRgb(c: SerializedColor): string {
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
  return c.a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${c.a.toFixed(3)})`;
}

export function colorToHsl(c: SerializedColor): string {
  const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case c.r: h = ((c.g - c.b) / d + (c.g < c.b ? 6 : 0)) / 6; break;
      case c.g: h = ((c.b - c.r) / d + 2) / 6; break;
      case c.b: h = ((c.r - c.g) / d + 4) / 6; break;
    }
  }
  const hp = Math.round(h * 360), sp = Math.round(s * 100), lp = Math.round(l * 100);
  return c.a === 1 ? `hsl(${hp}, ${sp}%, ${lp}%)` : `hsla(${hp}, ${sp}%, ${lp}%, ${c.a.toFixed(3)})`;
}

export function formatColor(c: SerializedColor, opts: ExportOptions): string {
  if (opts.colorFormat === 'rgb') return colorToRgb(c);
  if (opts.colorFormat === 'hsl') return colorToHsl(c);
  return colorToHex(c);
}
