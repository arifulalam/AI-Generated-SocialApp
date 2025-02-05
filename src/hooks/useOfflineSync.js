import { useState, useEffect, useCallback } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { offlineDB } from '../services/OfflineDB';

export const useOfflineSync = (options = {}) => {
  const {
    collection,
    syncInterval = 5000,
    retryAttempts = 3,
    retryDelay = 1000,
    onSyncSuccess,
    onSyncError,
    onDataChange
  } = options;

  const { isOnline, addOfflineAction } = useOffline();
  const [localData, setLocalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Load local data
  useEffect(() => {
    loadLocalData();
  }, [collection]);

  // Auto sync when online
  useEffect(() => {
    let syncTimer;
    
    if (isOnline && collection) {
      syncTimer = setInterval(syncData, syncInterval);
    }

    return () => {
      if (syncTimer) clearInterval(syncTimer);
    };
  }, [isOnline, collection, syncInterval]);

  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      const data = await offlineDB.getAll(collection);
      setLocalData(data);
      if (onDataChange) onDataChange(data);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncData = async (attempt = 1) => {
    if (!isOnline || syncStatus === 'syncing') return;

    try {
      setSyncStatus('syncing');
      const lastSync = await offlineDB.getLastSyncTime(collection);
      
      const response = await fetch(`/api/${collection}/sync?since=${lastSync}`);
      if (!response.ok) throw new Error('Sync failed');

      const serverData = await response.json();
      
      // Merge with local data
      await mergeData(serverData);
      
      setSyncStatus('success');
      if (onSyncSuccess) onSyncSuccess();
    } catch (error) {
      setSyncStatus('error');
      setError(error);
      
      // Retry logic
      if (attempt < retryAttempts) {
        setTimeout(() => syncData(attempt + 1), retryDelay * attempt);
      } else if (onSyncError) {
        onSyncError(error);
      }
    }
  };

  const mergeData = async (serverData) => {
    try {
      // Get local changes that haven't been synced
      const outboxItems = await offlineDB.getAll('outbox');
      const localChanges = outboxItems.filter(item => item.collection === collection);

      // Apply server changes
      await offlineDB.addProducts(serverData);

      // Reapply local changes
      for (const change of localChanges) {
        switch (change.type) {
          case 'add':
            await offlineDB.add(collection, change.data);
            break;
          case 'update':
            await offlineDB.put(collection, change.data);
            break;
          case 'delete':
            await offlineDB.delete(collection, change.data.id);
            break;
        }
      }

      // Update local state
      await loadLocalData();
      
      // Update sync timestamp
      await offlineDB.updateSyncState(collection);
    } catch (error) {
      console.error('Error merging data:', error);
      throw error;
    }
  };

  const addItem = async (item) => {
    try {
      // Add to local DB
      const id = await offlineDB.add(collection, item);
      
      // Add to sync queue if offline
      if (!isOnline) {
        await addOfflineAction({
          collection,
          type: 'add',
          data: { ...item, id },
          timestamp: new Date().toISOString()
        });
      }
      
      // Update local state
      await loadLocalData();
      
      return id;
    } catch (error) {
      setError(error);
      throw error;
    }
  };

  const updateItem = async (id, updates) => {
    try {
      // Get current item
      const currentItem = await offlineDB.get(collection, id);
      if (!currentItem) throw new Error('Item not found');

      // Update local DB
      const updatedItem = { ...currentItem, ...updates };
      await offlineDB.put(collection, updatedItem);
      
      // Add to sync queue if offline
      if (!isOnline) {
        await addOfflineAction({
          collection,
          type: 'update',
          data: updatedItem,
          timestamp: new Date().toISOString()
        });
      }
      
      // Update local state
      await loadLocalData();
    } catch (error) {
      setError(error);
      throw error;
    }
  };

  const deleteItem = async (id) => {
    try {
      // Delete from local DB
      await offlineDB.delete(collection, id);
      
      // Add to sync queue if offline
      if (!isOnline) {
        await addOfflineAction({
          collection,
          type: 'delete',
          data: { id },
          timestamp: new Date().toISOString()
        });
      }
      
      // Update local state
      await loadLocalData();
    } catch (error) {
      setError(error);
      throw error;
    }
  };

  const getItem = useCallback(async (id) => {
    try {
      return await offlineDB.get(collection, id);
    } catch (error) {
      setError(error);
      throw error;
    }
  }, [collection]);

  const query = useCallback(async (queryFn) => {
    try {
      const allItems = await offlineDB.getAll(collection);
      return allItems.filter(queryFn);
    } catch (error) {
      setError(error);
      throw error;
    }
  }, [collection]);

  return {
    data: localData,
    isLoading,
    error,
    syncStatus,
    addItem,
    updateItem,
    deleteItem,
    getItem,
    query,
    syncData,
    isOnline
  };
};

export default useOfflineSync;
