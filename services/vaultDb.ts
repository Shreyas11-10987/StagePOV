
export interface VaultSong {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  type: string;
  dateAdded: number;
}

class VaultDb {
  private dbName = 'StagePOV_Vault';
  private version = 1;
  private storeName = 'songs';

  private async getDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => reject('Failed to open database');
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async saveSong(song: VaultSong): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(song);
      request.onerror = () => reject('Failed to save song');
      request.onsuccess = () => resolve();
    });
  }

  async getAllSongs(): Promise<VaultSong[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onerror = () => reject('Failed to fetch songs');
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteSong(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      request.onerror = () => reject('Failed to delete song');
      request.onsuccess = () => resolve();
    });
  }
}

export const vaultDb = new VaultDb();
