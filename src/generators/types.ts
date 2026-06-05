import type { SerializedCollection } from '../types';

export interface ExportOptions {
  selectedCollections: string[];
  colorFormat: 'hex' | 'rgb' | 'hsl';
  numberUnit: '' | 'px' | 'rem';
  prefix: string;
  modeStrategy: 'first-only' | 'data-attribute' | 'class';
  includeCollectionHeader: boolean;
}

export interface Generator {
  id: string;
  label: string;
  fileExtension: string;
  generate(collections: SerializedCollection[], options: ExportOptions): string;
}
