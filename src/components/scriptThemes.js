// Syntax color themes for the script editor (and its docs panel, which
// highlights through the same .ofc-tok-* classes). A theme is a set of
// --ofc-syn-* CSS variables applied inline on the editor root; app.scss
// keeps the Classic palette as each variable's fallback, so 'classic' simply
// clears the overrides. The picked theme persists as scriptSyntaxTheme.

// Classic values, duplicated from the app.scss fallbacks for the picker's
// preview swatches (CSS can't be read back from JS without a mounted node)
const CLASSIC = {
  '--ofc-syn-keyword': '#f1248e',
  '--ofc-syn-string': '#01c352',
  '--ofc-syn-number': '#df920c',
  '--ofc-syn-builtin': '#15a9de',
};

export const SCRIPT_THEMES = [
  { id: 'classic', name: 'Classic', vars: {} },
  {
    id: 'monokai',
    name: 'Monokai',
    vars: {
      '--ofc-syn-comment': '#75715e',
      '--ofc-syn-string': '#e6db74',
      '--ofc-syn-number': '#ae81ff',
      '--ofc-syn-draw': '#a6e22e',
      '--ofc-syn-keyword': '#f92672',
      '--ofc-syn-source': '#fd971f',
      '--ofc-syn-builtin': '#66d9ef',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    vars: {
      '--ofc-syn-comment': '#6272a4',
      '--ofc-syn-string': '#f1fa8c',
      '--ofc-syn-number': '#bd93f9',
      '--ofc-syn-draw': '#50fa7b',
      '--ofc-syn-keyword': '#ff79c6',
      '--ofc-syn-source': '#ffb86c',
      '--ofc-syn-builtin': '#8be9fd',
    },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    vars: {
      '--ofc-syn-comment': '#657b83',
      '--ofc-syn-string': '#2aa198',
      '--ofc-syn-number': '#d33682',
      '--ofc-syn-draw': '#b58900',
      '--ofc-syn-keyword': '#859900',
      '--ofc-syn-source': '#6c71c4',
      '--ofc-syn-builtin': '#268bd2',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    vars: {
      '--ofc-syn-comment': '#7b88a1',
      '--ofc-syn-string': '#a3be8c',
      '--ofc-syn-number': '#b48ead',
      '--ofc-syn-draw': '#8fbcbb',
      '--ofc-syn-keyword': '#81a1c1',
      '--ofc-syn-source': '#d08770',
      '--ofc-syn-builtin': '#88c0d0',
    },
  },
];

// four representative token colors for a theme's preview swatch strip
export const themePreview = (theme) =>
  Object.keys(CLASSIC).map(k => theme.vars[k] || CLASSIC[k]);
