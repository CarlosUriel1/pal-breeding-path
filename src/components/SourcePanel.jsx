import { useState } from 'react';
import SaveImporter from './SaveImporter.jsx';
import ImportedPalList from './ImportedPalList.jsx';
import PalPicker from './PalPicker.jsx';

const copy = {
  es: {
    manual: 'Seleccionar manualmente', import: 'Importar save',
    manualNote: 'Modo rápido por especies. Para sexo y pasivas usa un guardado importado.',
  },
  en: {
    manual: 'Select manually', import: 'Import save',
    manualNote: 'Quick species-only mode. Import a save to use exact sex and passives.',
  },
};

export default function SourcePanel({
  sourceMode,
  onSourceMode,
  collection,
  onImported,
  onClearCollection,
  owned,
  onToggleOwned,
  onClearOwned,
  language,
  customPassives,
}) {
  const text = copy[language] || copy.es;
  const [importBusy, setImportBusy] = useState(false);
  return (
    <div className="source-panel">
      <div className="source-tabs" role="group" aria-label="Pal source">
        <button
          type="button"
          className={sourceMode === 'manual' ? 'active' : ''}
          aria-pressed={sourceMode === 'manual'}
          disabled={importBusy}
          onClick={() => onSourceMode('manual')}
        >
          {text.manual}
        </button>
        <button
          type="button"
          className={sourceMode === 'import' ? 'active' : ''}
          aria-pressed={sourceMode === 'import'}
          disabled={importBusy}
          onClick={() => onSourceMode('import')}
        >
          {text.import}
        </button>
      </div>

      {sourceMode === 'import' ? (
        <>
          <SaveImporter
            collection={collection}
            onImported={onImported}
            onClear={onClearCollection}
            onBusyChange={setImportBusy}
            language={language}
          />
          {collection && (
            <ImportedPalList
              collection={collection}
              language={language}
              customPassives={customPassives}
            />
          )}
        </>
      ) : (
        <>
          <p className="manual-note">{text.manualNote}</p>
          <PalPicker
            mode="owned"
            owned={owned}
            target={null}
            collection={null}
            onToggleOwned={onToggleOwned}
            onSetTarget={() => {}}
            onClearOwned={onClearOwned}
            language={language}
          />
        </>
      )}
    </div>
  );
}
