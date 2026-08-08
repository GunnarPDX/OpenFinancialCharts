import React from 'react';

// double-click settings dialog for long/short position drawings
const PositionEditDialog = ({ posEdit, setPosEdit, drawings, updateDrawing }) => {
  if (!posEdit) return null;
  const d = drawings.find(x => x.id === posEdit.id);
  if (!d || (d.type !== 'long_pos' && d.type !== 'short_pos')) return null;
  const f = posEdit.form;
  const dir = d.type === 'long_pos' ? 1 : -1;
  const TICK = 0.01;
  const set = (k, v) => setPosEdit(pe => ({ ...pe, form: { ...pe.form, [k]: v } }));
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const heading = (t) => (
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
      color: 'var(--text-faint)', margin: '10px 0 4px' }}>{t}</div>
  );
  return (
    <div className="ofc-study-editor ofc-draw-menu" style={{ left: posEdit.x, top: posEdit.y }}>
      <div className="ofc-study-editor-title">{d.type === 'long_pos' ? 'Long Position' : 'Short Position'}</div>
      <label>Account size
        <input type="number" value={f.acct} onChange={(e) => set('acct', num(e.target.value))} />
      </label>
      <label>Lot size
        <input type="number" value={f.lot} onChange={(e) => set('lot', num(e.target.value))} />
      </label>
      <label>Risk
        <span style={{ display: 'flex', gap: 4 }}>
          <input type="number" style={{ width: 66 }} value={f.risk} onChange={(e) => set('risk', num(e.target.value))} />
          <select style={{ width: 50 }} value={f.riskUnit} onChange={(e) => set('riskUnit', e.target.value)}>
            <option value="%">%</option>
            <option value="cash">Cash</option>
          </select>
        </span>
      </label>
      <label>Entry price
        <input type="number" value={f.entry} onChange={(e) => set('entry', num(e.target.value))} />
      </label>
      <label>Leverage
        <input type="number" value={f.lev} onChange={(e) => set('lev', num(e.target.value))} />
      </label>
      {heading('Profit Level')}
      <label>Ticks
        <input type="number" value={Math.round(Math.abs(f.tp - f.entry) / TICK)}
          onChange={(e) => set('tp', f.entry + dir * Math.abs(num(e.target.value)) * TICK)} />
      </label>
      <label>Price
        <input type="number" value={f.tp} onChange={(e) => set('tp', num(e.target.value))} />
      </label>
      {heading('Stop Level')}
      <label>Ticks
        <input type="number" value={Math.round(Math.abs(f.entry - f.sl) / TICK)}
          onChange={(e) => set('sl', f.entry - dir * Math.abs(num(e.target.value)) * TICK)} />
      </label>
      <label>Price
        <input type="number" value={f.sl} onChange={(e) => set('sl', num(e.target.value))} />
      </label>
      <label>QTY precision
        <select value={f.qp} onChange={(e) => set('qp', e.target.value)}>
          {['Default', '0', '1', '2', '3', '4'].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
      <div className="ofc-study-editor-actions">
        <button className="ofc-button" onClick={() => setPosEdit(null)}>Cancel</button>
        <button className="ofc-button" onClick={() => {
          updateDrawing(posEdit.id, {
            y1: f.entry, y2: f.tp, stop: f.sl,
            acct: f.acct, lot: f.lot, risk: f.risk, riskUnit: f.riskUnit, lev: f.lev, qp: f.qp,
          });
          setPosEdit(null);
        }}>Ok</button>
      </div>
    </div>
  );
};

export default PositionEditDialog;
