import { useEffect, useMemo, useRef, useState } from 'react';
import { findLevelSaveCandidates } from '../import/findSaveCandidates.js';
import { inspectPalworldWorld, parsePalworldSave, parsePalworldWorld } from '../import/workerClient.js';

const SAVE_GAMES_PATH = '%LOCALAPPDATA%\\Pal\\Saved\\SaveGames';

const copy = {
  es: {
    preparing: 'Preparando el lector local…', readError: 'No se pudo leer el guardado.',
    noLevel: 'No encontré ningún Level.sav fuera de las carpetas de respaldo.',
    clearError: 'La colección se quitó de la sesión, pero el navegador no pudo borrar su copia local.',
    region: 'Importar guardado', loaded: 'Guardado cargado', local: 'solo local', pals: 'Pals', species: 'especies', passives: 'pasivas',
    skipped: (count) => `Se omitieron ${count} Pals aún no reconocidos por los datos locales.`,
    update: 'Actualizar carpeta', other: 'Otro Level.sav', remove: 'Quitar',
    eyebrow: 'GUÍA PARA IMPORTAR', intro: 'Conecta tu mundo de Palworld',
    privacy: 'Tu guardado se procesa en este dispositivo y nunca se sube.',
    folder: 'Elegir carpeta SaveGames', file: 'Elegir Level.sav', copy: 'Copiar', copied: 'Copiado',
    step1: 'Copia la ruta de la carpeta', step1Note: 'Usa el botón Copiar de arriba.',
    step2: 'Abre el selector de Windows', step2Note: 'Pulsa Elegir carpeta SaveGames.',
    step3: 'Selecciona SaveGames', step3Note: 'Pega la ruta, pulsa Enter y elige la carpeta.',
    localRead: 'Lectura local · no se envía nada',
    localWorlds: 'MUNDOS LOCALES', chooseWorld: 'Elige un mundo de Palworld',
    chooseWorldHelp: 'Selecciona un mundo y confirma para ver sus jugadores.',
    worldName: 'MUNDO', day: 'DÍA', player: 'JUGADOR', level: 'NV.', multiplayer: 'MULTIJUGADOR',
    yes: 'Sí', no: 'No', unknown: '—', analyzing: 'Analizando…',
    cancel: 'Cancelar', continue: 'Elegir jugadores', close: 'Cerrar importación',
    onlyConfirmed: 'Solo se abrirá por completo el mundo que confirmes.',
    choosePlayers: 'Elige jugadores', choosePlayersHelp: (name) => `Elige qué Pals incluir de ${name}.`,
    selected: (count, pals) => `${count} seleccionado${count === 1 ? '' : 's'} · ${pals} Pals`,
    selectAll: 'Seleccionar todos', clear: 'Limpiar', shared: 'Los Pals de cajas compartidas o de base se incluyen automáticamente.',
    back: 'Atrás', importPals: (count) => `Importar ${count} Pals`, completeCollection: 'Colección completa',
  },
  en: {
    preparing: 'Preparing the local reader…', readError: 'The save could not be read.',
    noLevel: 'No Level.sav was found outside backup folders.',
    clearError: 'The collection was removed from this session, but its browser copy could not be deleted.',
    region: 'Import save', loaded: 'Save loaded', local: 'local only', pals: 'Pals', species: 'species', passives: 'passives',
    skipped: (count) => `${count} Pals not recognized by the local data were skipped.`,
    update: 'Update folder', other: 'Other Level.sav', remove: 'Remove',
    eyebrow: 'SAVE IMPORT GUIDE', intro: 'Connect your Palworld world',
    privacy: 'Your save is processed on this device and is never uploaded.',
    folder: 'Choose SaveGames folder', file: 'Choose Level.sav', copy: 'Copy', copied: 'Copied',
    step1: 'Copy the folder path', step1Note: 'Use the Copy button above.',
    step2: 'Open the Windows picker', step2Note: 'Press Choose SaveGames folder.',
    step3: 'Select SaveGames', step3Note: 'Paste the path, press Enter, and choose the folder.',
    localRead: 'Read locally · nothing uploaded',
    localWorlds: 'LOCAL SAVEGAMES', chooseWorld: 'Choose a Palworld world',
    chooseWorldHelp: 'Select a world and confirm to see its players.',
    worldName: 'WORLD', day: 'DAY', player: 'PLAYER', level: 'LV.', multiplayer: 'MULTIPLAYER',
    yes: 'Yes', no: 'No', unknown: '—', analyzing: 'Analyzing…',
    cancel: 'Cancel', continue: 'Choose players', close: 'Close import',
    onlyConfirmed: 'Only the world you confirm is opened in full.',
    choosePlayers: 'Choose players', choosePlayersHelp: (name) => `Choose whose Pals to include from ${name}.`,
    selected: (count, pals) => `${count} selected · ${pals} Pals`,
    selectAll: 'Select all', clear: 'Clear', shared: 'Pals in shared or base containers are included automatically.',
    back: 'Back', importPals: (count) => `Import ${count} Pals`, completeCollection: 'Complete collection',
  },
};

const englishImportMessages = new Map([
  ['Leyendo el archivo…', 'Reading the file…'], ['Leyendo los archivos del mundo…', 'Reading world files…'],
  ['Descomprimiendo el guardado…', 'Decompressing the save…'], ['Descomprimiendo el mundo…', 'Decompressing the world…'],
  ['Leyendo tus Pals…', 'Reading your Pals…'], ['Leyendo los datos del mundo…', 'Reading world data…'],
  ['No se recibió ningún archivo.', 'No file was received.'],
  ['El guardado supera el límite local de 512 MiB.', 'The save exceeds the local 512 MiB limit.'],
  ['El análisis tardó más de 120 segundos y se detuvo.', 'Parsing took more than 120 seconds and was stopped.'],
  ['El lector local del guardado se detuvo inesperadamente.', 'The local save reader stopped unexpectedly.'],
  ['El archivo se leyó, pero no contiene Pals reconocidos por esta versión de la app.', 'The file was read, but it contains no Pals recognized by this app version.'],
  ['No hay memoria suficiente para descomprimir este guardado.', 'There is not enough memory to decompress this save.'],
  ['No se pudo descomprimir el guardado Oodle/Kraken.', 'The Oodle/Kraken save could not be decompressed.'],
  ['Este navegador no puede descomprimir guardados PlZ. Usa Chrome o Edge reciente.', 'This browser cannot decompress PlZ saves. Use a recent Chrome or Edge version.'],
  ['El archivo está vacío o incompleto.', 'The file is empty or incomplete.'],
  ['El archivo no contiene un encabezado de guardado válido.', 'The file does not contain a valid save header.'],
  ['El tamaño descomprimido declarado no es seguro o no es válido.', 'The declared decompressed size is unsafe or invalid.'],
  ['Los guardados Xbox en formato CNK todavía no son compatibles.', 'Xbox saves in CNK format are not supported yet.'],
]);

const localizeImportMessage = (message, language, fallback) => {
  const value = String(message || '');
  if (language !== 'en') return value || fallback;
  if (englishImportMessages.has(value)) return englishImportMessages.get(value);
  if (value.startsWith('Formato de guardado no reconocido')) return value.replace('Formato de guardado no reconocido', 'Unrecognized save format');
  return value || fallback;
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const shortPath = (path) => {
  const parts = String(path || '').replaceAll('\\', '/').split('/').filter(Boolean);
  return parts.slice(-3).join(' / ') || 'Level.sav';
};

const formatWorldDate = (world, candidate, language) => {
  const value = world?.timestamp || candidate?.lastModified;
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-MX', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
};

export default function SaveImporter({ collection, onImported, onClear, onBusyChange, language = 'es' }) {
  const text = copy[language] || copy.es;
  const folderInput = useRef(null);
  const fileInput = useRef(null);
  const importAbort = useRef(null);
  const wizardRef = useRef(null);
  const wizardCloseRef = useRef(null);
  const wizardReturnFocus = useRef(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedWorldId, setSelectedWorldId] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(new Set());
  const [wizardStep, setWizardStep] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    importAbort.current = new AbortController();
    return () => importAbort.current?.abort();
  }, []);

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  const stats = useMemo(() => {
    if (!collection) return null;
    const genders = collection.instances.reduce((counts, pal) => {
      counts[pal.gender || 'unknown'] = (counts[pal.gender || 'unknown'] || 0) + 1;
      return counts;
    }, { M: 0, F: 0, unknown: 0 });
    const passives = new Set(collection.instances.flatMap((pal) => pal.passiveIds || []));
    return { pals: collection.instances.length, species: collection.speciesIds.length, genders, passives: passives.size };
  }, [collection]);

  const selectedCandidate = candidates.find((candidate) => candidate.relativePath === selectedWorldId) || candidates[0] || null;
  const inspection = selectedCandidate?.inspection || null;
  const selectablePlayers = inspection?.players?.length ? inspection.players : inspection ? [{
    id: '__all__', name: text.completeCollection, level: inspection.world?.hostPlayerLevel, palCount: inspection.totalPals,
  }] : [];
  const selectedPlayers = selectablePlayers.filter((player) => selectedPlayerIds.has(player.id));
  const selectedPalCount = inspection ? (selectablePlayers[0]?.id === '__all__'
    ? (selectedPlayerIds.has('__all__') ? inspection.totalPals : 0)
    : selectedPlayers.reduce((sum, player) => sum + (player.palCount || 0), 0) + (selectedPlayers.length ? inspection.sharedPalCount || 0 : 0)) : 0;

  const closeWizard = () => {
    if (busy) return;
    setWizardStep(null);
    setStage('');
  };

  const wizardOpen = Boolean(wizardStep);

  useEffect(() => {
    if (!wizardOpen) return undefined;
    wizardReturnFocus.current = document.activeElement;
    if (wizardCloseRef.current && !wizardCloseRef.current.disabled) {
      wizardCloseRef.current.focus();
    } else {
      wizardRef.current?.focus();
    }
    return () => {
      const previous = wizardReturnFocus.current;
      wizardReturnFocus.current = null;
      previous?.focus?.();
    };
  }, [wizardOpen]);

  useEffect(() => {
    if (!wizardOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeWizard();
        return;
      }
      if (event.key !== 'Tab' || !wizardRef.current) return;

      const focusable = [...wizardRef.current.querySelectorAll(focusableSelector)].filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
      );
      if (!focusable.length) {
        event.preventDefault();
        wizardRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [wizardOpen, busy]);

  const analyzeCandidates = async (found) => {
    setBusy(true);
    try {
      for (const candidate of found) {
        try {
          const result = await inspectPalworldWorld(candidate, (next) => setStage(localizeImportMessage(next, language, text.preparing)), importAbort.current?.signal);
          setCandidates((current) => current.map((item) => item.relativePath === candidate.relativePath ? { ...item, inspection: result } : item));
        } catch (reason) {
          if (reason?.name === 'AbortError') break;
          setCandidates((current) => current.map((item) => item.relativePath === candidate.relativePath ? { ...item, inspectError: localizeImportMessage(reason?.message, language, text.readError) } : item));
        }
      }
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const handleFolder = (event) => {
    const found = findLevelSaveCandidates(event.target.files);
    event.target.value = '';
    setError('');
    if (!found.length) {
      setCandidates([]);
      setError(text.noLevel);
      return;
    }
    setCandidates(found);
    setSelectedWorldId(found[0].relativePath);
    setSelectedPlayerIds(new Set());
    setWizardStep('world');
    void analyzeCandidates(found);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    setStage(text.preparing);
    try {
      const result = await parsePalworldSave(file, (next) => setStage(localizeImportMessage(next, language, text.preparing)), importAbort.current?.signal);
      await onImported(result);
      setStage('');
    } catch (reason) {
      if (reason?.name !== 'AbortError') setError(localizeImportMessage(reason instanceof Error ? reason.message : '', language, text.readError));
      setStage('');
    } finally {
      setBusy(false);
    }
  };

  const showPlayers = () => {
    if (!inspection) return;
    const ids = (inspection.players?.length ? inspection.players : [{ id: '__all__' }]).map((player) => player.id);
    setSelectedPlayerIds(new Set(ids));
    setWizardStep('players');
  };

  const importSelectedWorld = async () => {
    if (!selectedCandidate || !selectedPlayers.length) return;
    setBusy(true);
    setError('');
    setStage(text.preparing);
    try {
      const playerIds = selectedPlayers.map((player) => player.id).filter((id) => id !== '__all__');
      const result = await parsePalworldWorld(selectedCandidate, playerIds, (next) => setStage(localizeImportMessage(next, language, text.preparing)), importAbort.current?.signal);
      await onImported(result);
      setWizardStep(null);
      setCandidates([]);
      setStage('');
    } catch (reason) {
      if (reason?.name !== 'AbortError') setError(localizeImportMessage(reason instanceof Error ? reason.message : '', language, text.readError));
      setStage('');
    } finally {
      setBusy(false);
    }
  };

  const togglePlayer = (id) => setSelectedPlayerIds((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const clear = async () => {
    setError('');
    try { await onClear(); } catch { setError(text.clearError); }
  };

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(SAVE_GAMES_PATH);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setError(text.readError); }
  };

  return (
    <section className={`save-importer${collection ? ' has-collection' : ''}`} aria-label={text.region}>
      <input ref={folderInput} className="visually-hidden" type="file" webkitdirectory="" directory="" multiple aria-label={text.folder} onChange={handleFolder} />
      <input ref={fileInput} className="visually-hidden" type="file" accept=".sav,application/octet-stream" aria-label={text.file} onChange={handleFile} />

      {collection ? (
        <>
          <div className="collection-heading">
            <div><strong>{stats.pals} {text.pals}</strong><span>{collection.world?.name || shortPath(collection.source.relativePath)}</span></div>
            <span className="local-badge">{text.local}</span>
          </div>
          <div className="collection-stats"><strong>{stats.pals}</strong> {text.pals} · <strong>{stats.species}</strong> {text.species} · {stats.genders.M}♂ {stats.genders.F}♀ · {stats.passives} {text.passives}</div>
          {collection.warnings?.unmatchedTotal > 0 && <p className="import-warning">{text.skipped(collection.warnings.unmatchedTotal)}</p>}
          <div className="import-actions compact">
            <button type="button" className="btn-accent" disabled={busy} onClick={() => folderInput.current?.click()}>{text.update}</button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => fileInput.current?.click()}>{text.other}</button>
            <button type="button" className="btn-ghost danger" disabled={busy} onClick={clear}>{text.remove}</button>
          </div>
        </>
      ) : (
        <div className="save-import-guide">
          <span className="guide-eyebrow">{text.eyebrow}</span>
          <div className="import-intro"><strong>{text.intro}</strong><span>{text.privacy}</span></div>
          <div className="save-path-row"><code className="save-path">{SAVE_GAMES_PATH}</code><button type="button" onClick={copyPath}>{copied ? text.copied : text.copy}</button></div>
          <ol className="save-guide-steps">
            <li><b>1</b><span><strong>{text.step1}</strong><small>{text.step1Note}</small></span></li>
            <li><b>2</b><span><strong>{text.step2}</strong><small>{text.step2Note}</small></span></li>
            <li><b>3</b><span><strong>{text.step3}</strong><small>{text.step3Note}</small></span></li>
          </ol>
          <button type="button" className="btn-accent import-folder-primary" disabled={busy} onClick={() => folderInput.current?.click()}>{text.folder}</button>
          <span className="local-read-note">✓ {text.localRead}</span>
          <button type="button" className="level-file-link" disabled={busy} onClick={() => fileInput.current?.click()}>{text.file}</button>
        </div>
      )}

      {busy && !wizardStep && <div className="import-progress" role="status"><span className="spinner" />{stage}</div>}
      {error && <p className="import-error" role="alert">{error}</p>}

      {wizardStep && (
        <div className="save-wizard-backdrop">
          <section ref={wizardRef} className="save-wizard-dialog" role="dialog" aria-modal="true" aria-labelledby="save-wizard-title" tabIndex={-1}>
            <header className="save-wizard-header">
              <div><span>{text.localWorlds}</span><h2 id="save-wizard-title">{wizardStep === 'world' ? text.chooseWorld : text.choosePlayers}</h2><p>{wizardStep === 'world' ? text.chooseWorldHelp : text.choosePlayersHelp(inspection?.world?.name || selectedCandidate?.worldName || '')}</p></div>
              <button ref={wizardCloseRef} type="button" className="modal-close" aria-label={text.close} disabled={busy} onClick={closeWizard}>×</button>
            </header>

            {wizardStep === 'world' ? (
              <div className="world-modal-body">
                <div className="world-table-head"><span aria-hidden="true" /><span>{text.worldName}</span><span>{text.day}</span><span>{text.player}</span><span>{text.level}</span><span>{text.multiplayer}</span></div>
                <div className="world-modal-list">
                  {candidates.map((candidate) => {
                    const data = candidate.inspection;
                    const world = data?.world;
                    const selected = candidate.relativePath === selectedCandidate?.relativePath;
                    return (
                      <label className={`world-modal-row${selected ? ' selected' : ''}`} key={candidate.relativePath}>
                        <input type="radio" name="palworld-world" checked={selected} onChange={() => setSelectedWorldId(candidate.relativePath)} />
                        <span className="world-identity"><strong>{world?.name || candidate.worldName}</strong><small>{formatWorldDate(world, candidate, language)}{world?.format ? ` · ${world.format}` : ''}</small>{candidate.inspectError && <em>{candidate.inspectError}</em>}</span>
                        <b>{world?.day ?? text.unknown}</b>
                        <span>{world?.hostPlayerName || (data ? text.unknown : text.analyzing)}</span>
                        <b>{world?.hostPlayerLevel ?? text.unknown}</b>
                        <b className={world?.multiplayer ? 'world-yes' : 'world-no'}>{data ? (world?.multiplayer ? text.yes : text.no) : text.unknown}</b>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="players-modal-body">
                <div className="players-summary"><strong>{text.selected(selectedPlayers.length, selectedPalCount)}</strong><span><button type="button" onClick={() => setSelectedPlayerIds(new Set(selectablePlayers.map((player) => player.id)))}>{text.selectAll}</button><button type="button" onClick={() => setSelectedPlayerIds(new Set())}>{text.clear}</button></span></div>
                <div className="players-modal-list">
                  {selectablePlayers.map((player) => {
                    const selected = selectedPlayerIds.has(player.id);
                    return <button type="button" className={`player-modal-row${selected ? ' selected' : ''}`} aria-pressed={selected} key={player.id} onClick={() => togglePlayer(player.id)}><span className="player-check">{selected ? '✓' : ''}</span><strong>{player.name}</strong>{player.level != null && <small>{text.level} {player.level}</small>}<b>{player.palCount || 0} {text.pals}</b></button>;
                  })}
                </div>
                <p className="shared-pals-note">{text.shared}{inspection?.sharedPalCount ? ` (${inspection.sharedPalCount} ${text.pals})` : ''}</p>
              </div>
            )}

            <footer className="save-wizard-footer">
              <span className={error ? 'wizard-error' : ''}>{error ? error : busy ? <><span className="spinner" />{stage}</> : wizardStep === 'world' ? text.onlyConfirmed : text.localRead}</span>
              <div>
                <button type="button" className="btn-ghost" disabled={busy} onClick={wizardStep === 'world' ? closeWizard : () => setWizardStep('world')}>{wizardStep === 'world' ? text.cancel : text.back}</button>
                <button type="button" className="btn-accent" disabled={busy || (wizardStep === 'world' ? !inspection : !selectedPlayers.length)} onClick={wizardStep === 'world' ? showPlayers : importSelectedWorld}>{wizardStep === 'world' ? text.continue : text.importPals(selectedPalCount)}</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
