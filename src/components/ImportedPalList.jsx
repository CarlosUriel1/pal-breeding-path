import { useMemo, useState } from 'react';
import { palsById } from '../engine/breeding.js';
import {
  alternatePassiveName,
  createPassiveLookup,
  getPassiveMeta,
  normalizeText,
  passiveName,
  rankTone,
} from '../data/passiveCatalog.js';

const copy = {
  es: {
    title: 'Tus Pals importados',
    search: 'Nombre, apodo, pasiva o sexo…',
    empty: 'Ningún Pal coincide con la búsqueda.',
    level: 'Nv.',
    noPassives: 'Sin pasivas',
    favorite: 'Favorito',
    alpha: 'ALFA',
    location: { palbox: 'Palbox', party: 'Equipo', dimensional: 'Alm. dimensional', 'base-or-other': 'Base/otro', unknown: 'Ubicación desconocida' },
  },
  en: {
    title: 'Your imported Pals',
    search: 'Name, nickname, passive or sex…',
    empty: 'No Pal matches this search.',
    level: 'Lv.',
    noPassives: 'No passives',
    favorite: 'Favorite',
    alpha: 'ALPHA',
    location: { palbox: 'Palbox', party: 'Party', dimensional: 'Dimensional storage', 'base-or-other': 'Base/other', unknown: 'Unknown location' },
  },
};

const genderMark = (gender) => gender === 'M' ? '♂' : gender === 'F' ? '♀' : '?';

export default function ImportedPalList({ collection, language, customPassives }) {
  const text = copy[language] || copy.es;
  const [query, setQuery] = useState('');
  const passiveLookup = useMemo(() => createPassiveLookup(customPassives), [customPassives]);

  const rows = useMemo(() => {
    const needle = normalizeText(query);
    return [...(collection?.instances || [])]
      .map((instance) => ({ instance, pal: palsById[instance.palId] }))
      .filter(({ pal }) => pal)
      .filter(({ instance, pal }) => {
        if (!needle) return true;
        const passiveTerms = (instance.passiveIds || []).flatMap((id) => {
          const passive = getPassiveMeta(id, customPassives, passiveLookup);
          return [passive.en, passive.es, passive.esMX, id];
        });
        return normalizeText([
          pal.name,
          `#${pal.index}${pal.suffix || ''}`,
          `${pal.index}${pal.suffix || ''}`,
          instance.nickname,
          instance.gender,
          genderMark(instance.gender),
          ...passiveTerms,
        ].join(' ')).includes(needle);
      })
      .sort((a, b) =>
        a.pal.index - b.pal.index ||
        (b.instance.level || 0) - (a.instance.level || 0) ||
        a.instance.instanceId.localeCompare(b.instance.instanceId)
      );
  }, [collection, customPassives, passiveLookup, query]);

  return (
    <section className="imported-roster" aria-label={text.title}>
      <div className="roster-heading">
        <div>
          <strong>{text.title}</strong>
          <span>{collection?.instances.length || 0} Pals</span>
        </div>
      </div>
      <label className="search roster-search">
        <input type="search" value={query} placeholder={text.search} onChange={(event) => setQuery(event.target.value)} />
        <span className="counter">{rows.length}/{collection?.instances.length || 0}</span>
      </label>

      <div className="imported-pal-list">
        {rows.map(({ instance, pal }) => (
          <article className="imported-pal-card" key={instance.instanceId}>
            <span className="pal-number">#{pal.index}{pal.suffix || ''}</span>
            <img src={`/pals/${pal.icon}.png`} alt={pal.name} loading="lazy" />
            <div className="imported-pal-body">
              <div className="imported-pal-title">
                <div>
                  <strong>{instance.nickname || pal.name}</strong>
                  {instance.nickname && <small>{pal.name}</small>}
                </div>
                {instance.alphaOrBoss && <span className="alpha-badge">{text.alpha}</span>}
                {instance.favorite && <span className="fav-star" title={text.favorite} aria-label={text.favorite}>★</span>}
                <span className={`gender ${instance.gender === 'F' ? 'female' : 'male'}`}>
                  {genderMark(instance.gender)}
                </span>
              </div>
              <div className="pal-facts">
                <span>{text.level} {instance.level ?? '?'}</span>
                <span>{text.location[instance.location] || text.location.unknown}</span>
                <span>IV {instance.ivs?.hp ?? '?'} / {instance.ivs?.attack ?? '?'} / {instance.ivs?.defense ?? '?'}</span>
              </div>
              <div className="card-passives">
                {(instance.passiveIds || []).length ? instance.passiveIds.map((id) => {
                  const passive = getPassiveMeta(id, customPassives, passiveLookup);
                  return (
                    <span
                      key={id}
                      className={`mini-passive ${rankTone(passive.rank)}`}
                      title={`${passiveName(passive, language)} / ${alternatePassiveName(passive, language)}`}
                    >
                      {passiveName(passive, language)}
                    </span>
                  );
                }) : <span className="no-passives">{text.noPassives}</span>}
              </div>
            </div>
          </article>
        ))}
        {!rows.length && <div className="picker-empty">{text.empty}</div>}
      </div>
    </section>
  );
}
