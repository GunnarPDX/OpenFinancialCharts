import React from 'react';

// text-entry dialog for text drawings (txt/note/callout/table/…)
const TextEditDialog = ({ textEdit, setTextEdit, drawings, updateDrawing, removeDrawing }) => {
  if (!textEdit) return null;
  const d = drawings.find(x => x.id === textEdit.id);
  if (!d) return null;
  const commit = () => {
    updateDrawing(textEdit.id, { text: textEdit.value });
    setTextEdit(null);
  };
  const cancel = () => {
    if (textEdit.isNew) removeDrawing(textEdit.id);
    setTextEdit(null);
  };
  return (
    <div className="ofc-study-editor ofc-draw-menu" style={{ left: textEdit.x, top: textEdit.y }}>
      <div className="ofc-study-editor-title">Text</div>
      <textarea
        autoFocus rows={d.type === 'tableD' ? 5 : 3}
        value={textEdit.value}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-background)',
          color: 'var(--text-subtle)', border: '1px solid var(--border)', borderRadius: 3,
          padding: 5, resize: 'vertical', font: 'inherit' }}
        onChange={(e) => setTextEdit(te => ({ ...te, value: e.target.value }))}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
          if (e.key === 'Escape') cancel();
        }}
      />
      {d.type === 'tableD' && (
        <div style={{ fontSize: 10, color: 'var(--text-faint)', margin: '4px 0' }}>
          One row per line, cells split with |
        </div>
      )}
      <div className="ofc-study-editor-actions">
        <button className="ofc-button" onClick={cancel}>Cancel</button>
        <button className="ofc-button" onClick={commit}>Ok</button>
      </div>
    </div>
  );
};

export default TextEditDialog;
