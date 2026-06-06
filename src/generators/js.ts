import type { SerializedCollection, SerializedValue } from '../types';
import type { ExportOptions, Generator } from './types';
import { toCamelCase, formatColor } from './utils';

function toVarIdent(name: string, prefix: string): string {
  return toCamelCase(`${prefix}${name}`);
}

function formatValue(val: SerializedValue, opts: ExportOptions): string {
  switch (val.kind) {
    case 'color':   return `'${formatColor(val, opts)}'`;
    case 'number':  return opts.numberUnit ? `'${val.value}${opts.numberUnit}'` : String(val.value);
    case 'string':  return `'${val.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    case 'boolean': return String(val.value);
    case 'alias':   return toVarIdent(val.variableName, opts.prefix);
  }
}

function collectLines(collections: SerializedCollection[], opts: ExportOptions): string[] {
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
      const ident = toVarIdent(variable.name, opts.prefix);
      lines.push(`export const ${ident} = ${formatValue(val, opts)};`);
    }

    lines.push('');
  }

  return lines;
}

function generate(collections: SerializedCollection[], opts: ExportOptions): string {
  return collectLines(collections, opts).join('\n').trim();
}

function generateTs(collections: SerializedCollection[], opts: ExportOptions): string {
  const base = collectLines(collections, opts);
  const selected = collections.filter((c) => opts.selectedCollections.includes(c.id));

  const keys: string[] = [];
  for (const col of selected) {
    const defaultMode = col.modes[0];
    if (!defaultMode) continue;
    for (const variable of col.variables) {
      if (variable.valuesByMode[defaultMode.modeId] === undefined) continue;
      keys.push(toVarIdent(variable.name, opts.prefix));
    }
  }

  const tokenEntries = keys.map((k) => `  ${k},`).join('\n');
  base.push(
    `export const tokens = {\n${tokenEntries}\n} as const;`,
    ``,
    `export type TokenKey = keyof typeof tokens;`,
  );

  return base.join('\n').trim();
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
