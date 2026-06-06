import type { SerializedCollection, SerializedValue } from '../types';
import type { ExportOptions, Generator } from './types';
import { toSlug, formatColor } from './utils';

function toVarName(name: string, prefix: string): string {
  return `$${prefix}${toSlug(name)}`;
}

function formatValue(val: SerializedValue, opts: ExportOptions): string {
  switch (val.kind) {
    case 'color':   return formatColor(val, opts);
    case 'number':  return opts.numberUnit ? `${val.value}${opts.numberUnit}` : String(val.value);
    case 'string':  return val.value;
    case 'boolean': return val.value ? 'true' : 'false';
    case 'alias':   return toVarName(val.variableName, opts.prefix);
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
      const others = col.modes.slice(1).map((m) => m.name).join(', ');
      parts.push(`// Additional modes: ${others} — use CSS Variables format for runtime theming.`);
    }

    if (parts.length > 0) sections.push(parts.join('\n'));
  }

  return sections.join('\n\n');
}

export const scssGenerator: Generator = {
  id: 'scss',
  label: 'SCSS Variables',
  fileExtension: 'scss',
  generate,
};
