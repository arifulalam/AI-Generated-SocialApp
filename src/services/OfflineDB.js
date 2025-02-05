import { openDB } from 'idb';

const DB_NAME = 'OfflineStore';
const DB_VERSION = 1;

const STORES = {
  MESSAGES: 'messages',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  USERS: 'users',
  OUTBOX: 'outbox',
  ORDER_OUTBOX: 'orderOutbox',
  SYNC_STATE: 'syncState'
};

class OfflineDB {
  constructor() {
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Messages store
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messageStore = db.createObjectStore(STORES.MESSAGES, {
            keyPath: 'id',
            autoIncrement: true
          });
          messageStore.createIndex('timestamp', 'timestamp');
          messageStore.createIndex('chatId', 'chatId');
          messageStore.createIndex('senderId', 'senderId');
        }

        // Orders store
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const orderStore = db.createObjectStore(STORES.ORDERS, {
            keyPath: 'id',
            autoIncrement: true
          });
          orderStore.createIndex('userId', 'userId');
          orderStore.createIndex('status', 'status');
          orderStore.createIndex('createdAt', 'createdAt');
        }

        // Products store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, {
            keyPath: 'id'
          });
          productStore.createIndex('category', 'category');
          productStore.createIndex('price', 'price');
        }

        // Users store
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const userStore = db.createObjectStore(STORES.USERS, {
            keyPath: 'id'
          });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('username', 'username', { unique: true });
        }

        // Outbox store for pending operations
        if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
          db.createObjectStore(STORES.OUTBOX, {
            keyPath: 'id',
            autoIncrement: true
          });
        }

        // Order outbox store
        if (!db.objectStoreNames.contains(STORES.ORDER_OUTBOX)) {
          db.createObjectStore(STORES.ORDER_OUTBOX, {
            keyPath: 'id',
            autoIncrement: true
          });
        }

        // Sync state store
        if (!db.objectStoreNames.contains(STORES.SYNC_STATE)) {
          db.createObjectStore(STORES.SYNC_STATE, {
            keyPath: 'id'
          });
        }
      }
    });
  }

  // Generic CRUD operations
  async add(storeName, item) {
    const db = await this.dbPromise;
    return db.add(storeName, item);
  }

  async get(storeName, key) {
    const db = await this.dbPromise;
    return db.get(storeName, key);
  }

  async getAll(storeName, query = null, count = undefined) {
    const db = await this.dbPromise;
    return db.getAll(storeName, query, count);
  }

  async put(storeName, item) {
    const db = await this.dbPromise;
    return db.put(storeName, item);
  }

  async delete(storeName, key) {
    const db = await this.dbPromise;
    return db.delete(storeName, key);
  }

  async clear(storeName) {
    const db = await this.dbPromise;
    return db.clear(storeName);
  }

  // Message-specific operations
  async addMessage(message) {
    const timestamp = new Date().toISOString();
    const messageWithTimestamp = { ...message, timestamp };
    
    // Add to local store
    await this.add(STORES.MESSAGES, messageWithTimestamp);
    
    // Add to outbox for sync
    if (navigator.onLine) {
      await this.syncMessages();
    } else {
      await this.add(STORES.OUTBOX, {
        type: 'message',
        data: messageWithTimestamp,
        createdAt: timestamp
      });
    }
  }

  async getMessages(chatId, limit = 50) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORES.MESSAGES, 'readonly');
    const store = tx.objectStore(STORES.MESSAGES);
    const index = store.index('chatId');
    
    return index.getAll(chatId, limit);
  }

  // Order-specific operations
  async addOrder(order) {
    const timestamp = new Date().toISOString();
    const orderWithTimestamp = { ...order, createdAt: timestamp };
    
    // Add to local store
    await this.add(STORES.ORDERS, orderWithTimestamp);
    
    // Add to outbox for sync
    if (navigator.onLine) {
      await this.syncOrders();
    } else {
      await this.add(STORES.ORDER_OUTBOX, {
        type: 'order',
        data: orderWithTimestamp,
        createdAt: timestamp
      });
    }
  }

  async getOrders(userId) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORES.ORDERS, 'readonly');
    const store = tx.objectStore(STORES.ORDERS);
    const index = store.index('userId');
    
    return index.getAll(userId);
  }

  // Product-specific operations
  async addProducts(products) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORES.PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORES.PRODUCTS);
    
    await Promise.all(products.map(product => store.put(product)));
    return tx.complete;
  }

  async getProductsByCategory(category) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORES.PRODUCTS, 'readonly');
    const store = tx.objectStore(STORES.PRODUCTS);
    const index = store.index('category');
    
    return index.getAll(category);
  }

  // Sync operations
  async syncMessages() {
    const db = await this.dbPromise;
    const outboxItems = await db.getAll(STORES.OUTBOX);
    
    for (const item of outboxItems) {
      if (item.type === 'message') {
        try {
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
          
          if (response.ok) {
            await this.delete(STORES.OUTBOX, item.id);
          }
        } catch (error) {
          console.error('Failed to sync message:', error);
        }
      }
    }
  }

  async syncOrders() {
    const db = await this.dbPromise;
    const outboxItems = await db.getAll(STORES.ORDER_OUTBOX);
    
    for (const item of outboxItems) {
      if (item.type === 'order') {
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
          
          if (response.ok) {
            await this.delete(STORES.ORDER_OUTBOX, item.id);
          }
        } catch (error) {
          console.error('Failed to sync order:', error);
        }
      }
    }
  }

  // Sync state management
  async updateSyncState(collection, lastSynced) {
    await this.put(STORES.SYNC_STATE, {
      id: collection,
      lastSynced: lastSynced || new Date().toISOString()
    });
  }

  async getLastSyncTime(collection) {
    const syncState = await this.get(STORES.SYNC_STATE, collection);
    return syncState ? syncState.lastSynced : null;
  }

  // Cache management
  async clearCache() {
    const stores = [
      STORES.MESSAGES,
      STORES.ORDERS,
      STORES.PRODUCTS,
      STORES.USERS
    ];
    
    for (const store of stores) {
      await this.clear(store);
    }
  }

  // Storage quota management
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const percentageUsed = (estimate.usage / estimate.quota) * 100;
      
      if (percentageUsed > 90) {
        // Clean up old data
        await this.cleanupOldData();
      }
    }
  }

  async cleanupOldData() {
    const db = await this.dbPromise;
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Clean up old messages
    const tx = db.transaction(STORES.MESSAGES, 'readwrite');
    const store = tx.objectStore(STORES.MESSAGES);
    const index = store.index('timestamp');
    const oldMessages = await index.getAllKeys(IDBKeyRange.upperBound(monthAgo.toISOString()));
    
    await Promise.all(oldMessages.map(key => store.delete(key)));
  }
}

export const offlineDB = new OfflineDB();
