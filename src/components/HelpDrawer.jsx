import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  createTranslator,
  normalizeLocale,
} from '../i18n.js';

const palette = {
  background: 'var(--bg, #1a232d)',
  panel: 'var(--panel, #0f161b)',
  card: 'var(--card, #202c39)',
  border: 'var(--border, #2c3b4a)',
  text: 'var(--text, #ffffff)',
  muted: 'var(--muted, #8fa3b5)',
  accent: 'var(--accent, #45f882)',
  target: 'var(--target, #f8c945)',
};

const styles = {
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 36,
    padding: '7px 11px',
    border: `1px solid ${palette.border}`,
    borderRadius: 9,
    background: palette.card,
    color: palette.text,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 12,
    fontWeight: 750,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
    background: 'rgba(3, 8, 12, 0.72)',
  },
  drawer: {
    width: 'min(440px, 100vw)',
    height: '100%',
    overflowY: 'auto',
    borderLeft: `1px solid ${palette.border}`,
    background: palette.panel,
    color: palette.text,
    boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.35)',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '20px 20px 16px',
    borderBottom: `1px solid ${palette.border}`,
    background: palette.panel,
  },
  eyebrow: {
    display: 'block',
    marginBottom: 5,
    color: palette.accent,
    fontSize: 10,
    fontWeight: 850,
    letterSpacing: '0.14em',
  },
  title: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.15,
  },
  close: {
    display: 'inline-grid',
    flex: '0 0 auto',
    width: 38,
    height: 38,
    placeItems: 'center',
    border: `1px solid ${palette.border}`,
    borderRadius: 9,
    background: palette.card,
    color: palette.text,
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 24,
    lineHeight: 1,
  },
  body: {
    display: 'grid',
    gap: 18,
    padding: 20,
  },
  intro: {
    margin: 0,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 1.55,
  },
  languageGroup: {
    display: 'inline-flex',
    justifySelf: 'start',
    padding: 3,
    border: `1px solid ${palette.border}`,
    borderRadius: 9,
    background: palette.background,
  },
  languageButton: {
    minWidth: 56,
    padding: '6px 10px',
    border: 0,
    borderRadius: 7,
    color: palette.muted,
    background: 'transparent',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 11,
    fontWeight: 800,
  },
  languageButtonActive: {
    color: '#07150d',
    background: palette.accent,
  },
  steps: {
    display: 'grid',
    gap: 10,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  step: {
    display: 'grid',
    gridTemplateColumns: '34px minmax(0, 1fr)',
    gap: 11,
    padding: 13,
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    background: palette.card,
  },
  number: {
    display: 'grid',
    width: 30,
    height: 30,
    placeItems: 'center',
    border: '1px solid rgba(69, 248, 130, 0.45)',
    borderRadius: '50%',
    color: palette.accent,
    fontSize: 12,
    fontWeight: 850,
  },
  stepTitle: {
    display: 'block',
    marginBottom: 4,
    fontSize: 14,
  },
  paragraph: {
    margin: 0,
    color: palette.muted,
    fontSize: 12,
    lineHeight: 1.5,
  },
  note: {
    margin: '8px 0 0',
    paddingLeft: 9,
    borderLeft: `2px solid ${palette.target}`,
    color: '#d7e1e9',
    fontSize: 11,
    lineHeight: 1.5,
  },
  section: {
    display: 'grid',
    gap: 9,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 14,
  },
  legend: {
    display: 'grid',
    gap: 8,
  },
  legendItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(100px, auto) minmax(0, 1fr)',
    gap: 11,
    alignItems: 'start',
    padding: 10,
    border: `1px solid ${palette.border}`,
    borderRadius: 9,
    background: palette.background,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
    padding: '4px 8px',
    border: '1px solid currentColor',
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textAlign: 'center',
  },
  privacy: {
    padding: 13,
    border: '1px solid rgba(69, 248, 130, 0.35)',
    borderRadius: 10,
    background: 'rgba(69, 248, 130, 0.07)',
  },
};

const legendColors = {
  owned: palette.accent,
  breed: '#e3b74a',
  target: palette.target,
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function HelpDrawer({
  open,
  onOpenChange,
  locale,
  onLocaleChange,
  id,
  className,
  style,
}) {
  const generatedId = useId();
  const drawerId = id || `help-drawer-${generatedId.replaceAll(':', '')}`;
  const titleId = `${drawerId}-title`;
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalLocale, setInternalLocale] = useState(() => normalizeLocale(locale || DEFAULT_LOCALE));
  const triggerRef = useRef(null);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? open : internalOpen;
  const activeLocale = normalizeLocale(locale || internalLocale);
  const t = useMemo(() => createTranslator(activeLocale), [activeLocale]);
  const steps = t('help.steps');
  const legend = t('help.legend');

  const setOpen = (nextOpen) => {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const setLocale = (nextLocale) => {
    const normalized = normalizeLocale(nextLocale);
    if (locale == null) setInternalLocale(normalized);
    onLocaleChange?.(normalized);
  };

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = [...drawerRef.current.querySelectorAll(focusableSelector)].filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
      );
      if (!focusable.length) {
        event.preventDefault();
        drawerRef.current.focus();
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
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const drawer = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          style={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <aside
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            lang={activeLocale}
            tabIndex={-1}
            style={styles.drawer}
          >
            <header style={styles.header}>
              <div>
                <span style={styles.eyebrow}>{t('help.eyebrow')}</span>
                <h2 id={titleId} style={styles.title}>{t('help.title')}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label={t('help.close')}
                title={t('help.close')}
                style={styles.close}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div style={styles.body}>
              <p style={styles.intro}>{t('help.intro')}</p>

              <div role="group" aria-label={t('help.languageLabel')} style={styles.languageGroup}>
                {SUPPORTED_LOCALES.map((language) => (
                  <button
                    key={language}
                    type="button"
                    aria-pressed={activeLocale === language}
                    aria-label={language === 'es' ? t('help.spanish') : t('help.english')}
                    style={{
                      ...styles.languageButton,
                      ...(activeLocale === language ? styles.languageButtonActive : null),
                    }}
                    onClick={() => setLocale(language)}
                  >
                    {language.toUpperCase()}
                  </button>
                ))}
              </div>

              <ol style={styles.steps}>
                {steps.map((step) => (
                  <li key={step.number} style={styles.step}>
                    <span aria-hidden="true" style={styles.number}>{step.number}</span>
                    <div>
                      <strong style={styles.stepTitle}>{step.title}</strong>
                      <p style={styles.paragraph}>{step.body}</p>
                      {step.note && <p style={styles.note}>{step.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>

              <section aria-labelledby={`${drawerId}-legend`} style={styles.section}>
                <h3 id={`${drawerId}-legend`} style={styles.sectionTitle}>{t('help.legendTitle')}</h3>
                <div style={styles.legend}>
                  {legend.map((item) => (
                    <div key={item.key} style={styles.legendItem}>
                      <span style={{ ...styles.badge, color: legendColors[item.key] }}>
                        {item.label}
                      </span>
                      <p style={styles.paragraph}>{item.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section aria-labelledby={`${drawerId}-sex`} style={styles.section}>
                <h3 id={`${drawerId}-sex`} style={styles.sectionTitle}>{t('help.sexTitle')}</h3>
                <p style={styles.paragraph}>{t('help.sexBody')}</p>
              </section>

              <section aria-labelledby={`${drawerId}-privacy`} style={styles.privacy}>
                <h3 id={`${drawerId}-privacy`} style={{ ...styles.sectionTitle, marginBottom: 6 }}>
                  {t('help.privacyTitle')}
                </h3>
                <p style={styles.paragraph}>{t('help.privacyBody')}</p>
              </section>
            </div>
          </aside>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        style={{ ...styles.trigger, ...style }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={drawerId}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">?</span>
        {t('help.trigger')}
      </button>
      {drawer}
    </>
  );
}
