import { useMemo, useState } from 'react';
import { breedingPool } from '../engine/breeding.js';
import { normalizeText } from '../data/passiveCatalog.js';

const allPals = [...breedingPool].sort((a, b) => a.index - b.index || a.name.localeCompare(b.name));

const copy = {
  es: { title: 'Elige el Pal objetivo', search: 'Buscar Pal objetivo…' },
  en: { title: 'Choose the target Pal', search: 'Search target Pal…' },
};

export default function TargetPicker({ target, onSetTarget, language }) {
  const text = copy[language] || copy.es;
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = normalizeText(query);
    return needle ? allPals.filter((pal) => normalizeText(`${pal.name} #${pal.index}${pal.suffix || ''} ${pal.index}${pal.suffix || ''}`).includes(needle)) : allPals;
  }, [query]);

  return (
    <section className="target-picker" aria-label={text.title}>
      <div className="section-heading compact-heading">
        <strong>{text.title}</strong>
      </div>
      <label className="search target-search">
        <input type="search" value={query} placeholder={text.search} onChange={(event) => setQuery(event.target.value)} />
        <span className="counter">{filtered.length}/{allPals.length}</span>
      </label>
      <div className="target-grid">
        {filtered.map((pal) => (
          <button
            type="button"
            key={pal.id}
            className={`target-cell${target === pal.id ? ' selected' : ''}`}
            aria-pressed={target === pal.id}
            onClick={() => onSetTarget(pal.id)}
          >
            <span className="pal-number">#{pal.index}{pal.suffix || ''}</span>
            <img src={`/pals/${pal.icon}.png`} alt={pal.name} loading="lazy" />
            <span>{pal.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
