import { useEffect, useMemo, useState } from 'react';
import { palsById, findShortestPath } from './engine/breeding.js';
import PalPicker from './components/PalPicker.jsx';
import PathView from './components/PathView.jsx';
import TreeView from './components/TreeView.jsx';
import SavedPaths from './components/SavedPaths.jsx';

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const [mode, setMode] = useState('owned'); // 'owned' | 'target'
  const [view, setView] = useState('path'); // 'path' | 'tree' | 'saved'
  const [owned, setOwned] = useState(() => new Set(load('pal.owned', [])));
  const [target, setTarget] = useState(() => load('pal.target', null));
  const [saved, setSaved] = useState(() => load('pal.saved', []));

  useEffect(() => localStorage.setItem('pal.owned', JSON.stringify([...owned])), [owned]);
  useEffect(() => localStorage.setItem('pal.target', JSON.stringify(target)), [target]);
  useEffect(() => localStorage.setItem('pal.saved', JSON.stringify(saved)), [saved]);

  const result = useMemo(
    () => (target && owned.size >= 2 ? findShortestPath([...owned], target) : null),
    [owned, target]
  );

  const toggleOwned = (id) =>
    setOwned((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const savePath = () => {
    if (!result || !target) return;
    const item = {
      id: crypto.randomUUID(),
      name: `${palsById[target].name} en ${result.steps.length} cruza${result.steps.length === 1 ? '' : 's'}`,
      ownedIds: [...owned],
      targetId: target,
      savedAt: Date.now(),
    };
    setSaved((prev) => [item, ...prev]);
    setView('saved');
  };

  const loadPath = (item) => {
    setOwned(new Set(item.ownedIds));
    setTarget(item.targetId);
    setView('path');
  };

  const targetPal = target ? palsById[target] : null;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>
            Palworld Breeding Path
            <span className="chip">local</span>
          </h1>
          <p>La ruta más corta desde tus Pals hasta tu objetivo.</p>
        </div>
        <div className="mode-tabs">
          <button className={`mode-tab${mode === 'owned' ? ' active' : ''}`} onClick={() => setMode('owned')}>
            <span className="label">
              Mis Pals {owned.size > 0 && <span className="count">({owned.size})</span>}
            </span>
            <span className="hint">Elige tu origen</span>
          </button>
          <button
            className={`mode-tab target-mode${mode === 'target' ? ' active' : ''}`}
            onClick={() => setMode('target')}
          >
            <span className="label">{targetPal ? targetPal.name : 'Objetivo'}</span>
            <span className="hint">Elige tu objetivo</span>
          </button>
        </div>
        <PalPicker
          mode={mode}
          owned={owned}
          target={target}
          onToggleOwned={toggleOwned}
          onSetTarget={setTarget}
          onClearOwned={() => setOwned(new Set())}
        />
      </aside>

      <main className="main">
        <div className="view-tabs">
          <button className={`view-tab${view === 'path' ? ' active' : ''}`} onClick={() => setView('path')}>
            Ruta de crianza
          </button>
          <button className={`view-tab${view === 'tree' ? ' active' : ''}`} onClick={() => setView('tree')}>
            Árbol de crianza
          </button>
          <button className={`view-tab${view === 'saved' ? ' active' : ''}`} onClick={() => setView('saved')}>
            Guardadas {saved.length > 0 && `(${saved.length})`}
          </button>
        </div>

        {view === 'saved' ? (
          <SavedPaths saved={saved} onLoad={loadPath} onDelete={(id) => setSaved((p) => p.filter((s) => s.id !== id))} />
        ) : !targetPal ? (
          <div className="empty-state">Elige un Pal objetivo en el panel de la izquierda.</div>
        ) : owned.size < 2 ? (
          <div className="empty-state">Selecciona al menos 2 Pals en «Mis Pals».</div>
        ) : !result ? (
          <div className="empty-state">
            No hay ruta de crianza posible desde tus Pals hasta {targetPal.name}.
          </div>
        ) : (
          <>
            <div className="result-summary">
              <span className="score">
                {targetPal.name} en <b>{result.steps.length}</b> cruza{result.steps.length === 1 ? '' : 's'}
              </span>
              <button className="btn-accent" onClick={savePath}>
                Guardar ruta
              </button>
            </div>
            {view === 'path' ? <PathView steps={result.steps} /> : <TreeView tree={result.tree} />}
          </>
        )}
      </main>
    </div>
  );
}
