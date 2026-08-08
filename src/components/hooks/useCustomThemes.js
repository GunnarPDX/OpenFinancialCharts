import React from 'react';

// User-authored themes: { name, vars: { '--background': ..., ... } },
// selected via the 'custom:<name>' theme value (the `theme` state itself
// lives in the provider). Split out of ChartContext for readability only —
// state shape and persistence are unchanged.
const useCustomThemes = (saved, setTheme) => {
  const [customThemes, setCustomThemes] = React.useState(saved.customThemes ?? []);

  const saveCustomTheme = React.useCallback((t) => setCustomThemes(list => (
    list.some(x => x.name === t.name)
      ? list.map(x => (x.name === t.name ? { ...x, ...t } : x))
      : [...list, t]
  )), []);

  const deleteCustomTheme = React.useCallback((name) => {
    setCustomThemes(list => list.filter(x => x.name !== name));
    // deleting the active theme falls back to the default look
    setTheme(cur => (cur === `custom:${name}` ? 'default' : cur));
  }, [setTheme]);

  // live preview vars while the theme builder is open (never persisted);
  // non-null overrides the selected theme on the wrapper
  const [themePreview, setThemePreview] = React.useState(null);

  return { customThemes, saveCustomTheme, deleteCustomTheme, themePreview, setThemePreview };
};

export default useCustomThemes;
