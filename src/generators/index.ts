import { cssGenerator } from './css';
import type { Generator } from './types';

export const generators: Generator[] = [
  cssGenerator,
  // Future: scssGenerator, tailwindGenerator, stylesGenerator, jsTokensGenerator
];

export type { Generator, ExportOptions } from './types';
