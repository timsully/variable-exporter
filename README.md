# Variable Exporter

A Figma plugin that exports local variable collections as CSS custom properties, with an extensible generator architecture for adding more output formats in the future.

---

## Features

- Reads all local variable collections in your Figma file
- Exports as CSS custom properties (`--variable-name: value`)
- Supports all Figma variable types: Color, Number, String, Boolean, and Aliases
- Multiple mode strategies: first mode only, `data-theme` attribute, or CSS class
- Color format options: HEX, RGB, HSL
- Number unit options: raw, `px`, `rem`
- Optional variable prefix (e.g. `ds-` → `--ds-color-primary`)
- Copy to clipboard or download as a `.css` file
- Linear-inspired dark UI with animated splash screen

---

## How to use

1. Open Figma Desktop
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select `manifest.json` from this project folder
4. Open any Figma file that has local variable collections
5. Run the plugin from **Plugins → Development → Variable Exporter**
6. Select the collections you want to export
7. Configure options (format, color format, number unit, mode strategy)
8. Click **Copy** to copy the output or **Save** to download as a `.css` file

---

## How it's built

### Tech stack

| Tool | Purpose |
|---|---|
| TypeScript | Plugin logic and UI |
| esbuild | Bundling — compiles TS and inlines JS/CSS into a single `ui.html` |
| Figma Plugin API | Reads variable collections via `getLocalVariableCollectionsAsync` |

### Project structure

```
Variable Exporter/
├── manifest.json           # Figma plugin config (entry points, icon)
├── icon.svg                # Plugin icon (128×128 rounded square)
├── build.js                # esbuild build script
├── package.json
├── tsconfig.json
└── src/
    ├── types.ts            # Shared message types (plugin ↔ UI)
    ├── plugin/
    │   └── code.ts         # Runs in Figma sandbox — reads variables, handles resize
    ├── generators/
    │   ├── types.ts        # Generator interface
    │   ├── css.ts          # CSS custom property generator
    │   └── index.ts        # Generator registry (add new formats here)
    └── ui/
        ├── index.html      # Shell HTML — JS and CSS are inlined at build time
        ├── index.ts        # UI logic — rendering, options, copy/download
        └── styles.css      # Linear-inspired dark theme
```

### How the build works

The build script (`build.js`) uses esbuild to:

1. Bundle `src/plugin/code.ts` → `dist/code.js` (Figma sandbox)
2. Bundle `src/ui/index.ts` → temporary JS bundle
3. Inline the JS bundle and `styles.css` into `src/ui/index.html` → `dist/ui.html`

Figma loads `dist/code.js` as the plugin logic and `dist/ui.html` as the plugin window.

### How the plugin communicates

The plugin code and UI run in separate sandboxes and communicate via message passing:

```
UI → Plugin:   { type: 'ready' }           on load
               { type: 'resize', height }  after every render
               { type: 'close' }           on close

Plugin → UI:   { type: 'collections-data', collections }
               { type: 'error', message }
```

### How to add a new output format

1. Create `src/generators/your-format.ts` implementing the `Generator` interface:

```typescript
import type { Generator } from './types';

export const yourGenerator: Generator = {
  id: 'your-format',
  label: 'Your Format',
  fileExtension: 'txt',
  generate(collections, options) {
    // return the generated string
    return '';
  },
};
```

2. Register it in `src/generators/index.ts`:

```typescript
import { yourGenerator } from './your-format';

export const generators: Generator[] = [
  cssGenerator,
  yourGenerator, // ← add here
];
```

It will automatically appear in the Format dropdown in the UI.

---

## Development

```bash
# Install dependencies
npm install

# Build once
npm run build

# Watch mode (rebuilds on file changes)
npm run watch
```

After building, reload the plugin in Figma Desktop to pick up changes.

---

## Built by

[Tutorial Tim](https://github.com/timsully)
