/**
 * offlineStorage.js – IndexedDB wrapper for offline-first functionality.
 *
 * Three object stores:
 *  - pendingResults : quiz results waiting to be synced (synced: false)
 *  - courses        : course/lesson cache for offline reading
 *  - faq            : FAQ entries for offline chatbot keyword matching
 *
 * All operations are async (Promise-based).
 * No external library used — raw IndexedDB API with thin Promise wrappers.
 */

const DB_NAME    = 'quizcap_offline';
const DB_VERSION = 1;

// ── Open / upgrade database ───────────────────────────────────────────────────

/**
 * Opens (or creates) the IndexedDB database.
 * Handles schema upgrades via onupgradeneeded.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store for pending (unsynced) quiz results
      if (!db.objectStoreNames.contains('pendingResults')) {
        const store = db.createObjectStore('pendingResults', {
          keyPath: 'localId',
          autoIncrement: true,
        });
        store.createIndex('synced', 'synced', { unique: false });
      }

      // Store for cached course/lesson data
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'id' });
      }

      // Store for FAQ data used by offline chatbot
      if (!db.objectStoreNames.contains('faq')) {
        db.createObjectStore('faq', { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Generic IDB helpers ───────────────────────────────────────────────────────

function idbPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req   = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGet(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req   = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGetAllByIndex(db, storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req   = index.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── pendingResults store ──────────────────────────────────────────────────────

/**
 * Saves an unsynced quiz result to IndexedDB.
 *
 * @param {object} result - { lessonId, score, maxScore, submittedAt }
 */
export async function addPendingResult(result) {
  const db = await openDB();
  return idbPut(db, 'pendingResults', { ...result, synced: false });
}

/**
 * Returns all pending (unsynced) results.
 * @returns {Promise<Array>}
 */
export async function getPendingResults() {
  const db = await openDB();
  return idbGetAllByIndex(db, 'pendingResults', 'synced', false);
}

/**
 * Marks a pending result as synced so it is not re-uploaded.
 * @param {number} localId - the autoIncrement key of the record
 */
export async function markResultSynced(localId) {
  const db = await openDB();
  const record = await idbGet(db, 'pendingResults', localId);
  if (record) {
    record.synced = true;
    return idbPut(db, 'pendingResults', record);
  }
}

// ── courses store ─────────────────────────────────────────────────────────────

/**
 * Caches an array of courses in IndexedDB for offline access.
 * @param {Array} courses
 */
export async function cacheCourses(courses) {
  const db = await openDB();
  for (const course of courses) {
    await idbPut(db, 'courses', course);
  }
}

/**
 * Returns all cached courses from IndexedDB.
 * @returns {Promise<Array>}
 */
export async function getCachedCourses() {
  const db = await openDB();
  return idbGetAll(db, 'courses');
}

// ── faq store ─────────────────────────────────────────────────────────────────

/**
 * Caches the FAQ list for the offline chatbot.
 * @param {Array} faqList
 */
export async function cacheFaq(faqList) {
  const db = await openDB();
  for (const entry of faqList) {
    await idbPut(db, 'faq', entry);
  }
}

/**
 * Returns all cached FAQ entries.
 * @returns {Promise<Array>}
 */
export async function getCachedFaq() {
  const db = await openDB();
  return idbGetAll(db, 'faq');
}
