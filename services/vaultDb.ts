
export interface VaultSong {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  type: string;
  dateAdded: number;
}

export interface VaultPlaylist {
  id: string;
  name: string;
  songIds: string[];
  dateCreated: number;
}

class VaultDb {
  private dbName = 'StagePOV_Vault';
  private version = 2; // Upgraded version
  private songStore = 'songs';
  private playlistStore = 'playlists';

  private async getDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject('Failed to open database');
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.songStore)) {
          db.createObjectStore(this.songStore, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(this.playlistStore)) {
          db.createObjectStore(this.playlistStore, { keyPath: 'id' });
        }
      };
    });
  }

  // --- SONGS ---

  async saveSong(song: VaultSong): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.songStore, 'readwrite');
      const store = transaction.objectStore(this.songStore);
      const request = store.put(song);
      request.onerror = () => reject('Failed to save song');
      request.onsuccess = () => resolve();
    });
  }

  async getAllSongs(): Promise<VaultSong[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.songStore, 'readonly');
      const store = transaction.objectStore(this.songStore);
      const request = store.getAll();
      request.onerror = () => reject('Failed to fetch songs');
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteSong(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.songStore, 'readwrite');
      const store = transaction.objectStore(this.songStore);
      const request = store.delete(id);
      request.onerror = () => reject('Failed to delete song');
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
