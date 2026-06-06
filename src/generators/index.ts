import { cssGenerator } from './css';
import { scssGenerator } from './scss';
import { lessGenerator } from './less';
import { jsGenerator, tsGenerator } from './js';
import type { Generator } from './types';

export const generators: Generator[] = [
  cssGenerator,
  scssGenerator,
  lessGenerator,
  jsGenerator,
  tsGenerator,
];

export type { Generator, ExportOptions } from './types';
