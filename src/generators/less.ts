import type { SerializedCollection, SerializedValue, SerializedColor } from '../types';
import type { ExportOptions, Generator } from './types';

function toSlug(name: string): string {
  return name
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toVarName(name: string, prefix: string): string {
  return `@${prefix}${toSlug(name)}`;
}

function hexChannel(n: number): string {
  return Math.round(n * 255).toString(16).padStart(2, '0');
}

function colorToHex(c: SerializedColor): string {
  const rgb = `#${hexChannel(c.r)}${hexChannel(c.g)}${hexChannel(c.b)}`;
  return c.a === 1 ? rgb : `${rgb}${hexChannel(c.a)}`;
}

function colorToRgb(c: SerializedColor): string {
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
  return c.a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${c.a.toFixed(3)})`;
}

function colorToHsl(c: SerializedColor): string {
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

function formatValue(val: SerializedValue, opts: ExportOptions): string {
  switch (val.kind) {
    case 'color':
      if (opts.colorFormat === 'rgb') return colorToRgb(val);
      if (opts.colorFormat === 'hsl') return colorToHsl(val);
      return colorToHex(val);
    case 'number': return opts.numberUnit ? `${val.value}${opts.numberUnit}` : String(val.value);
    case 'string': return val.value;
    case 'boolean': return val.value ? 'true' : 'false';
    case 'alias': return toVarName(val.variableName, opts.prefix);
  }
}

function generate(collections: SerializedCollection[], opts: ExportOptions): string {
  const selected = collections.filter((c) => opts.selectedCollections.includes(c.id));
  const sections: string[] = [];

  for (const col of selected) {
    const parts: string[] = [];
    const defaultMode = col.modes[0];
    if (!defaultMode) continue;

    if (opts.includeCollectionHeader) {
      parts.push(`// ${'='.repeat(42)}`);
      parts.push(`// ${col.name}`);
      parts.push(`// ${'='.repeat(42)}`);
    }

    for (const variable of col.variables) {
      const val = variable.valuesByMode[defaultMode.modeId];
      if (val === undefined) continue;
      parts.push(`${toVarName(variable.name, opts.prefix)}: ${formatValue(val, opts)};`);
    }

    if (col.modes.length > 1) {
      const otherModes = col.modes.slice(1).map((m) => m.name).join(', ');
      parts.push(`// Note: additional modes available (${otherModes}).`);
      parts.push(`// Use the CSS Variables format for runtime theme switching.`);
    }

    if (parts.length > 0) sections.push(parts.join('\n'));
  }

  return sections.join('\n\n');
}

export const lessGenerator: Generator = {
  id: 'less',
  label: 'Less Variables',
  fileExtension: 'less',
  generate,
};
