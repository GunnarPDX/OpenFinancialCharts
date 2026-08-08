import React from 'react';
import { CloseIcon } from '../icons';
import ColorPicker from './ColorPicker';
import useClickOutside from '../../utils/useClickOutside';
import { BUILTIN_THEMES, THEME_VAR_GROUPS, readBuiltinThemeVars } from './themeVars';

// Centered popup for authoring a custom theme: pick a built-in theme as the
// starting point, then adjust each variable via swatch (hex picks) or the raw
// text field (any CSS color — rgba borders/grids keep their alpha this way).
// Edits apply live through onPreview so the chart shows the theme while it's
// being built; the caller reverts on cancel.
const ThemeBuilder = ({ initial, existingNames, onSave, onDelete, onClose, onPreview }) => {
  const editing = !!initial;
  const [name, setName] = React.useState(initial?.name || '');
  const [baseTheme, setBaseTheme] = React.useState('default');
  const [vars, setVars] = React.useState(() => (
    initial ? { ...initial.vars } : readBuiltinThemeVars('default')
  ));
  const rootRef = React.useRef(null);

  useClickOutside(rootRef, onClose, true);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const preview = (next) => { setVars(next); onPreview?.(next); };
  const setVar = (v, value) => preview({ ...vars, [v]: value });

  const seedFrom = (themeName) => {
    setBaseTheme(themeName);
    preview(readBuiltinThemeVars(themeName));
  };

  const trimmed = name.trim();
  // renaming onto ANOTHER existing theme would silently overwrite it (save
  // upserts by name) — only the theme's own current name is exempt
  const taken = existingNames.includes(trimmed) && trimmed !== initial?.name;
  const canSave = !!trimmed && !taken;
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  return (
    <div className="ofc-shortcuts-pop ofc-theme-builder" ref={rootRef}>
      <div className="ofc-shortcuts-bar">
        <span>{editing ? 'Edit Custom Theme' : 'New Custom Theme'}</span>
        <button className="ofc-shortcuts-close" onClick={onClose}>
          <CloseIcon/>
        </button>
      </div>
      <div className="ofc-theme-builder-body">
        <div className="ofc-theme-builder-row">
          <span className="ofc-theme-builder-label">Name</span>
          <input
            className="ofc-study-search ofc-theme-builder-name"
            type="text"
            placeholder="My theme…"
            value={name}
            autoFocus={!editing}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {taken && <div className="ofc-theme-builder-error">A theme with this name already exists.</div>}
        <div className="ofc-theme-builder-row">
          <span className="ofc-theme-builder-label">Start from</span>
          <select value={baseTheme} onChange={(e) => seedFrom(e.target.value)}>
            {BUILTIN_THEMES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="ofc-theme-builder-row">
          <span className="ofc-theme-builder-label">Native widgets</span>
          <select
            value={vars['--color-scheme'] || 'dark'}
            onChange={(e) => setVar('--color-scheme', e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        {THEME_VAR_GROUPS.map(({ group, items }) => (
          <React.Fragment key={group}>
            <div className="ofc-dropdown-section-title">{group}</div>
            {items.map(([v, label]) => (
              <div key={v} className="ofc-theme-builder-row">
                <span className="ofc-theme-builder-label">{label}</span>
                <input
                  className="ofc-study-search ofc-theme-builder-value"
                  type="text"
                  spellCheck={false}
                  value={vars[v] || ''}
                  onChange={(e) => setVar(v, e.target.value)}
                />
                <ColorPicker
                  drop="down"
                  value={vars[v] || ''}
                  onChange={(c) => setVar(v, c)}
                />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className="ofc-theme-builder-actions">
        {editing && (
          <button
            className={`ofc-button${confirmDelete ? ' ofc-draw-confirm-delete' : ''}`}
            onClick={() => (confirmDelete ? onDelete(initial.name) : setConfirmDelete(true))}
          >
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        )}
        <span className="ofc-theme-builder-spacer" />
        <button className="ofc-button" onClick={onClose}>Cancel</button>
        <button
          className="ofc-button"
          disabled={!canSave}
          onClick={() => onSave({ name: trimmed, vars })}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default ThemeBuilder;
