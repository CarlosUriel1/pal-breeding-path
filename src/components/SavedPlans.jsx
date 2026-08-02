import { palsById } from '../engine/breeding.js';
import { createPassiveLookup, getPassiveMeta, passiveName, rankTone } from '../data/passiveCatalog.js';

const copy = {
  es: {
    empty: 'No tienes rutas guardadas todavía.', load: 'Cargar', remove: 'Borrar', imported: 'colección importada', manual: 'selección manual',
    crosses: (name, count) => `${name} en ${count} cruce${count === 1 ? '' : 's'} planificado${count === 1 ? '' : 's'}`,
    unavailable: 'Importa de nuevo la colección original para recalcular esta ruta.',
  },
  en: {
    empty: 'You do not have saved paths yet.', load: 'Load', remove: 'Delete', imported: 'imported collection', manual: 'manual selection',
    crosses: (name, count) => `${name} in ${count} planned breeding step${count === 1 ? '' : 's'}`,
    unavailable: 'Import the original collection again to recalculate this path.',
  },
};

export default function SavedPlans({ saved, onLoad, onDelete, language, customPassives, collectionFingerprint, collectionImportedAt }) {
  const text = copy[language] || copy.es;
  const lookup = createPassiveLookup(customPassives);
  if (!saved.length) return <div className="empty-state">{text.empty}</div>;

  return (
    <div className="saved-list">
      {saved.map((item) => {
        const target = palsById[item.targetId];
        if (!target) return null;
        const collectionMatches = item.sourceMode !== 'import' || (Boolean(collectionFingerprint) && (item.collectionFingerprint
          ? item.collectionFingerprint === collectionFingerprint
          : item.collectionImportedAt === collectionImportedAt));
        const title = Number.isFinite(item.breedingCount)
          ? text.crosses(target.name, item.breedingCount)
          : item.name || target.name;
        return (
          <article className="saved-item saved-plan" key={item.id}>
            <img src={`/pals/${target.icon}.png`} alt={target.name} />
            <span className="title">
              {title}
              <div className="saved-passives">
                {(item.desiredPassiveIds || []).map((id) => {
                  const passive = getPassiveMeta(id, customPassives, lookup);
                  return <span key={id} className={rankTone(passive.rank)}>{passiveName(passive, language)}</span>;
                })}
              </div>
              <div className="meta">
                {item.sourceMode === 'import' ? text.imported : text.manual} · {new Date(item.savedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'es-MX')}
              </div>
              {!collectionMatches && <div className="saved-warning">{text.unavailable}</div>}
            </span>
            <button type="button" className="btn-accent" disabled={!collectionMatches} onClick={() => onLoad(item)}>{text.load}</button>
            <button type="button" className="btn-ghost" onClick={() => onDelete(item.id)}>{text.remove}</button>
          </article>
        );
      })}
    </div>
  );
}
