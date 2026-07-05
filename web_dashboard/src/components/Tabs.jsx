// Grouped, accessible tab switcher (WAI-ARIA tabs pattern with arrow-key nav).
// `groups` = [{ label, tabs: [{ id, title, n_tests }] }].
import React, { useRef } from 'react';

export default function Tabs({ groups, active, onChange }) {
  const refs = useRef({});
  const ids = groups.flatMap((g) => g.tabs.map((t) => t.id));

  function onKeyDown(e) {
    const idx = ids.indexOf(active);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = ids[(idx + 1) % ids.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = ids[(idx - 1 + ids.length) % ids.length];
    else if (e.key === 'Home') next = ids[0];
    else if (e.key === 'End') next = ids[ids.length - 1];
    if (next) {
      e.preventDefault();
      onChange(next);
      refs.current[next]?.focus();
    }
  }

  return (
    <div className="tabs" role="tablist" aria-label="Test type" onKeyDown={onKeyDown}>
      {groups.map((g) => (
        <div className="tabgroup" key={g.label}>
          <span className="tabgroup__label">{g.label}</span>
          <div className="tabgroup__tabs">
            {g.tabs.map((t) => {
              const selected = t.id === active;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    refs.current[t.id] = el;
                  }}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`tab${selected ? ' tab--active' : ''}`}
                  onClick={() => onChange(t.id)}
                >
                  <span className="tab__title">{t.title}</span>
                  {typeof t.n_tests === 'number' && <span className="tab__badge">{t.n_tests}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
