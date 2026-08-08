import React from 'react';
import highlightSource from './highlightSource';
import { GETTING_STARTED, HELP_SECTIONS } from 'theta-script/docs';
import { EXAMPLES } from 'theta-script/examples';

// Docs panel for the script editor: the language reference and the example
// browser as tabs of one view. Code cells run through the same syntax
// highlighter as the editor mirror, so the docs read like the editor.

// read-only hex rendering: a swatch chip instead of the editor's clickable
// color token
const docHex = (val, start, key) => (
  <span key={key} className="ofc-docs-hex">
    <i style={{ backgroundColor: val }} />
    {val}
  </span>
);

const Code = ({ src }) => <>{highlightSource(src, docHex)}</>;

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const ReferenceTab = () => {
  const [active, setActive] = React.useState(HELP_SECTIONS[0].title);
  const [q, setQ] = React.useState('');
  const bodyRef = React.useRef(null);
  const secRefs = React.useRef({});
  const query = q.trim().toLowerCase();
  // all sections stack in one scroll; searching narrows to matched rows
  const sections = query
    ? HELP_SECTIONS
      .map(sec => ({ ...sec, rows: sec.rows.filter(([c, d]) => `${c} ${d}`.toLowerCase().includes(query)) }))
      .filter(sec => sec.rows.length)
    : HELP_SECTIONS;

  // nav items jump-scroll; a frame later so a cleared search has re-rendered
  const jump = (title) => {
    setQ('');
    setActive(title);
    requestAnimationFrame(() => secRefs.current[title]?.scrollIntoView({ block: 'start' }));
  };

  // scroll-spy: highlight the last section whose top has passed the viewport;
  // at the very bottom the final section wins even though it can't reach the
  // top (there's nothing left to scroll)
  const onScroll = () => {
    if (query || !bodyRef.current) return;
    const body = bodyRef.current;
    let cur = HELP_SECTIONS[0].title;
    if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) {
      cur = HELP_SECTIONS[HELP_SECTIONS.length - 1].title;
    } else {
      const top = body.getBoundingClientRect().top;
      HELP_SECTIONS.forEach(sec => {
        const el = secRefs.current[sec.title];
        if (el && el.getBoundingClientRect().top - top <= 40) cur = sec.title;
      });
    }
    setActive(cur);
  };

  return (
    <div className="ofc-docs-ref">
      <nav className="ofc-docs-nav">
        <input
          className="ofc-docs-search"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {HELP_SECTIONS.map(sec => (
          <button
            key={sec.title}
            className={`ofc-docs-navitem${!query && sec.title === active ? ' ofc-active' : ''}`}
            onClick={() => jump(sec.title)}
          >
            {sec.title}
          </button>
        ))}
      </nav>
      <div className="ofc-docs-refbody" ref={bodyRef} onScroll={onScroll}>
        {sections.map(sec => (
          <section key={sec.title} ref={(el) => { secRefs.current[sec.title] = el; }}>
            <div className="ofc-docs-refsec">{sec.title}</div>
            {sec.rows.map(([code, desc]) => (
              <div key={code} className="ofc-docs-row">
                <code><Code src={code} /></code>
                <span>{desc}</span>
              </div>
            ))}
          </section>
        ))}
        {query && !sections.length && (
          <div className="ofc-docs-empty">No matches for “{q}”</div>
        )}
      </div>
    </div>
  );
};

// the walkthrough: numbered prose + code steps in a single reading column
const GettingStartedTab = () => (
  <div className="ofc-docs-guide">
    <div className="ofc-docs-guide-inner">
      {GETTING_STARTED.map((sec, si) => (
        <section key={sec.title}>
          <h3 className="ofc-docs-guide-sec">
            <span className="ofc-docs-guide-num">{si + 1}</span>
            {sec.title}
          </h3>
          {sec.body.map((item, bi) => (item.code
            ? <pre key={bi} className="ofc-docs-code"><Code src={item.code} /></pre>
            : <p key={bi}>{item.p}</p>
          ))}
        </section>
      ))}
    </div>
  </div>
);

const ExamplesTab = ({ onImport }) => {
  const [confirm, setConfirm] = React.useState(null);
  return (
    <div className="ofc-docs-cards">
      <div className="ofc-docs-cards-flow">
        {EXAMPLES.map((ex, xi) => (
          <div key={ex.name} className="ofc-docs-card">
            <div className="ofc-docs-card-head">
              <span className="ofc-docs-card-name">{ex.name}</span>
              <span className="ofc-docs-tags">
                {(ex.tags || []).map(t => <em key={t}>{t}</em>)}
              </span>
            </div>
            <div className="ofc-docs-card-blurb">{ex.blurb}</div>
            <pre className="ofc-docs-code"><Code src={ex.source} /></pre>
            <div className="ofc-docs-card-foot">
              {confirm === xi ? (
                <>
                  <span className="ofc-docs-confirm-text">Replace the editor contents?</span>
                  <button className="ofc-button ofc-docs-import" onClick={() => onImport(ex)}>Import</button>
                  <button className="ofc-button" onClick={() => setConfirm(null)}>Cancel</button>
                </>
              ) : (
                <button className="ofc-button ofc-docs-import" onClick={() => setConfirm(xi)}>
                  Import into editor
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScriptDocs = ({ tab, setTab, onClose, onImport }) => (
  <div className="ofc-script-help">
    <div className="ofc-docs-bar">
      <span className="ofc-docs-heading">Script Language</span>
      <div className="ofc-docs-tabs">
        <button className={tab === 'reference' ? 'ofc-active' : ''} onClick={() => setTab('reference')}>
          Reference
        </button>
        <button className={tab === 'guide' ? 'ofc-active' : ''} onClick={() => setTab('guide')}>
          Getting Started
        </button>
        <button className={tab === 'examples' ? 'ofc-active' : ''} onClick={() => setTab('examples')}>
          Examples
        </button>
      </div>
      <button className="ofc-script-help-close" onClick={onClose}><CloseIcon /></button>
    </div>
    {tab === 'reference' ? <ReferenceTab />
      : tab === 'guide' ? <GettingStartedTab />
        : <ExamplesTab onImport={onImport} />}
  </div>
);

export default ScriptDocs;
