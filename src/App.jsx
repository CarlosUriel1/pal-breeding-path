import { useEffect, useMemo, useRef, useState } from 'react';
import { findShortestPath, palsById } from './engine/breeding.js';
import { requestCollectionPlan } from './engine/plannerClient.js';
import { deleteCollection, loadCollection, saveCollection } from './import/collectionStore.js';
import { availablePassivesFromCollection } from './data/passiveCatalog.js';
import CollectionPlanView from './components/CollectionPlanView.jsx';
import FlowSelector from './components/FlowSelector.jsx';
import HelpDrawer from './components/HelpDrawer.jsx';
import PassivePicker from './components/PassivePicker.jsx';
import PathView from './components/PathView.jsx';
import SavedPlans from './components/SavedPlans.jsx';
import SourcePanel from './components/SourcePanel.jsx';
import TargetPicker from './components/TargetPicker.jsx';
import TreeView from './components/TreeView.jsx';

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento bloqueado: la app sigue funcionando sin persistir
  }
};

const fingerprintCollection = (value) => {
  if (!value) return null;
  const source = value.source || {};
  return [source.size || 0, source.lastModified || 0, value.instances?.length || 0, value.speciesIds?.length || 0].join(':');
};

const copy = {
  es: {
    subtitle: 'Ruta por especie, sexo y pasivas desde tus Pals reales',
    tree: 'Árbol de crianza', path: 'Ruta de crianza', saved: 'Guardadas', save: 'Guardar ruta',
    chooseTarget: 'Elige un Pal objetivo en el panel de la izquierda.',
    importFirst: 'Importa un guardado para calcular con ejemplares, sexo y pasivas reales.',
    chooseOwned: 'Selecciona al menos 2 especies en el modo manual.',
    noRoute: 'No se encontró una ruta compatible con las especies, sexos y pasivas disponibles.',
    noManualRoute: (name) => `No hay ruta de crianza posible desde tus especies hasta ${name}.`,
    planning: 'Buscando una ruta compatible…', explored: (count) => `${count || 0} estados revisados`,
    crosses: (name, count) => `${name} en ${count} cruce${count === 1 ? '' : 's'} planificado${count === 1 ? '' : 's'}`,
    speciesOk: 'Especie objetivo', sexOk: 'Sexo compatible', passivesOk: (count) => `${count}/4 pasivas`,
    probabilistic: 'Plan recomendado: la especie y el sexo son compatibles; la herencia de pasivas es probabilística. Repite cada cruce hasta conservar las pasivas indicadas.',
    ownedTarget: (name) => `Ya tienes un ${name} con todas las pasivas solicitadas.`,
    reasons: {
      'invalid-target': 'El objetivo no es criable con los datos locales.',
      'too-many-passives': 'Selecciona como máximo cuatro pasivas.',
      'no-compatible-pals': 'El guardado no contiene una pareja de sexos compatible.',
      'missing-passives': 'Una pasiva seleccionada ya no está disponible en la colección.',
      'passives-on-discarded': 'Una pasiva seleccionada solo existe en ejemplares descartados (especie o sexo desconocidos).',
      'state-budget': 'La búsqueda alcanzó su límite de estados. Reduce las pasivas seleccionadas.',
      'pair-budget': 'La búsqueda es demasiado amplia. Reduce las pasivas seleccionadas.',
      'no-route': 'No se encontró una ruta que transporte todas las pasivas con sexos compatibles.',
    },
  },
  en: {
    subtitle: 'Species, sex and passive path from your real Pals',
    tree: 'Breeding Tree', path: 'Breeding Path', saved: 'Saved paths', save: 'Save path',
    chooseTarget: 'Choose a target Pal in the left panel.',
    importFirst: 'Import a save to plan with exact individuals, sex and passives.',
    chooseOwned: 'Select at least 2 species in manual mode.',
    noRoute: 'No route matches the available species, sex and passives.',
    noManualRoute: (name) => `No breeding path is available from your species to ${name}.`,
    planning: 'Looking for a compatible path…', explored: (count) => `${count || 0} states explored`,
    crosses: (name, count) => `${name} in ${count} planned breeding step${count === 1 ? '' : 's'}`,
    speciesOk: 'Target species', sexOk: 'Compatible sex', passivesOk: (count) => `${count}/4 passives`,
    probabilistic: 'Recommended plan: species and sex are compatible; passive inheritance is probabilistic. Repeat each step until the marked passives are preserved.',
    ownedTarget: (name) => `You already own a ${name} with every requested passive.`,
    reasons: {
      'invalid-target': 'The selected target is not breedable with the local data.',
      'too-many-passives': 'Select no more than four passives.',
      'no-compatible-pals': 'The save does not contain a compatible pair of sexes.',
      'missing-passives': 'A selected passive is no longer available in the collection.',
      'passives-on-discarded': 'A selected passive only exists on discarded pals (unknown species or sex).',
      'state-budget': 'The search reached its state limit. Select fewer passives.',
      'pair-budget': 'The search is too broad. Select fewer passives.',
      'no-route': 'No route can carry every passive with compatible sexes.',
    },
  },
};

export default function App() {
  const [language, setLanguage] = useState(() => load('pal.language', 'es'));
  const [panel, setPanel] = useState('source');
  const [sourceMode, setSourceMode] = useState(() => load('pal.sourceMode', 'import'));
  const [view, setView] = useState('tree');
  const [passiveOpen, setPassiveOpen] = useState(false);
  const [owned, setOwned] = useState(() => new Set(load('pal.owned', [])));
  const [target, setTarget] = useState(() => load('pal.target', null));
  const [desiredPassiveIds, setDesiredPassiveIds] = useState(() => load('pal.desiredPassives', []));
  const [customPassives, setCustomPassives] = useState(() => load('pal.customPassives', []));
  const [saved, setSaved] = useState(() => load('pal.saved.v2', load('pal.saved', [])));
  const [collection, setCollection] = useState(null);
  const [planning, setPlanning] = useState({ status: 'idle', result: null, progress: null, error: '' });
  const collectionEpoch = useRef(0);
  const mainRef = useRef(null);
  const pendingScroll = useRef(false);
  const scrollAttempts = useRef(0);
  const text = copy[language] || copy.es;

  // En el layout apilado (movil/tablet) el resultado queda bajo el pliegue: al
  // elegir objetivo hay que traerlo a la vista o parece que no pasa nada.
  const chooseTarget = (id) => {
    pendingScroll.current = true;
    scrollAttempts.current = 0;
    setTarget(id);
  };

  // El scroll va en un efecto (no en requestAnimationFrame, que no se dispara si
  // la pestana esta oculta) y solo tras una eleccion del usuario, nunca al cargar.
  // Se repite mientras se planifica: con el spinner el documento es mas bajo y el
  // navegador recorta el desplazamiento, asi que se reajusta al llegar el plan.
  useEffect(() => {
    if (!pendingScroll.current) return;
    if (!target || !window.matchMedia('(max-width: 900px)').matches) {
      pendingScroll.current = false;
      return;
    }
    const element = mainRef.current;
    if (!element) return;
    element.scrollIntoView({ behavior: 'auto', block: 'start' });
    // El documento sigue creciendo mientras se planifica, asi que el primer intento
    // se queda corto; se reintenta un numero acotado de veces hasta dejarlo arriba.
    scrollAttempts.current += 1;
    if (element.getBoundingClientRect().top <= 8 || scrollAttempts.current >= 4) {
      pendingScroll.current = false;
    }
  }, [target, planning.status, view]);

  useEffect(() => {
    let active = true;
    const epoch = collectionEpoch.current;
    loadCollection()
      .then((stored) => {
        if (active && epoch === collectionEpoch.current && (stored?.schemaVersion === 1 || stored?.schemaVersion === 2)) setCollection(stored);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => save('pal.language', language), [language]);
  useEffect(() => save('pal.sourceMode', sourceMode), [sourceMode]);
  useEffect(() => save('pal.owned', [...owned]), [owned]);
  useEffect(() => save('pal.target', target), [target]);
  useEffect(() => save('pal.desiredPassives', desiredPassiveIds), [desiredPassiveIds]);
  useEffect(() => save('pal.customPassives', customPassives), [customPassives]);
  useEffect(() => save('pal.saved.v2', saved), [saved]);

  useEffect(() => {
    if (!collection) return;
    const available = new Set(availablePassivesFromCollection(collection, customPassives).map((passive) => passive.id));
    setDesiredPassiveIds((current) => {
      const next = current.filter((id) => available.has(id)).slice(0, 4);
      return next.length === current.length ? current : next;
    });
  }, [collection, customPassives]);

  const manualResult = useMemo(
    () => sourceMode === 'manual' && target ? findShortestPath([...owned], target) : null,
    [sourceMode, owned, target]
  );

  useEffect(() => {
    if (sourceMode !== 'import' || !collection || !target) {
      setPlanning({ status: 'idle', result: null, progress: null, error: '' });
      return undefined;
    }

    const controller = new AbortController();
    setPlanning({ status: 'planning', result: null, progress: null, error: '' });
    requestCollectionPlan({
      instances: collection.instances,
      targetId: target,
      desiredPassiveIds,
    }, {
      signal: controller.signal,
      onProgress: (progress) => setPlanning((current) => current.status === 'planning' ? { ...current, progress } : current),
    })
      .then((result) => setPlanning({ status: result.status, result, progress: result.stats || null, error: '' }))
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setPlanning({ status: 'error', result: null, progress: null, error: error.message });
        }
      });
    return () => controller.abort();
  }, [sourceMode, collection, target, desiredPassiveIds]);

  const toggleOwned = (id) => setOwned((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const importCollection = async (nextCollection) => {
    const species = nextCollection.speciesIds.filter((id) => palsById[id]);
    if (!species.length) throw new Error(language === 'en' ? 'No compatible species were found.' : 'No se encontraron especies compatibles.');
    const normalized = { ...nextCollection, schemaVersion: 2 };
    await saveCollection(normalized);
    collectionEpoch.current += 1;
    setCollection(normalized);
    setOwned(new Set(species));
    setSourceMode('import');
  };

  const clearCollection = async () => {
    collectionEpoch.current += 1;
    setCollection(null);
    setOwned(new Set());
    setDesiredPassiveIds([]);
    await deleteCollection();
  };

  const currentPlan = sourceMode === 'import' && planning.status === 'success' ? planning.result : null;
  const canSave = Boolean(target && (currentPlan || manualResult));
  const currentCollectionFingerprint = useMemo(() => fingerprintCollection(collection), [collection]);

  const savePath = () => {
    if (!canSave) return;
    const count = sourceMode === 'import' ? currentPlan.breedingCount : manualResult.steps.length;
    const item = {
      schemaVersion: 3,
      id: crypto.randomUUID(),
      breedingCount: count,
      sourceMode,
      ownedIds: [...owned],
      targetId: target,
      desiredPassiveIds: sourceMode === 'import' ? desiredPassiveIds : [],
      collectionImportedAt: collection?.importedAt || null,
      collectionFingerprint: sourceMode === 'import' ? currentCollectionFingerprint : null,
      savedAt: Date.now(),
    };
    setSaved((current) => [item, ...current]);
    setView('saved');
  };

  const loadPath = (item) => {
    if (item.sourceMode === 'import') {
      const matches = collection && (item.collectionFingerprint
        ? item.collectionFingerprint === currentCollectionFingerprint
        : item.collectionImportedAt === collection.importedAt);
      if (!matches) return;
    }
    setSourceMode(item.sourceMode || 'manual');
    if (item.ownedIds) setOwned(new Set(item.ownedIds));
    setTarget(item.targetId);
    setDesiredPassiveIds(item.desiredPassiveIds || []);
    setView('path');
    setPanel('target');
  };

  const targetPal = target ? palsById[target] : null;
  const planErrorReason = planning.result?.reason;

  return (
    <div className="layout">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="brand-copy">
            <h1>Palworld <em>Breeding Path</em><span className="chip">local</span></h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="header-actions">
            <div className="language-switch" role="group" aria-label="Language">
              {['es', 'en'].map((locale) => (
                <button key={locale} type="button" className={language === locale ? 'active' : ''} onClick={() => setLanguage(locale)}>
                  {locale.toUpperCase()}
                </button>
              ))}
            </div>
            <HelpDrawer locale={language} onLocaleChange={setLanguage} />
          </div>
        </header>

        <FlowSelector
          panel={panel}
          onPanel={(nextPanel) => nextPanel === 'passives' ? setPassiveOpen(true) : setPanel(nextPanel)}
          collection={collection}
          owned={owned}
          target={target}
          desiredPassiveIds={desiredPassiveIds}
          language={language}
          customPassives={customPassives}
          sourceMode={sourceMode}
          passiveOpen={passiveOpen}
        />

        <div className="panel-host">
          {panel === 'source' && (
            <SourcePanel
              sourceMode={sourceMode}
              onSourceMode={setSourceMode}
              collection={collection}
              onImported={importCollection}
              onClearCollection={clearCollection}
              owned={owned}
              onToggleOwned={toggleOwned}
              onClearOwned={() => setOwned(new Set())}
              language={language}
              customPassives={customPassives}
            />
          )}
          {panel === 'target' && <TargetPicker target={target} onSetTarget={chooseTarget} language={language} />}
        </div>
        <div className="sidebar-footer-actions">
          <button type="button" className="btn-accent" disabled={!canSave} onClick={savePath}>{text.save}</button>
          <button type="button" className={`btn-ghost${view === 'saved' ? ' active' : ''}`} aria-pressed={view === 'saved'} onClick={() => setView('saved')}>
            {text.saved}<span>{saved.length}</span>
          </button>
        </div>
      </aside>

      <main className="main" ref={mainRef}>
        <div className="main-toolbar">
          <div className="view-tabs">
            <button type="button" aria-pressed={view === 'tree'} className={`view-tab${view === 'tree' ? ' active' : ''}`} onClick={() => setView('tree')}>{text.tree}</button>
            <button type="button" aria-pressed={view === 'path'} className={`view-tab${view === 'path' ? ' active' : ''}`} onClick={() => setView('path')}>{text.path}</button>
          </div>
        </div>

        {view === 'saved' ? (
          <SavedPlans
            saved={saved}
            onLoad={loadPath}
            onDelete={(id) => setSaved((items) => items.filter((item) => item.id !== id))}
            language={language}
            customPassives={customPassives}
            collectionFingerprint={currentCollectionFingerprint}
            collectionImportedAt={collection?.importedAt || null}
          />
        ) : !targetPal ? (
          <div className="empty-state empty-hero"><span><img src="/pals/T_SkyDragon_icon_normal.png" alt="" /></span><strong>{text.chooseTarget}</strong></div>
        ) : sourceMode === 'import' && !collection ? (
          <div className="empty-state empty-hero"><span>📁</span><strong>{text.importFirst}</strong></div>
        ) : sourceMode === 'import' && planning.status === 'planning' ? (
          <div className="planning-state"><span className="spinner" /><div>{text.planning}<small>{text.explored(planning.progress?.exploredStates)}</small></div></div>
        ) : sourceMode === 'import' && planning.status === 'error' ? (
          <div className="empty-state empty-hero"><span>⚠</span><strong>{planning.error || text.reasons[planErrorReason] || text.noRoute}</strong></div>
        ) : sourceMode === 'manual' && owned.size < 2 && !owned.has(target) ? (
          <div className="empty-state empty-hero"><span>＋</span><strong>{text.chooseOwned}</strong></div>
        ) : sourceMode === 'manual' && !manualResult ? (
          <div className="empty-state empty-hero"><span>⚠</span><strong>{text.noManualRoute(targetPal.name)}</strong></div>
        ) : sourceMode === 'import' && currentPlan ? (
          <>
            <div className="result-summary"><span className="score">{text.crosses(targetPal.name, currentPlan.breedingCount)}</span></div>
            <div className="result-criteria">
              <span className="criterion ok">✓ {text.speciesOk}</span>
              <span className="criterion ok">✓ {text.sexOk}</span>
              <span className="criterion ok">✓ {text.passivesOk(desiredPassiveIds.length)}</span>
            </div>
            {desiredPassiveIds.length > 0 && currentPlan.breedingCount > 0 && <div className="plan-warning">{text.probabilistic}</div>}
            {currentPlan.breedingCount === 0 && view === 'path' ? (
              <div className="already-owned"><img src={`/pals/${targetPal.icon}.png`} alt="" />{text.ownedTarget(targetPal.name)}</div>
            ) : (
              <CollectionPlanView plan={currentPlan} targetId={target} desiredPassiveIds={desiredPassiveIds} language={language} customPassives={customPassives} view={view} />
            )}
          </>
        ) : manualResult ? (
          <>
            <div className="result-summary"><span className="score">{text.crosses(targetPal.name, manualResult.steps.length)}</span></div>
            {manualResult.steps.length === 0 && view === 'path' ? (
              <div className="already-owned"><img src={`/pals/${targetPal.icon}.png`} alt="" />{text.ownedTarget(targetPal.name)}</div>
            ) : view === 'path' ? <PathView steps={manualResult.steps} language={language} /> : <TreeView tree={manualResult.tree} language={language} />}
          </>
        ) : null}
      </main>
      <PassivePicker
        open={passiveOpen}
        onClose={() => setPassiveOpen(false)}
        collection={collection}
        selectedIds={desiredPassiveIds}
        onChange={setDesiredPassiveIds}
        language={language}
        customPassives={customPassives}
        onCustomPassives={setCustomPassives}
      />
    </div>
  );
}
