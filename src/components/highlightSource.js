import React from 'react';
import { BUILTIN_NAMES as LANG_BUILTINS, SOURCE_NAMES } from 'theta-script/builtins';
import { DRAW_FN_NAMES, KEYWORD_NAMES } from 'theta-script';

// token classes come from the language package itself, so the highlighter
// can't drift from what the runtime actually accepts
const DRAW_FNS = new Set(DRAW_FN_NAMES);
const KEYWORDS = new Set(KEYWORD_NAMES);
const SOURCES = new Set(SOURCE_NAMES);
const BUILTIN_NAMES = new Set(LANG_BUILTINS);

// builds the syntax-highlighted mirror of `source` as an array of strings and
// styled spans. Hex color tokens (including those inside strings) render via
// renderHex(value, start, key) so callers can keep them clickable.
export default function highlightSource(source, renderHex) {
  const HEX_RE = /#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}(?![0-9a-fA-F])/g;
  const HL_RE = /(\/\/[^\n]*)|("[^"\n]*"?|'[^'\n]*'?)|(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}(?![0-9a-fA-F]))|(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)/g;
  const parts = [];
  let last = 0, m2, k2 = 0;
  while ((m2 = HL_RE.exec(source))) {
    if (m2.index > last) parts.push(source.slice(last, m2.index));
    const tok = m2[0];
    if (m2[1] != null) {
      parts.push(<span key={k2++} className="ofc-tok-comment">{tok}</span>);
    } else if (m2[2] != null) {
      // string: keep any hex colors inside it clickable
      let sLast = 0, hm;
      const inner = [];
      HEX_RE.lastIndex = 0;
      while ((hm = HEX_RE.exec(tok))) {
        if (hm.index > sLast) inner.push(tok.slice(sLast, hm.index));
        inner.push(renderHex(hm[0], m2.index + hm.index, k2++));
        sLast = hm.index + hm[0].length;
      }
      inner.push(tok.slice(sLast));
      parts.push(<span key={k2++} className="ofc-tok-string">{inner}</span>);
    } else if (m2[3] != null) {
      parts.push(renderHex(tok, m2.index, k2++));
    } else if (m2[4] != null) {
      parts.push(<span key={k2++} className="ofc-tok-number">{tok}</span>);
    } else {
      const cls = DRAW_FNS.has(tok) ? 'ofc-tok-draw'
        : KEYWORDS.has(tok) ? 'ofc-tok-keyword'
          : SOURCES.has(tok) ? 'ofc-tok-source'
            : BUILTIN_NAMES.has(tok) ? 'ofc-tok-builtin' : null;
      parts.push(cls ? <span key={k2++} className={cls}>{tok}</span> : tok);
    }
    last = m2.index + tok.length;
  }
  parts.push(source.slice(last));
  return parts;
}
