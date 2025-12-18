
import { VaultMedia, VaultPlaylist } from '../types';

export type { VaultMedia, VaultPlaylist };

class VaultDb {
  private dbName = 'StagePOV_Vault';
  private version = 3; // Version bump for schema change
  private mediaStore = 'media';
  private playlistStore = 'playlists';

  private async getDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject('Failed to open database');
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create media store if it doesn't exist
        if (!db.objectStoreNames.contains(this.mediaStore)) {
          db.createObjectStore(this.mediaStore, { keyPath: 'id' });
        }
        
        // Handle migration from old 'songs' store if necessary
        if (db.objectStoreNames.contains('songs')) {
           db.deleteObjectStore('songs');
        }

        if (!db.objectStoreNames.contains(this.playlistStore)) {
          db.createObjectStore(this.playlistStore, { keyPath: 'id' });
        }
      };
    });
  }

  // --- MEDIA ---

  async saveMedia(media: VaultMedia): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.mediaStore, 'readwrite');
      const store = transaction.objectStore(this.mediaStore);
      const request = store.put(media);
      request.onerror = () => reject('Failed to save media');
      request.onsuccess = () => resolve();
    });
  }

  async getAllMedia(): Promise<VaultMedia[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.mediaStore, 'readonly');
      const store = transaction.objectStore(this.mediaStore);
      const request = store.getAll();
      request.onerror = () => reject('Failed to fetch media');
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteMedia(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.mediaStore, 'readwrite');
      const store = transaction.objectStore(this.mediaStore);
      const request = store.delete(id);
      request.onerror = () => reject('Failed to delete media');
      request.onsuccess = () => resolve();
    });
  }

  // --- PLAYLISTS ---

  async savePlaylist(playlist: VaultPlaylist): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.playlistStore, 'readwrite');
      const store = transaction.objectStore(this.playlistStore);
      const request = store.put(playlist);
      request.onerror = () => reject('Failed to save playlist');
      request.onsuccess = () => resolve();
    });
  }

  async getAllPlaylists(): Promise<VaultPlaylist[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.playlistStore, 'readonly');
      const store = transaction.objectStore(this.playlistStore);
      const request = store.getAll();
      request.onerror = () => reject('Failed to fetch playlists');
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deletePlaylist(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.playlistStore, 'readwrite');
      const store = transaction.objectStore(this.playlistStore);
      const request = store.delete(id);
      request.onerror = () => reject('Failed to delete playlist');
      request.onsuccess = () => resolve();
    });
  }
}

export const vaultDb = new VaultDb();
