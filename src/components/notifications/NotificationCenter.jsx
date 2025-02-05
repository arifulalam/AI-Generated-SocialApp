import { useState, useEffect } from 'react';
import { NotificationService } from '../../services/NotificationService';
import {
  BellIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  StarIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const NotificationCenter = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async (loadMore = false) => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      const result = await NotificationService.getNotifications(
        user.uid,
        loadMore ? lastVisible : null
      );

      setNotifications(prev =>
        loadMore ? [...prev, ...result.notifications] : result.notifications
      );
      setLastVisible(result.lastVisible);
      setHasMore(result.notifications.length === 20);

      // Update unread count
      if (!loadMore) {
        const unread = result.notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsRead(notificationId);
      setNotifications(notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead(user.uid);
      setNotifications(notifications.map(notification => ({
        ...notification,
        isRead: true
      })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await NotificationService.clearAllNotifications(user.uid);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_status':
        return ShoppingBagIcon;
      case 'payment':
      case 'refund':
        return CurrencyDollarIcon;
      case 'new_review':
        return StarIcon;
      case 'low_stock':
        return ExclamationTriangleIcon;
      case 'promotional':
        return MegaphoneIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'order_status':
        return 'text-blue-500 bg-blue-100';
      case 'payment':
        return 'text-green-500 bg-green-100';
      case 'refund':
        return 'text-red-500 bg-red-100';
      case 'new_review':
        return 'text-yellow-500 bg-yellow-100';
      case 'low_stock':
        return 'text-orange-500 bg-orange-100';
      case 'promotional':
        return 'text-purple-500 bg-purple-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none"
      >
        <BellIcon className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{notification.title}</h4>
                            <p className="text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.createdAt.toDate()).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1 rounded hover:bg-gray-100"
                                title="Mark as read"
                              >
                                <CheckIcon className="h-4 w-4 text-blue-500" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-1 rounded hover:bg-gray-100"
                              title="Delete"
                            >
                              <XMarkIcon className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {hasMore && (
            <div className="p-4 border-t">
              <button
                onClick={() => loadNotifications(true)}
                disabled={isLoading}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-800"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
