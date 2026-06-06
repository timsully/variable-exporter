import type { SerializedCollection, SerializedValue, SerializedColor } from '../types';
import type { ExportOptions, Generator } from './types';

function toCamelCase(name: string): string {
  const slug = name
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const camel = slug.replace(/-([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
  // Identifiers can't start with a digit
  return /^\d/.test(camel) ? `_${camel}` : camel;
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

function formatValue(val: SerializedValue, opts: ExportOptions, prefix: string): string {
  switch (val.kind) {
    case 'color': {
      const str =
        opts.colorFormat === 'rgb' ? colorToRgb(val) :
        opts.colorFormat === 'hsl' ? colorToHsl(val) :
        colorToHex(val);
      return `'${str}'`;
    }
    case 'number': return opts.numberUnit ? `'${val.value}${opts.numberUnit}'` : String(val.value);
    case 'string': return `'${val.value.replace(/'/g, "\\'")}'`;
    case 'boolean': return String(val.value);
    case 'alias': return toCamelCase(`${prefix}${val.variableName}`);
  }
}

function generate(collections: SerializedCollection[], opts: ExportOptions): string {
  const selected = collections.filter((c) => opts.selectedCollections.includes(c.id));
  const lines: string[] = [];

  for (const col of selected) {
    const defaultMode = col.modes[0];
    if (!defaultMode) continue;

    if (opts.includeCollectionHeader) {
      lines.push(`// ${'='.repeat(42)}`);
      lines.push(`// ${col.name}`);
      lines.push(`// ${'='.repeat(42)}`);
    }

    for (const variable of col.variables) {
      const val = variable.valuesByMode[defaultMode.modeId];
      if (val === undefined) continue;
      const ident = toCamelCase(`${opts.prefix}${variable.name}`);
      lines.push(`export const ${ident} = ${formatValue(val, opts, opts.prefix)};`);
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}

function generateTs(collections: SerializedCollection[], opts: ExportOptions): string {
  const base = generate(collections, opts);
  if (!base) return base;

  // Append as-const object for full type inference
  const selected = collections.filter((c) => opts.selectedCollections.includes(c.id));
  const keys: string[] = [];
  for (const col of selected) {
    const defaultMode = col.modes[0];
    if (!defaultMode) continue;
    for (const variable of col.variables) {
      if (variable.valuesByMode[defaultMode.modeId] === undefined) continue;
      keys.push(toCamelCase(`${opts.prefix}${variable.name}`));
    }
  }

  const tokenLines = keys.map((k) => `  ${k},`).join('\n');
  const footer = `\nexport const tokens = {\n${tokenLines}\n} as const;\n\nexport type TokenKey = keyof typeof tokens;`;
  return `${base}\n${footer}`;
}

export const jsGenerator: Generator = {
  id: 'js',
  label: 'JavaScript (ES Module)',
  fileExtension: 'js',
  generate,
};

export const tsGenerator: Generator = {
  id: 'ts',
  label: 'TypeScript',
  fileExtension: 'ts',
  generate: generateTs,
};
