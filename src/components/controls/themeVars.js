// Shared catalog for the theme system: the built-in theme list (settings
// menu + theme builder) and the CSS custom properties a theme can set — the
// union of everything the built-in themes in styles/vars.css override, so
// custom themes have full parity with the built-ins.

export const BUILTIN_THEMES = [
  ['default', 'Default'],
  ['dark', 'Dark'],
  ['submariner', 'Submariner'],
  ['bloodbath', 'Max Pain'],
  ['ash', 'Ash'],
  ['soft', 'Soft'],
  ['warm', 'Warm'],
  ['light', 'Light'],
];

export const THEME_VAR_GROUPS = [
  {
    group: 'Text',
    items: [
      ['--text', 'Text'],
      ['--text-subtle', 'Subtle text'],
      ['--text-faint', 'Faint text'],
    ],
  },
  {
    group: 'Surfaces',
    items: [
      ['--background', 'Chart background'],
      ['--background-dark', 'Page background'],
      ['--menu-background', 'Menus'],
      ['--input-background', 'Inputs'],
      ['--button-background', 'Buttons'],
      ['--button-active-background', 'Buttons (active)'],
    ],
  },
  {
    group: 'Lines',
    items: [
      ['--border', 'Borders'],
      ['--grid-lines', 'Grid lines'],
      ['--axis-lines', 'Axis lines'],
      ['--dots-color', 'Dots accent'],
    ],
  },
];

export const THEME_VARS = THEME_VAR_GROUPS.flatMap(g => g.items.map(([v]) => v));

// custom themes are stored as { name, vars } and selected via 'custom:<name>'
export const CUSTOM_PREFIX = 'custom:';
export const customThemeValue = (t) => `${CUSTOM_PREFIX}${t.name}`;
export const findCustomTheme = (themes, value) =>
  (value || '').startsWith(CUSTOM_PREFIX)
    ? themes.find(t => customThemeValue(t) === value) || null
    : null;

// Resolve a built-in theme's actual values by computing styles on a throwaway
// element carrying the theme class (var() chains resolve to concrete colors).
// Returns {} where computed styles are unavailable (jsdom).
export const readBuiltinThemeVars = (themeName) => {
  if (typeof document === 'undefined') return {};
  const el = document.createElement('div');
  if (themeName && themeName !== 'default') el.className = `ofc-theme-${themeName}`;
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const out = {};
  [...THEME_VARS, '--color-scheme'].forEach(v => {
    const val = cs.getPropertyValue(v).trim();
    if (val) out[v] = val;
  });
  document.body.removeChild(el);
  return out;
};
