import { palsById } from '../engine/breeding.js';
import { createPassiveLookup, getPassiveMeta, passiveName, rankTone } from '../data/passiveCatalog.js';

const copy = {
  es: {
    imported: 'IMPORTADOS', manual: 'MANUAL', pals: 'Pals', chooseSource: 'Elige origen',
    importEmpty: 'IMPORTAR SAVE', target: 'OBJETIVO', chooseTarget: 'Elegir objetivo', passives: 'Pasivas deseadas', addPassive: '+ Añadir pasivas',
    importOnly: 'Disponible con un save importado',
  },
  en: {
    imported: 'IMPORTED', manual: 'MANUAL', pals: 'Pals', chooseSource: 'Choose source',
    importEmpty: 'IMPORT SAVE', target: 'TARGET', chooseTarget: 'Choose target', passives: 'Desired passives', addPassive: '+ Add passives',
    importOnly: 'Available with an imported save',
  },
};

export default function FlowSelector({
  panel,
  onPanel,
  collection,
  owned,
  target,
  desiredPassiveIds,
  language,
  customPassives,
  sourceMode,
  passiveOpen = false,
}) {
  const text = copy[language] || copy.es;
  const targetPal = target ? palsById[target] : null;
  const sourceCount = sourceMode === 'import' ? (collection?.instances.length || 0) : owned.size;
  const sourceIcons = sourceMode === 'import' && collection
    ? [...new Set(collection.instances.map((pal) => pal.palId))].slice(0, 2)
    : sourceMode === 'manual' ? [...owned].slice(0, 2) : [];
  const passiveLookup = createPassiveLookup(customPassives);

  return (
    <section className="flow-selector" aria-label="Breeding Path setup">
      <div className="flow-main-row">
        <button
          type="button"
          className={`flow-card source${panel === 'source' ? ' active' : ''}`}
          aria-pressed={panel === 'source'}
          onClick={() => onPanel('source')}
        >
          <span className="flow-icons">
            {sourceIcons.length ? sourceIcons.map((id) => {
              const pal = palsById[id];
              return pal ? <img key={id} src={`/pals/${pal.icon}.png`} alt="" /> : null;
            }) : <b>+</b>}
          </span>
          <strong>{sourceCount ? `${sourceCount} ${text.pals}` : text.chooseSource}</strong>
          <small>{sourceMode === 'import' ? (collection ? text.imported : text.importEmpty) : text.manual}</small>
        </button>

        <span className="flow-arrow">→</span>

        <button
          type="button"
          className={`flow-card target${panel === 'target' ? ' active' : ''}`}
          aria-pressed={panel === 'target'}
          onClick={() => onPanel('target')}
        >
          <span className="flow-icons single">
            {targetPal ? <img src={`/pals/${targetPal.icon}.png`} alt="" /> : <b>+</b>}
          </span>
          <strong>{targetPal?.name || text.chooseTarget}</strong>
          <small>{text.target}</small>
        </button>
      </div>

      <button
        type="button"
        className={`passive-flow-button${passiveOpen ? ' active' : ''}`}
        aria-pressed={passiveOpen}
        disabled={sourceMode !== 'import' || !collection}
        onClick={() => onPanel('passives')}
      >
        {sourceMode !== 'import' ? <span>{text.importOnly}</span> : desiredPassiveIds.length ? (
          <span className="flow-passive-chips">
            {desiredPassiveIds.map((id) => {
              const passive = getPassiveMeta(id, customPassives, passiveLookup);
              return <span key={id} className={rankTone(passive.rank)}>{passiveName(passive, language)}</span>;
            })}
          </span>
        ) : <span>{text.addPassive}</span>}
        <small>{sourceMode === 'import' && desiredPassiveIds.length ? `${desiredPassiveIds.length}/4 · ${text.passives}` : text.passives}</small>
      </button>
    </section>
  );
}
