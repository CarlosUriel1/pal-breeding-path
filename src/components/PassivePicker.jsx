import { useEffect, useMemo, useRef, useState } from 'react';
import {
  alternatePassiveName,
  availablePassivesFromCollection,
  normalizeCustomPassiveCatalog,
  normalizeText,
  passiveCatalog,
  passiveDescription,
  passiveName,
  rankTone,
} from '../data/passiveCatalog.js';

const copy = {
  es: {
    title: 'Pasivas deseadas',
    subtitle: 'Elige hasta 4. Solo se ofrecen las que existen en tus Pals importados.',
    search: 'Buscar en español o inglés…',
    empty: 'No hay pasivas disponibles. Importa primero un guardado con Pals.',
    limit: 'Ya seleccionaste el máximo de 4 pasivas.',
    import: 'Añadir traducciones JSON',
    imported: (count) => `${count} traducciones personalizadas añadidas`,
    badFile: 'Ese archivo JSON no contiene pasivas válidas.',
    selected: 'Seleccionadas',
    noDescription: 'Sin descripción localizada.',
    searchLabel: 'Buscar pasivas', clear: 'Limpiar', done: 'Hecho', close: 'Cerrar sin guardar',
    cake: 'La ruta supone pastel especial en cada paso de crianza.',
  },
  en: {
    title: 'Desired passives',
    subtitle: 'Choose up to 4. Only passives found in your imported Pals are offered.',
    search: 'Search in English or Spanish…',
    empty: 'No passives are available. Import a save with Pals first.',
    limit: 'You already selected the maximum of 4 passives.',
    import: 'Add JSON translations',
    imported: (count) => `${count} custom translations added`,
    badFile: 'That JSON file does not contain valid passive entries.',
    selected: 'Selected',
    noDescription: 'No localized description.',
    searchLabel: 'Search passives', clear: 'Clear', done: 'Done', close: 'Close without saving',
    cake: 'The route assumes Special Cake at every breeding step.',
  },
};

export default function PassivePicker({
  collection,
  selectedIds,
  onChange,
  language,
  customPassives,
  onCustomPassives,
  open = true,
  onClose,
}) {
  const text = copy[language] || copy.es;
  const fileInput = useRef(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [draftIds, setDraftIds] = useState(selectedIds);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setDraftIds(selectedIds);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const available = useMemo(
    () => collection
      ? availablePassivesFromCollection(collection, customPassives)
      : passiveCatalog,
    [collection, customPassives]
  );

  const filtered = useMemo(() => {
    const needle = normalizeText(query);
    if (!needle) return available;
    return available.filter((passive) => normalizeText([
      passive.en,
      passive.es,
      passive.esMX,
      passive.id,
      passive.descriptionEn,
      passive.descriptionEs,
      passive.descriptionEsMX,
    ].join(' ')).includes(needle));
  }, [available, query]);

  const byId = useMemo(() => new Map(available.map((passive) => [passive.id, passive])), [available]);

  const toggle = (id) => {
    setMessage(null);
    if (draftIds.includes(id)) {
      setDraftIds(draftIds.filter((selected) => selected !== id));
      return;
    }
    if (draftIds.length >= 4) {
      setMessage({ text: text.limit, type: 'error' });
      return;
    }
    setDraftIds([...draftIds, id]);
  };

  const importTranslations = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = normalizeCustomPassiveCatalog(JSON.parse(await file.text()));
      if (!parsed.length) throw new Error('empty');
      const merged = new Map(customPassives.map((passive) => [passive.id, passive]));
      for (const passive of parsed) merged.set(passive.id, passive);
      onCustomPassives([...merged.values()]);
      setMessage({ text: text.imported(parsed.length), type: 'success' });
    } catch {
      setMessage({ text: text.badFile, type: 'error' });
    }
  };

  if (!open) return null;

  const confirm = () => {
    onChange(draftIds);
    onClose?.();
  };

  return (
    <div className="passive-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
    <section
      ref={dialogRef}
      className="passive-picker passive-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passive-title"
      aria-describedby="passive-subtitle"
      tabIndex="-1"
    >
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        onChange={importTranslations}
      />

      <div className="section-heading passive-dialog-heading">
        <div>
          <strong id="passive-title">{text.title}</strong>
          <span id="passive-subtitle">{text.subtitle}</span>
        </div>
        <b aria-live="polite">{draftIds.length}/4</b>
        <button type="button" className="modal-close" aria-label={text.close} onClick={onClose}>×</button>
      </div>

      {draftIds.length > 0 && (
        <div className="selected-passives" aria-label={text.selected}>
          {draftIds.map((id) => {
            const passive = byId.get(id) || { id, en: id, esMX: id, rank: 0 };
            return (
              <button
                type="button"
                key={id}
                className={`passive-chip ${rankTone(passive.rank)}`}
                onClick={() => toggle(id)}
                title={`${passiveName(passive, language)} / ${alternatePassiveName(passive, language)}`}
              >
                {passiveName(passive, language)} <span>×</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="passive-search-heading">
        <strong>{text.searchLabel}</strong>
        <button type="button" disabled={!draftIds.length} onClick={() => setDraftIds([])}>{text.clear}</button>
      </div>
      <label className="search passive-search">
        <input
          type="search"
          value={query}
          placeholder={text.search}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="counter">{filtered.length}/{available.length}</span>
      </label>

      <div className="passive-list">
        {filtered.map((passive) => {
          const selected = draftIds.includes(passive.id);
          const secondary = alternatePassiveName(passive, language);
          const description = passiveDescription(passive, language);
          return (
            <button
              type="button"
              key={passive.id}
              className={`passive-option ${rankTone(passive.rank)}${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              title={description ? `${passiveName(passive, language)} — ${description}` : passiveName(passive, language)}
              onClick={() => toggle(passive.id)}
            >
              <span className="passive-rank">{passive.rank > 0 ? `+${passive.rank}` : passive.rank}</span>
              <span className="passive-copy">
                <strong>{passiveName(passive, language)}</strong>
                {secondary !== passiveName(passive, language) && <small>{secondary}</small>}
                <span>{description || text.noDescription}</span>
              </span>
              <span className="passive-check">{selected ? '✓' : '+'}</span>
            </button>
          );
        })}
        {!filtered.length && <div className="picker-empty">{text.empty}</div>}
      </div>

      <footer className="passive-dialog-footer">
        <div>
          <span className="special-cake-modal-note">◆ {text.cake}</span>
          <button type="button" className="translation-link" onClick={() => fileInput.current?.click()}>{text.import}</button>
          {message && <span className={`picker-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</span>}
        </div>
        <button type="button" className="btn-accent passive-done" onClick={confirm}>{text.done}</button>
      </footer>
    </section>
    </div>
  );
}
