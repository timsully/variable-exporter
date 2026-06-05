import type { SerializedCollection, PluginMessage, UIMessage } from '../types';
import type { ExportOptions } from '../generators/types';
import { generators } from '../generators/index';

// ── Assets ───────────────────────────────────────────────────────────────────

// SVG is rendered at 80px. The flame path gets:
//   - a slow sway (scaleX 1→0.96→1, transform-origin center-bottom of the flame)
//   - opacity flicker to simulate candlelight
// The circle gets a soft purple glow pulse via filter
const LOGO_SVG = `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <circle cx="12" cy="12" r="12" fill="#2E2B2B" class="logo-circle"/>
  <path class="logo-flame" style="transform-origin: 12px 18px;"
    d="M16.5 13.0597C16.5 14.4674 15.7452 15.6892 14.5839 16.4329V18H9.44516V16.4329C8.25484 15.6892 7.5 14.4674 7.5 13.0597C7.5 11.3598 9.96774 6.81796 11.2452 4.58687C11.3323 4.4275 11.5645 4.50718 11.5645 4.66655V11.3067C11.5645 11.5723 11.4194 11.7848 11.2161 11.9442C10.9258 12.1832 10.7516 12.5285 10.8097 12.9269C10.8677 13.405 11.3032 13.7769 11.8258 13.8565C12.5516 13.9362 13.1613 13.4316 13.1613 12.7941C13.1613 12.4754 13.0161 12.1832 12.7548 11.9707C12.5226 11.7848 12.3774 11.5458 12.3774 11.2802V4.66655C12.3774 4.50718 12.6097 4.45406 12.6968 4.58687C14.0032 6.81796 16.5 11.3598 16.5 13.0597Z"
    fill="#F9F9F9" filter="url(#glow)"/>
</svg>`;

// ── State ────────────────────────────────────────────────────────────────────

interface State {
  status: 'loading' | 'empty' | 'ready';
  collections: SerializedCollection[];
  options: ExportOptions;
}

const state: State = {
  status: 'loading',
  collections: [],
  options: {
    selectedCollections: [],
    colorFormat: 'hex',
    numberUnit: 'px',
    prefix: '',
    modeStrategy: 'data-attribute',
    includeCollectionHeader: true,
  },
};

// ── Message passing ──────────────────────────────────────────────────────────

function postMessage(msg: UIMessage) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as PluginMessage;
  if (!msg) return;

  if (msg.type === 'collections-data') {
    state.collections = msg.collections;
    state.options.selectedCollections = msg.collections.map((c) => c.id);
    state.status = msg.collections.length === 0 ? 'empty' : 'ready';
    hideSplash(() => render());
  } else if (msg.type === 'error') {
    console.error('[Variable Exporter]', msg.message);
  }
};

// ── Generators ───────────────────────────────────────────────────────────────

function getOutput(): string {
  const gen = generators.find((g) => g.id === 'css') ?? generators[0];
  if (!gen || state.options.selectedCollections.length === 0) return '';
  return gen.generate(state.collections, state.options);
}

// ── Syntax highlight (minimal) ───────────────────────────────────────────────

function highlight(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>')
    .replace(/^([^{}\n]+)(?=\s*\{)/gm, '<span class="token-selector">$1</span>')
    .replace(/(--[\w-]+)(\s*:)/g, '<span class="token-property">$1</span>$2')
    .replace(/:\s*([^;{\n]+);/g, ': <span class="token-value">$1</span>;');
}

// ── Copy / Download ──────────────────────────────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

function downloadFile(content: string, ext: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `variables.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

function flashButton(btn: HTMLButtonElement, label: string) {
  const orig = btn.textContent ?? '';
  btn.textContent = label;
  btn.classList.add('btn--success');
  setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove('btn--success');
  }, 1500);
}

// ── Render helpers ───────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else e.setAttribute(k, v);
  }
  for (const child of children) {
    if (typeof child === 'string') e.appendChild(document.createTextNode(child));
    else e.appendChild(child);
  }
  return e;
}

function svgCheck(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
  svg.setAttribute('width', '10');
  svg.setAttribute('height', '10');
  svg.setAttribute('viewBox', '0 0 10 10');
  svg.setAttribute('fill', 'none');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M1.5 5L4 7.5L8.5 2.5');
  path.setAttribute('stroke', 'white');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  return svg;
}

function svgClose(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('fill', 'none');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M2 2L10 10M10 2L2 10');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderLoading(): HTMLElement {
  const splash = el('div', { className: 'splash' });

  const ring = el('div', { className: 'splash__logo-ring' });
  const logoEl = el('div', { className: 'splash__logo' });
  logoEl.innerHTML = LOGO_SVG;
  ring.appendChild(logoEl);
  splash.appendChild(ring);

  const name = el('p', { className: 'splash__name' }, 'Variable Exporter');
  splash.appendChild(name);

  const loader = el('div', { className: 'splash__loader' });
  loader.appendChild(el('div', { className: 'splash__dot' }));
  loader.appendChild(el('div', { className: 'splash__dot' }));
  loader.appendChild(el('div', { className: 'splash__dot' }));
  splash.appendChild(loader);

  return splash;
}

function renderEmpty(): HTMLElement {
  const view = el('div', { className: 'state-view' });
  const iconBox = el('div', { className: 'state-view__icon' });
  iconBox.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" rx="2" stroke="#5c5c6c" stroke-width="1.5"/>
    <path d="M6 9h6M9 6v6" stroke="#5c5c6c" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
  view.appendChild(iconBox);
  view.appendChild(Object.assign(el('p', { className: 'state-view__title' }), { textContent: 'No variable collections found' }));
  view.appendChild(Object.assign(el('p', { className: 'state-view__body' }), {
    textContent: 'Add local variable collections to this Figma file to get started.',
  }));
  return view;
}

function renderCollections(): HTMLElement {
  const section = el('div', { className: 'section' });

  const header = el('div', { className: 'collections-header' });
  const label = el('span', { className: 'section__label' }, 'Collections');
  const allSelected = state.collections.every((c) => state.options.selectedCollections.includes(c.id));
  const toggleBtn = el('button', { className: 'btn-link' }, allSelected ? 'Deselect all' : 'Select all');
  toggleBtn.addEventListener('click', () => {
    state.options.selectedCollections = allSelected ? [] : state.collections.map((c) => c.id);
    render();
  });
  header.appendChild(label);
  header.appendChild(toggleBtn);
  section.appendChild(header);

  const grid = el('div', { className: 'collections-grid' });

  for (const col of state.collections) {
    const isSelected = state.options.selectedCollections.includes(col.id);
    const item = el('label', { className: `collection-item${isSelected ? ' selected' : ''}` });

    const checkbox = el('input', { type: 'checkbox' }) as HTMLInputElement;
    checkbox.checked = isSelected;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        state.options.selectedCollections = [...state.options.selectedCollections, col.id];
      } else {
        state.options.selectedCollections = state.options.selectedCollections.filter((id) => id !== col.id);
      }
      render();
    });

    const checkBox = el('div', { className: 'collection-item__check' });
    checkBox.appendChild(svgCheck());

    const name = el('span', { className: 'collection-item__name' }, col.name);
    const count = el('span', { className: 'collection-item__count' }, String(col.variables.length));

    item.appendChild(checkbox);
    item.appendChild(checkBox);
    item.appendChild(name);
    item.appendChild(count);
    grid.appendChild(item);
  }

  section.appendChild(grid);
  return section;
}

function selectField(
  labelText: string,
  value: string,
  options: { value: string; label: string }[],
  onChange: (v: string) => void,
): HTMLElement {
  const field = el('div', { className: 'field' });
  field.appendChild(el('span', { className: 'field__label' }, labelText));
  const wrap = el('div', { className: 'select-wrapper' });
  const select = el('select') as HTMLSelectElement;
  for (const opt of options) {
    const o = el('option', { value: opt.value }, opt.label) as HTMLOptionElement;
    if (opt.value === value) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  wrap.appendChild(select);
  field.appendChild(wrap);
  return field;
}

function textField(
  labelText: string,
  value: string,
  placeholder: string,
  onChange: (v: string) => void,
): HTMLElement {
  const field = el('div', { className: 'field' });
  field.appendChild(el('span', { className: 'field__label' }, labelText));
  const input = el('input', { type: 'text', placeholder, value }) as HTMLInputElement;
  input.addEventListener('input', () => onChange(input.value));
  field.appendChild(input);
  return field;
}

function renderOptions(): HTMLElement {
  const section = el('div', { className: 'section' });
  section.appendChild(el('span', { className: 'section__label' }, 'Options'));

  const grid = el('div', { className: 'options-grid' });

  grid.appendChild(selectField('Format', 'css', generators.map((g) => ({ value: g.id, label: g.label })), () => render()));

  grid.appendChild(selectField('Colors', state.options.colorFormat,
    [{ value: 'hex', label: 'HEX' }, { value: 'rgb', label: 'RGB' }, { value: 'hsl', label: 'HSL' }],
    (v) => { state.options.colorFormat = v as ExportOptions['colorFormat']; render(); },
  ));

  grid.appendChild(selectField('Numbers', state.options.numberUnit,
    [{ value: '', label: 'Raw' }, { value: 'px', label: 'px' }, { value: 'rem', label: 'rem' }],
    (v) => { state.options.numberUnit = v as ExportOptions['numberUnit']; render(); },
  ));

  grid.appendChild(selectField('Modes', state.options.modeStrategy,
    [
      { value: 'first-only', label: 'First only' },
      { value: 'data-attribute', label: 'data-theme attr' },
      { value: 'class', label: 'CSS class' },
    ],
    (v) => { state.options.modeStrategy = v as ExportOptions['modeStrategy']; render(); },
  ));

  grid.appendChild(textField('Variable prefix', state.options.prefix, 'e.g. ds-',
    (v) => { state.options.prefix = v; render(); },
  ));

  section.appendChild(grid);
  return section;
}

function renderOutput(): HTMLElement {
  const wrapper = document.createDocumentFragment();

  const header = el('div', { className: 'output-header' });
  const label = el('span', { className: 'section__label' }, 'Output');

  const output = getOutput();
  const lineCount = output ? output.split('\n').length : 0;
  const badge = el('span', { className: 'line-count' }, lineCount > 0 ? `${lineCount} lines` : '');

  const left = el('div', { className: 'format-row' });
  left.appendChild(label);
  left.appendChild(badge);

  const actions = el('div', { className: 'output-actions' });

  const copyBtn = el('button', { className: 'btn' }, 'Copy');
  copyBtn.addEventListener('click', async () => {
    if (!output) return;
    const ok = await copyToClipboard(output);
    if (ok) flashButton(copyBtn as HTMLButtonElement, 'Copied!');
  });

  const gen = generators.find((g) => g.id === 'css') ?? generators[0];
  const saveBtn = el('button', { className: 'btn btn--primary' }, 'Save');
  saveBtn.addEventListener('click', () => {
    if (!output) return;
    downloadFile(output, gen?.fileExtension ?? 'txt');
  });

  actions.appendChild(copyBtn);
  actions.appendChild(saveBtn);
  header.appendChild(left);
  header.appendChild(actions);

  const pane = el('div', { className: 'output-pane' });

  if (output) {
    const code = el('code', { className: 'output-code' });
    code.innerHTML = highlight(output);
    pane.appendChild(code);
  } else {
    pane.appendChild(
      el('p', { className: 'output-placeholder' }, 'Select at least one collection to see output.'),
    );
  }

  const container = el('div', { className: 'output-section' });
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.flex = '1';
  container.style.minHeight = '0';
  container.appendChild(header);
  container.appendChild(pane);
  return container;
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';
  splashEl = null;

  if (state.status === 'loading') return; // splash handles this

  // Header
  const header = el('div', { className: 'header' });
  const titleGroup = el('div', {});
  titleGroup.appendChild(el('div', { className: 'header__title' }, 'Variable Exporter'));
  titleGroup.appendChild(el('div', { className: 'header__subtitle' }, 'Export collections as CSS variables'));
  const closeBtn = el('button', { className: 'btn-icon', title: 'Close' });
  closeBtn.appendChild(svgClose());
  closeBtn.addEventListener('click', () => postMessage({ type: 'close' }));
  header.appendChild(titleGroup);
  header.appendChild(closeBtn);
  app.appendChild(header);

  if (state.status === 'empty') {
    app.appendChild(renderEmpty());
    return;
  }

  // Scrollable config area
  const scroll = el('div', { className: 'scrollable' });
  scroll.style.flex = '0 0 auto';
  scroll.style.maxHeight = '300px';
  scroll.appendChild(renderCollections());
  scroll.appendChild(renderOptions());
  app.appendChild(scroll);

  // Output fills remaining space
  app.appendChild(renderOutput());
}

// ── Splash transition ─────────────────────────────────────────────────────────

let splashEl: HTMLElement | null = null;

function showSplash() {
  const app = document.getElementById('app');
  if (!app) return;
  splashEl = renderLoading();
  app.innerHTML = '';
  app.appendChild(splashEl);
}

function hideSplash(then: () => void) {
  if (!splashEl) { then(); return; }
  splashEl.classList.add('splash--exit');
  splashEl.addEventListener('animationend', () => {
    then();
  }, { once: true });
}

// ── Boot ─────────────────────────────────────────────────────────────────────

showSplash();
postMessage({ type: 'ready' });
