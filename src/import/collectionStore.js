const DB_NAME = 'pal-breeding-path';
const STORE_NAME = 'collections';
const ACTIVE_KEY = 'active';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está disponible.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir el almacenamiento local.'));
  });
}

async function transact(mode, operation) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falló el almacenamiento local.'));
    });
  } finally {
    database.close();
  }
}

export const loadCollection = () => transact('readonly', (store) => store.get(ACTIVE_KEY));
export const saveCollection = (collection) => transact('readwrite', (store) => store.put(collection, ACTIVE_KEY));
export const deleteCollection = () => transact('readwrite', (store) => store.delete(ACTIVE_KEY));

