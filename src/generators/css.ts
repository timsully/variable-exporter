import type { SerializedCollection, SerializedValue } from '../types';
import type { ExportOptions, Generator } from './types';
import { toSlug, formatColor } from './utils';

function toVarName(name: string, prefix: string): string {
  return `--${prefix}${toSlug(name)}`;
}

function formatValue(val: SerializedValue, opts: ExportOptions): string {
  switch (val.kind) {
    case 'color':  return formatColor(val, opts);
    case 'number': return opts.numberUnit ? `${val.value}${opts.numberUnit}` : String(val.value);
    case 'string': return val.value;
    case 'boolean': return val.value ? '1' : '0';
    case 'alias':  return `var(${toVarName(val.variableName, opts.prefix)})`;
  }
}

function generateBlock(
  selector: string,
  collection: SerializedCollection,
  modeId: string,
  opts: ExportOptions,
): string {
  const declarations: string[] = [];
  for (const variable of collection.variables) {
    const val = variable.valuesByMode[modeId];
    if (val === undefined) continue;
    declarations.push(`  ${toVarName(variable.name, opts.prefix)}: ${formatValue(val, opts)};`);
  }
  if (declarations.length === 0) return '';
  return `${selector} {\n${declarations.join('\n')}\n}`;
}

function generate(collections: SerializedCollection[], opts: ExportOptions): string {
  const selected = collections.filter((c) => opts.selectedCollections.includes(c.id));
  const sections: string[] = [];

  for (const col of selected) {
    const parts: string[] = [];

    if (opts.includeCollectionHeader) {
      const bar = '='.repeat(Math.max(0, 44 - col.name.length - 4));
      parts.push(`/* == ${col.name} ${bar}*/`);
    }

    if (opts.modeStrategy === 'first-only') {
      const defaultMode = col.modes[0];
      if (!defaultMode) continue;
      const block = generateBlock(':root', col, defaultMode.modeId, opts);
      if (block) parts.push(block);
    } else {
      col.modes.forEach((mode, i) => {
        let selector: string;
        if (i === 0) {
          selector = ':root';
        } else if (opts.modeStrategy === 'class') {
          selector = `.${toSlug(mode.name)}`;
        } else {
          selector = `[data-theme="${toSlug(mode.name)}"]`;
        }
        const block = generateBlock(selector, col, mode.modeId, opts);
        if (block) parts.push(block);
      });
    }

    if (parts.length > 0) sections.push(parts.join('\n'));
  }

  return sections.join('\n\n');
}

export const cssGenerator: Generator = {
  id: 'css',
  label: 'CSS Variables',
  fileExtension: 'css',
  generate,
};
