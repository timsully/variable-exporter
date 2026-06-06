/// <reference types="@figma/plugin-typings" />
import type { SerializedCollection, SerializedValue, UIMessage, PluginMessage } from '../types';

declare const __html__: string;

figma.showUI(__html__, { width: 480, height: 640, title: 'Variable Exporter' });

figma.ui.onmessage = (msg: UIMessage) => {
  if (msg.type === 'ready') {
    sendCollections().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      figma.ui.postMessage({ type: 'error', message } as PluginMessage);
    });
  } else if (msg.type === 'resize') {
    figma.ui.resize(480, Math.round(Math.max(200, Math.min(900, msg.height))));
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};

async function sendCollections() {
  const [collections, allVariables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);
  const variableMap = new Map(allVariables.map((v) => [v.id, v]));

  const serialized: SerializedCollection[] = collections.map((col) => ({
    id: col.id,
    name: col.name,
    modes: col.modes,
    variables: col.variableIds
      .map((id) => {
        const v = variableMap.get(id);
        if (!v) return null;
        const valuesByMode: Record<string, SerializedValue> = {};
        for (const [modeId, raw] of Object.entries(v.valuesByMode)) {
          valuesByMode[modeId] = serializeValue(raw, variableMap);
        }
        return {
          id: v.id,
          name: v.name,
          resolvedType: v.resolvedType as 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN',
          valuesByMode,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null),
  }));

  const msg: PluginMessage = { type: 'collections-data', collections: serialized };
  figma.ui.postMessage(msg);
}

function serializeValue(
  raw: VariableValue,
  variableMap: Map<string, Variable>,
): SerializedValue {
  if (raw === null || raw === undefined) {
    return { kind: 'string', value: '' };
  }

  if (typeof raw === 'boolean') return { kind: 'boolean', value: raw };
  if (typeof raw === 'number') return { kind: 'number', value: raw };
  if (typeof raw === 'string') return { kind: 'string', value: raw };

  if (typeof raw === 'object') {
    if ('type' in raw && raw.type === 'VARIABLE_ALIAS') {
      const target = variableMap.get(raw.id);
      return {
        kind: 'alias',
        variableId: raw.id,
        variableName: target?.name ?? raw.id,
      };
    }
    if ('r' in raw) {
      return {
        kind: 'color',
        r: (raw as RGB).r,
        g: (raw as RGB).g,
        b: (raw as RGB).b,
        a: 'a' in raw ? (raw as RGBA).a : 1,
      };
    }
  }

  return { kind: 'string', value: String(raw) };
}
