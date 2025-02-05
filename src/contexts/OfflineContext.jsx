import React, { createContext, useContext, useState, useEffect } from 'react';
import { offlineDB } from '../services/OfflineDB';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);

  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending actions on mount
    checkPendingActions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncData();
    }
  }, [isOnline]);

  const handleOnline = () => {
    setIsOnline(true);
    showNotification('You are back online!');
  };

  const handleOffline = () => {
    setIsOnline(false);
    showNotification('You are offline. Changes will be saved locally.');
  };

  const showNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Firebase Chat', { body: message });
    }
  };

  const checkPendingActions = async () => {
    try {
      const outboxItems = await offlineDB.getAll('outbox');
      const orderOutboxItems = await offlineDB.getAll('orderOutbox');
      
      setPendingActions([...outboxItems, ...orderOutboxItems]);
    } catch (error) {
      console.error('Error checking pending actions:', error);
    }
  };

  const syncData = async () => {
    if (isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncProgress(0);

      // Sync messages
      await syncMessages();
      setSyncProgress(33);

      // Sync orders
      await syncOrders();
      setSyncProgress(66);

      // Sync products
      await syncProducts();
      setSyncProgress(100);

      setLastSyncTime(new Date().toISOString());
      await checkPendingActions();
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const syncMessages = async () => {
    const lastSync = await offlineDB.getLastSyncTime('messages');
    
    try {
      const response = await fetch(`/api/messages/sync?since=${lastSync}`);
      if (response.ok) {
        const messages = await response.json();
        await offlineDB.addProducts(messages);
        await offlineDB.updateSyncState('messages');
      }
    } catch (error) {
      console.error('Error syncing messages:', error);
    }
  };

  const syncOrders = async () => {
    const lastSync = await offlineDB.getLastSyncTime('orders');
    
    try {
      const response = await fetch(`/api/orders/sync?since=${lastSync}`);
      if (response.ok) {
        const orders = await response.json();
        await offlineDB.addProducts(orders);
        await offlineDB.updateSyncState('orders');
      }
    } catch (error) {
      console.error('Error syncing orders:', error);
    }
  };

  const syncProducts = async () => {
    const lastSync = await offlineDB.getLastSyncTime('products');
    
    try {
      const response = await fetch(`/api/products/sync?since=${lastSync}`);
      if (response.ok) {
        const products = await response.json();
        await offlineDB.addProducts(products);
        await offlineDB.updateSyncState('products');
      }
    } catch (error) {
      console.error('Error syncing products:', error);
    }
  };

  const addOfflineAction = async (action) => {
    try {
      if (action.type === 'order') {
        await offlineDB.add('orderOutbox', action);
      } else {
        await offlineDB.add('outbox', action);
      }
      await checkPendingActions();
    } catch (error) {
      console.error('Error adding offline action:', error);
    }
  };

  const clearOfflineData = async () => {
    try {
      await offlineDB.clearCache();
      await checkPendingActions();
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  const value = {
    isOnline,
    isSyncing,
    syncProgress,
    lastSyncTime,
    pendingActions,
    syncData,
    addOfflineAction,
    clearOfflineData
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
      
      {/* Offline Status Bar */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-white py-2 px-4 text-center">
          You are currently offline. Changes will be saved locally and synced when you're back online.
        </div>
      )}
      
      {/* Sync Progress Bar */}
      {isSyncing && syncProgress > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${syncProgress}%` }}
          />
        </div>
      )}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export default OfflineContext;
