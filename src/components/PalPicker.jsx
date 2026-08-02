import { useEffect, useMemo, useState } from 'react';
import { breedingPool } from '../engine/breeding.js';

const allPals = [...breedingPool].sort((a, b) => a.index - b.index || a.name.localeCompare(b.name));

const normalize = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const copy = {
  es: {
    importedSearch: 'Nombre, apodo, pasiva o sexo…', ownedSearch: 'Buscar en mis Pals…', targetSearch: 'Buscar Pal objetivo…',
    importedOnly: 'Mostrar únicamente especies importadas', showAll: 'Mostrar también especies no importadas',
    mine: 'Solo míos', all: 'Todos', clear: 'Limpiar', clearTitle: 'Quitar todos los Pals seleccionados', specimen: 'ejemplar', specimens: 'ejemplares',
  },
  en: {
    importedSearch: 'Name, nickname, passive or sex…', ownedSearch: 'Search my Pals…', targetSearch: 'Search target Pal…',
    importedOnly: 'Show imported species only', showAll: 'Also show species not imported',
    mine: 'Mine only', all: 'All', clear: 'Clear', clearTitle: 'Remove every selected Pal', specimen: 'specimen', specimens: 'specimens',
  },
};

export default function PalPicker({ mode, owned, target, collection, onToggleOwned, onSetTarget, onClearOwned, language = 'es' }) {
  const text = copy[language] || copy.es;
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => setQuery(''), [mode]);
  useEffect(() => setShowAll(false), [collection?.importedAt]);

  const importedByPal = useMemo(() => {
    const summaries = new Map();
    for (const instance of collection?.instances || []) {
      const current = summaries.get(instance.palId) || { total: 0, male: 0, female: 0, terms: [] };
      current.total++;
      if (instance.gender === 'M') current.male++;
      if (instance.gender === 'F') current.female++;
      current.terms.push(instance.nickname || '', ...(instance.passives || []), instance.gender || '');
      summaries.set(instance.palId, current);
    }
    for (const summary of summaries.values()) summary.searchText = normalize(summary.terms.join(' '));
    return summaries;
  }, [collection]);

  const filtered = useMemo(() => {
    const source = mode === 'owned' && collection && !showAll
      ? allPals.filter((pal) => importedByPal.has(pal.id))
      : allPals;
    const q = normalize(query.trim());
    if (!q) return source;
    return source.filter((p) =>
      normalize(`${p.name} #${p.index}${p.suffix || ''} ${p.index}${p.suffix || ''}`).includes(q) || (mode === 'owned' && importedByPal.get(p.id)?.searchText.includes(q))
    );
  }, [query, mode, collection, showAll, importedByPal]);

  const availableCount = mode === 'owned' && collection && !showAll ? importedByPal.size : allPals.length;

  return (
    <>
      <div className="picker-toolbar">
        <label className="search">
          <input
            type="text"
            placeholder={mode === 'owned' && collection ? text.importedSearch : mode === 'owned' ? text.ownedSearch : text.targetSearch}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="counter">
            {filtered.length} / {availableCount}
          </span>
        </label>
        {mode === 'owned' && (
          <>
            {collection && (
              <button
                className="btn-ghost"
                onClick={() => setShowAll((value) => !value)}
                title={showAll ? text.importedOnly : text.showAll}
              >
                {showAll ? text.mine : text.all}
              </button>
            )}
            <button className="btn-ghost" onClick={onClearOwned} title={text.clearTitle}>
              {text.clear}
            </button>
          </>
        )}
      </div>
      <div className="pal-grid">
        {filtered.map((pal) => {
          const isOwned = owned.has(pal.id);
          const isTarget = target === pal.id;
          const imported = importedByPal.get(pal.id);
          return (
            <button
              key={pal.id}
              type="button"
              aria-pressed={mode === 'owned' ? isOwned : isTarget}
              className={`pal-cell${isOwned ? ' owned' : ''}${isTarget ? ' is-target' : ''}`}
              onClick={() => (mode === 'owned' ? onToggleOwned(pal.id) : onSetTarget(pal.id))}
              title={imported ? `${pal.name}: ${imported.total} ${imported.total === 1 ? text.specimen : text.specimens}` : pal.name}
            >
              <span className="pal-number">#{pal.index}{pal.suffix || ''}</span>
              <img src={`/pals/${pal.icon}.png`} alt={pal.name} loading="lazy" />
              <span className="name">{pal.name}</span>
              {mode === 'owned' && imported && (
                <span className="owned-meta">
                  ×{imported.total} · {imported.male}♂ {imported.female}♀
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
