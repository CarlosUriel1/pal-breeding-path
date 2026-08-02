export const DEFAULT_LOCALE = 'es';

export const SUPPORTED_LOCALES = Object.freeze(['es', 'en']);

export const messages = Object.freeze({
  es: {
    help: {
      trigger: 'Guía',
      dialogLabel: 'Guía de la ruta de crianza',
      close: 'Cerrar guía',
      languageLabel: 'Idioma de la guía',
      spanish: 'Español',
      english: 'English',
      eyebrow: 'GUÍA RÁPIDA',
      title: 'Cómo preparar una ruta',
      intro:
        'Carga tus Pals, define el resultado que buscas y sigue el árbol desde los Pals que ya tienes.',
      steps: [
        {
          number: '1',
          title: 'Importar guardado',
          body:
            'Elige tu carpeta SaveGames o un archivo Level.sav. La aplicación lee las especies, el sexo y las pasivas disponibles para formar tu colección de origen.',
          note:
            'La lectura es local y de solo lectura: el archivo no se sube ni se modifica. Si no quieres importar, “Seleccionar manualmente” calcula solo por especies.',
        },
        {
          number: '2',
          title: 'Objetivo',
          body:
            'Busca y selecciona el Pal que quieres obtener. El plan usará tu colección como punto de partida y ese Pal como destino final.',
        },
        {
          number: '3',
          title: 'Pasivas (máx. 4)',
          body:
            'Elige hasta cuatro pasivas deseadas para el resultado final. La búsqueda acepta sus nombres en español e inglés y solo muestra las que existen en tu colección.',
          note:
            '“Añadir traducciones JSON” permite cargar nombres propios o corregidos. La cobertura de la ruta no garantiza la herencia en un huevo concreto y esta versión no optimiza IV de HP, ATK o DEF.',
        },
        {
          number: '4',
          title: 'Leer la ruta',
          body:
            'En Ruta de crianza, sigue cada ecuación padre + madre → hijo. En Árbol de crianza, sigue las dependencias desde los Pals propios hasta el objetivo. La cifra cuenta cruces exitosos, no huevos esperados: respeta el sexo y conserva las pasivas marcadas.',
        },
        {
          number: '5',
          title: 'Guardar y reutilizar',
          body:
            'Cuando exista una solución, usa “Guardar ruta”. La pestaña Guardadas conserva el objetivo y las pasivas en este navegador; una ruta importada se vuelve a calcular con la misma colección original.',
        },
      ],
      legendTitle: 'Estados del árbol',
      legend: [
        {
          key: 'owned',
          label: 'PROPIO',
          englishLabel: 'OWNED',
          description:
            'Un Pal que ya está en tu colección. Usa la copia y el sexo indicados.',
        },
        {
          key: 'breed',
          label: 'CRIAR PRIMERO',
          englishLabel: 'BREED FIRST',
          description:
            'Un Pal intermedio que debes obtener antes de continuar con el siguiente cruce.',
        },
        {
          key: 'target',
          label: 'OBJETIVO',
          englishLabel: 'TARGET',
          description: 'El Pal final que elegiste, con las pasivas que debes conservar.',
        },
      ],
      sexTitle: 'Sexo y herencia',
      sexBody:
        'Los cruces normales necesitan progenitores de sexo opuesto. ♂ indica macho y ♀ indica hembra. Las pasivas mostradas son las que conviene conservar, pero su transmisión depende de cada tirada de crianza.',
      privacyTitle: 'Privacidad local',
      privacyBody:
        'Tus guardados se procesan en este navegador y no se envían a un servidor. La colección y las rutas pueden guardarse en el almacenamiento local del navegador; puedes borrarlas desde la aplicación o limpiando los datos del sitio.',
    },
  },
  en: {
    help: {
      trigger: 'Guide',
      dialogLabel: 'Breeding path guide',
      close: 'Close guide',
      languageLabel: 'Guide language',
      spanish: 'Español',
      english: 'English',
      eyebrow: 'QUICK GUIDE',
      title: 'How to prepare a path',
      intro:
        'Load your Pals, define the result you want, and follow the tree from the Pals you already own.',
      steps: [
        {
          number: '1',
          title: 'Import save',
          body:
            'Choose your SaveGames folder or a Level.sav file. The app reads the available species, sex, and passives to build your source collection.',
          note:
            'Reading is local and read-only: the file is neither uploaded nor modified. If you do not want to import, “Select manually” plans by species only.',
        },
        {
          number: '2',
          title: 'Target',
          body:
            'Search for and select the Pal you want to obtain. The plan uses your collection as its starting point and that Pal as the final destination.',
        },
        {
          number: '3',
          title: 'Passives (max. 4)',
          body:
            'Choose up to four desired passives for the final result. Search accepts English and Spanish names and only lists passives present in your collection.',
          note:
            '“Add JSON translations” loads custom or corrected names. Route coverage does not guarantee inheritance in a particular egg, and this version does not optimize HP, ATK, or DEF IVs.',
        },
        {
          number: '4',
          title: 'Read the route',
          body:
            'In Breeding Path, follow each parent + parent → child equation. In Breeding Tree, follow dependencies from owned Pals to the target. The count means successful steps, not expected eggs: respect sex and preserve the marked passives.',
        },
        {
          number: '5',
          title: 'Save and reuse',
          body:
            'When a solution exists, use “Save path”. The Saved paths tab keeps the target and passives in this browser; an imported path is recalculated with the same original collection.',
        },
      ],
      legendTitle: 'Tree states',
      legend: [
        {
          key: 'owned',
          label: 'OWNED',
          spanishLabel: 'PROPIO',
          description:
            'A Pal already in your collection. Use the indicated copy and sex.',
        },
        {
          key: 'breed',
          label: 'BREED FIRST',
          spanishLabel: 'CRIAR PRIMERO',
          description:
            'An intermediate Pal you must obtain before continuing to the next breeding step.',
        },
        {
          key: 'target',
          label: 'TARGET',
          spanishLabel: 'OBJETIVO',
          description: 'The final Pal you selected, with the passives you need to preserve.',
        },
      ],
      sexTitle: 'Sex and inheritance',
      sexBody:
        'Normal breeding steps need parents of opposite sexes. ♂ means male and ♀ means female. The displayed passives are the ones to preserve, but their transfer depends on each breeding roll.',
      privacyTitle: 'Local privacy',
      privacyBody:
        'Your saves are processed in this browser and are not sent to a server. The collection and paths may be stored in browser-local storage; you can remove them in the app or by clearing this site’s data.',
    },
  },
});

export const dictionary = messages;

export function normalizeLocale(locale) {
  const candidate = String(locale || DEFAULT_LOCALE).toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(candidate) ? candidate : DEFAULT_LOCALE;
}

export function translate(locale, key, values = {}) {
  const normalized = normalizeLocale(locale);
  const read = (source) =>
    String(key)
      .split('.')
      .reduce((value, segment) => (value == null ? undefined : value[segment]), source);
  const message = read(messages[normalized]) ?? read(messages[DEFAULT_LOCALE]) ?? key;

  if (typeof message !== 'string') return message;

  return message.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  );
}

export function createTranslator(locale) {
  const normalized = normalizeLocale(locale);
  return (key, values) => translate(normalized, key, values);
}
