import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { advancedNotificationService } from '../../services/AdvancedNotificationService';
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CogIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const EnhancedNotifications = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadSettings();
      const unsubscribe = advancedNotificationService.subscribeToNotifications(
        user.uid,
        handleNewNotifications
      );
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const userNotifications = await advancedNotificationService.getUserNotifications(user.uid);
      setNotifications(userNotifications);
      updateUnreadCount(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const userSettings = await advancedNotificationService.getUserNotificationSettings(user.uid);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleNewNotifications = (newNotifications) => {
    setNotifications(prevNotifications => {
      const merged = [...newNotifications, ...prevNotifications];
      const unique = merged.filter((notification, index, self) =>
        index === self.findIndex(n => n.id === notification.id)
      );
      updateUnreadCount(unique);
      return unique;
    });
  };

  const updateUnreadCount = (notificationsList) => {
    const count = notificationsList.filter(n => !n.read).length;
    setUnreadCount(count);
    // Update favicon badge if supported
    if (navigator.setAppBadge) {
      navigator.setAppBadge(count);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await advancedNotificationService.markNotificationRead(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      updateUnreadCount(notifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await advancedNotificationService.deleteNotification(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      updateUnreadCount(notifications);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    try {
      await advancedNotificationService.updateUserNotificationSettings(user.uid, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <ExclamationCircleIcon className="h-6 w-6 text-yellow-500" />;
      case 'info':
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const renderNotificationItem = (notification) => (
    <motion.div
      key={notification.id}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`p-4 ${
        notification.read
          ? isDark ? 'bg-gray-800' : 'bg-white'
          : isDark ? 'bg-gray-700' : 'bg-blue-50'
      } border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {notification.content}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {format(new Date(notification.createdAt), 'MMM d, yyyy HH:mm')}
            </p>
            <div className="flex items-center space-x-2">
              {!notification.read && (
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleDeleteNotification(notification.id)}
                className="text-red-500 hover:text-red-600"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderSettings = () => (
    <div className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
      <h3 className={`text-lg font-medium mb-4 ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        Notification Settings
      </h3>
      
      <div className="space-y-4">
        {/* Channel Settings */}
        <div>
          <h4 className={`text-sm font-medium mb-2 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Notification Channels
          </h4>
          <div className="space-y-2">
            {Object.entries({
              email: 'Email Notifications',
              push: 'Push Notifications',
              sms: 'SMS Notifications'
            }).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center"
              >
                <input
                  type="checkbox"
                  checked={settings?.[`${key}Enabled`]}
                  onChange={(e) => handleUpdateSettings({
                    ...settings,
                    [`${key}Enabled`]: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-500
                    focus:ring-blue-500"
                />
                <span className={`ml-2 text-sm ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h4 className={`text-sm font-medium mb-2 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Notification Types
          </h4>
          <div className="space-y-2">
            {Object.entries({
              system: 'System Notifications',
              activity: 'Activity Updates',
              marketing: 'Marketing Communications'
            }).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center"
              >
                <input
                  type="checkbox"
                  checked={settings?.notificationTypes?.[key]}
                  onChange={(e) => handleUpdateSettings({
                    ...settings,
                    notificationTypes: {
                      ...settings.notificationTypes,
                      [key]: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-500
                    focus:ring-blue-500"
                />
                <span className={`ml-2 text-sm ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <h4 className={`text-sm font-medium mb-2 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Quiet Hours
          </h4>
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={settings?.quietHours?.enabled}
              onChange={(e) => handleUpdateSettings({
                ...settings,
                quietHours: {
                  ...settings.quietHours,
                  enabled: e.target.checked
                }
              })}
              className="rounded border-gray-300 text-blue-500
                focus:ring-blue-500"
            />
            <span className={`ml-2 text-sm ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Enable Quiet Hours
            </span>
          </label>
          {settings?.quietHours?.enabled && (
            <div className="flex items-center space-x-4">
              <div>
                <label className={`text-xs ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => handleUpdateSettings({
                    ...settings,
                    quietHours: {
                      ...settings.quietHours,
                      start: e.target.value
                    }
                  })}
                  className={`mt-1 block w-full rounded-md ${
                    isDark
                      ? 'bg-gray-700 text-white'
                      : 'bg-white text-gray-900'
                  } border-gray-300 focus:border-blue-500
                    focus:ring-blue-500 sm:text-sm`}
                />
              </div>
              <div>
                <label className={`text-xs ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  End Time
                </label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => handleUpdateSettings({
                    ...settings,
                    quietHours: {
                      ...settings.quietHours,
                      end: e.target.value
                    }
                  })}
                  className={`mt-1 block w-full rounded-md ${
                    isDark
                      ? 'bg-gray-700 text-white'
                      : 'bg-white text-gray-900'
                  } border-gray-300 focus:border-blue-500
                    focus:ring-blue-500 sm:text-sm`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <BellIcon className={`h-6 w-6 ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2
            bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute right-0 mt-2 w-96 rounded-lg shadow-lg overflow-hidden
              ${isDark ? 'bg-gray-800' : 'bg-white'} ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex items-center justify-between p-4 border-b
              border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Notifications
              </h3>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full hover:bg-gray-100
                  dark:hover:bg-gray-700 focus:outline-none`}
              >
                <CogIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <AnimatePresence>
              {showSettings ? renderSettings() : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(renderNotificationItem)
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedNotifications;
