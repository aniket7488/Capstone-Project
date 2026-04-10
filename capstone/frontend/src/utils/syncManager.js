/**
 * syncManager.js – Automatic offline→online data synchronisation.
 *
 * How it works:
 *  1. registerSyncListener() is called once in index.js.
 *  2. It attaches a listener to the browser's 'online' event.
 *  3. When connectivity is restored, syncPendingResults() fires.
 *  4. It reads unsynced records from IndexedDB, POSTs them to the backend,
 *     then marks them as synced so they are not re-uploaded.
 *
 * The sync is idempotent – the server uses upsert logic, so duplicate
 * syncs do not create duplicate records.
 */

import axios from 'axios';
import { getPendingResults, markResultSynced } from './offlineStorage';

let syncInProgress = false;

/**
 * Uploads all pending (unsynced) quiz results to the backend.
 * Called automatically when the 'online' event fires.
 */
export async function syncPendingResults() {
  // Prevent concurrent sync runs
  if (syncInProgress) return;
  if (!navigator.onLine) return;

  syncInProgress = true;
  console.log('[SyncManager] Starting offline result sync...');

  try {
    const pending = await getPendingResults();
    if (pending.length === 0) {
      console.log('[SyncManager] Nothing to sync.');
      return;
    }

    console.log(`[SyncManager] Uploading ${pending.length} pending result(s)...`);

    const payload = pending.map((r) => ({
      lessonId:    r.lessonId,
      score:       r.score,
      maxScore:    r.maxScore,
      submittedAt: r.submittedAt,
    }));

    const { data } = await axios.post('/api/sync/results', { results: payload });
    console.log(`[SyncManager] Sync complete: ${data.synced} synced, ${data.failed} failed.`);

    // Mark every successfully uploaded record as synced in IndexedDB
    for (const record of pending) {
      await markResultSynced(record.localId);
    }

  } catch (error) {
    console.warn('[SyncManager] Sync failed – will retry on next online event:', error.message);
  } finally {
    syncInProgress = false;
  }
}

/**
 * Registers the 'online' event listener.
 * Call this ONCE at application startup (in index.js).
 */
export function registerSyncListener() {
  window.addEventListener('online', () => {
    console.log('[SyncManager] Network restored. Triggering sync...');
    syncPendingResults();
  });
  console.log('[SyncManager] Sync listener registered.');
}
