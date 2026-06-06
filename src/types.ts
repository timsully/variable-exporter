export interface SerializedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type SerializedValue =
  | ({ kind: 'color' } & SerializedColor)
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'alias'; variableId: string; variableName: string };

export interface SerializedVariable {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, SerializedValue>;
}

export interface SerializedMode {
  modeId: string;
  name: string;
}

export interface SerializedCollection {
  id: string;
  name: string;
  modes: SerializedMode[];
  variables: SerializedVariable[];
}

export type UIMessage = { type: 'ready' } | { type: 'close' } | { type: 'resize'; height: number };

export type PluginMessage =
  | { type: 'collections-data'; collections: SerializedCollection[] }
  | { type: 'error'; message: string };
