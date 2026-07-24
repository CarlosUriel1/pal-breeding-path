import { useMemo, useState } from 'react';
import { breedingPool } from '../engine/breeding.js';

const allPals = [...breedingPool].sort((a, b) => a.index - b.index || a.name.localeCompare(b.name));

const normalize = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function PalPicker({ mode, owned, target, onToggleOwned, onSetTarget, onClearOwned }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return allPals;
    return allPals.filter((p) => normalize(p.name).includes(q));
  }, [query]);

  return (
    <>
      <div className="picker-toolbar">
        <label className="search">
          <input
            type="text"
            placeholder={mode === 'owned' ? 'Buscar en mis Pals…' : 'Buscar Pal objetivo…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="counter">
            {filtered.length} / {allPals.length}
          </span>
        </label>
        {mode === 'owned' && (
          <button className="btn-ghost" onClick={onClearOwned} title="Quitar todos los Pals seleccionados">
            Limpiar
          </button>
        )}
      </div>
      <div className="pal-grid">
        {filtered.map((pal) => {
          const isOwned = owned.has(pal.id);
          const isTarget = target === pal.id;
          return (
            <button
              key={pal.id}
              className={`pal-cell${isOwned ? ' owned' : ''}${isTarget ? ' is-target' : ''}`}
              onClick={() => (mode === 'owned' ? onToggleOwned(pal.id) : onSetTarget(pal.id))}
              title={pal.name}
            >
              <img src={`/pals/${pal.icon}.png`} alt={pal.name} loading="lazy" />
              <span className="name">{pal.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
